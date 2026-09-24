import { prisma } from "@/lib/prisma";
import IncomeByTypeChart from "@/components/IncomeByTypeChart";
import { cardProgress, configuredBoardIds, fetchBoardData, trelloConfigured } from "@/lib/trello";
import { getMonthlyAvailability, googleConfigured } from "@/lib/google";
import { daysUntil, nextRenewal } from "@/lib/techstack";

const TYPE_LABELS: Record<string, string> = {
  SEO_RETAINER: "SEO retainer",
  ONE_OFF_PROJECT: "One-off project",
  WEBSITE: "Website",
  ADS: "Ads",
  OTHER: "Other",
};

function monthBounds(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

function monthsBetween(a: Date, b: Date) {
  return Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()));
}

export default async function DashboardPage() {
  const { start, end } = monthBounds();

  const [clients, staff, monthIncome, monthExpenses, techTools] = await Promise.all([
    prisma.client.findMany(),
    prisma.staffMember.findMany(),
    prisma.incomeEntry.findMany({ where: { date: { gte: start, lt: end } } }),
    prisma.expense.findMany({ where: { date: { gte: start, lt: end } } }),
    prisma.techTool.findMany(),
  ]);

  const billableClients = clients.filter((c) => c.billable);
  const activeClients = billableClients.filter((c) => c.status === "ACTIVE");
  const endedClients = billableClients.filter((c) => c.status === "ENDED");
  const totalMonthlyHoursNeeded = activeClients.reduce((sum, c) => sum + c.monthlyHours, 0);

  const calendarConfigured = googleConfigured();
  const availability = calendarConfigured ? await getMonthlyAvailability() : { connected: false as const };

  const effectiveHoursFor = (s: (typeof staff)[number]) => {
    if (s.calendarLinked && availability.connected && !("error" in availability && availability.error)) {
      return (availability as { netAvailable: number }).netAvailable;
    }
    return s.availableHours;
  };

  const totalAvailableHours = staff.reduce((sum, s) => sum + effectiveHoursFor(s), 0);
  const capacityPct = totalAvailableHours > 0 ? Math.round((totalMonthlyHoursNeeded / totalAvailableHours) * 100) : 0;

  const incomeTotal = monthIncome.reduce((sum, i) => sum + i.amount, 0);
  const expenseTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const net = incomeTotal - expenseTotal;

  const byType = Object.entries(TYPE_LABELS).map(([key, name]) => ({
    name,
    amount: monthIncome.filter((i) => i.type === key).reduce((sum, i) => sum + i.amount, 0),
  }));

  // Client health
  const now = new Date();
  const avgActiveTenure =
    activeClients.length > 0
      ? activeClients.reduce((s, c) => s + monthsBetween(c.startDate, now), 0) / activeClients.length
      : 0;
  const avgChurnLifespan =
    endedClients.length > 0
      ? endedClients.reduce((s, c) => s + monthsBetween(c.startDate, c.endDate ?? now), 0) / endedClients.length
      : 0;
  const churnRate = billableClients.length > 0 ? (endedClients.length / billableClients.length) * 100 : 0;

  // Renewals in the next 30 days
  const renewalsSoon = techTools
    .filter((t) => t.billingCycle !== "ONE_OFF")
    .map((t) => ({ tool: t, renewal: nextRenewal(t), days: daysUntil(nextRenewal(t)) }))
    .filter((r) => r.days <= 30)
    .sort((a, b) => a.days - b.days);

  // Trello — checklist progress per card, grouped by list
  let trelloBoards: {
    boardName: string;
    lists: { name: string; cards: { name: string; shortUrl: string; done: number; total: number }[] }[];
  }[] = [];

  if (trelloConfigured()) {
    const boardIds = configuredBoardIds();
    const boards = await Promise.all(boardIds.map(fetchBoardData));
    trelloBoards = boards
      .filter((b): b is NonNullable<typeof b> => !!b)
      .map((b) => ({
        boardName: b.boardName,
        lists: b.lists
          .map((list) => ({
            name: list.name,
            cards: b.cards
              .filter((c) => c.idList === list.id)
              .map((c) => ({ name: c.name, shortUrl: c.shortUrl, ...cardProgress(c) })),
          }))
          .filter((l) => l.cards.length > 0),
      }));
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Overview</h1>
          <div className="page-sub">{start.toLocaleString("en-GB", { month: "long", year: "numeric" })}</div>
        </div>
      </div>

      <div className="summary-strip">
        <div className="summary-cell">
          <div className="summary-label">Active clients</div>
          <div className="summary-value numeral">{activeClients.length}</div>
          <div className="summary-note">{clients.length} total on file</div>
        </div>
        <div className="summary-cell">
          <div className="summary-label">Income this month</div>
          <div className="summary-value numeral">£{incomeTotal.toFixed(0)}</div>
          <div className="summary-note">Net £{net.toFixed(0)} after spend</div>
        </div>
        <div className="summary-cell">
          <div className="summary-label">Capacity used</div>
          <div className={`summary-value numeral ${capacityPct > 100 ? "warn" : ""}`}>{capacityPct}%</div>
          <div className="summary-note">
            {totalMonthlyHoursNeeded}h needed / {totalAvailableHours}h available
          </div>
        </div>
        <div className="summary-cell">
          <div className="summary-label">Spend this month</div>
          <div className="summary-value numeral">£{expenseTotal.toFixed(0)}</div>
          <div className="summary-note">{monthExpenses.length} entries</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <p className="panel-title">Income by type — this month</p>
          <IncomeByTypeChart data={byType} />
        </div>
        <div className="panel">
          <p className="panel-title">Team capacity</p>
          {staff.length === 0 ? (
            <div className="empty-state">Add staff on the Clients page.</div>
          ) : (
            staff.map((s) => {
              const hours = effectiveHoursFor(s);
              const fromCalendar = s.calendarLinked && availability.connected;
              const pct = hours > 0 ? Math.min(100, Math.round((totalMonthlyHoursNeeded / staff.length / hours) * 100)) : 0;
              return (
                <div key={s.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                    <span>{s.name}</span>
                    <span>{hours}h available{fromCalendar ? " · from calendar" : ""}</span>
                  </div>
                  <div className="capacity-bar-track">
                    <div
                      className={`capacity-bar-fill ${totalMonthlyHoursNeeded > totalAvailableHours ? "over" : ""}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 28 }}>
        <p className="panel-title">Calendar — this month</p>
        {!calendarConfigured ? (
          <div className="empty-state">
            Google Calendar isn&apos;t connected. Add <code>GOOGLE_CLIENT_ID</code> and{" "}
            <code>GOOGLE_CLIENT_SECRET</code>, then connect it from Clients &amp; capacity.
          </div>
        ) : !availability.connected ? (
          <div className="empty-state">Not connected yet — head to Clients &amp; capacity to connect your calendar.</div>
        ) : "error" in availability && availability.error ? (
          <div className="empty-state">Couldn&apos;t reach Google Calendar just now — try again shortly.</div>
        ) : (
          <div className="stat-row">
            <div>
              <div className="summary-label">Working hours (Mon–Fri)</div>
              <div className="summary-value numeral" style={{ fontSize: 22 }}>
                {(availability as { workingHours: number }).workingHours}h
              </div>
            </div>
            <div>
              <div className="summary-label">Booked in meetings</div>
              <div className="summary-value numeral" style={{ fontSize: 22 }}>
                {(availability as { busyHours: number }).busyHours}h
              </div>
            </div>
            <div>
              <div className="summary-label">Net available</div>
              <div className="summary-value numeral" style={{ fontSize: 22 }}>
                {(availability as { netAvailable: number }).netAvailable}h
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="panel" style={{ marginBottom: 28 }}>
        <p className="panel-title">Renewals — next 30 days</p>
        {renewalsSoon.length === 0 ? (
          <div className="empty-state">Nothing renewing in the next 30 days.</div>
        ) : (
          <table>
            <tbody>
              {renewalsSoon.map((r) => (
                <tr key={r.tool.id}>
                  <td>{r.tool.name}</td>
                  <td style={{ color: "var(--text-muted)" }}>{r.tool.category}</td>
                  <td className="numeral" style={{ textAlign: "right" }}>£{r.tool.cost.toFixed(2)}</td>
                  <td style={{ textAlign: "right" }}>
                    <span className="tag-soon">
                      {r.renewal.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {r.days} days
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel" style={{ marginBottom: 28 }}>
        <p className="panel-title">Client health</p>
        <div className="stat-row">
          <div>
            <div className="summary-label">Churn rate</div>
            <div className="summary-value numeral" style={{ fontSize: 22 }}>{churnRate.toFixed(0)}%</div>
          </div>
          <div>
            <div className="summary-label">Avg. active tenure</div>
            <div className="summary-value numeral" style={{ fontSize: 22 }}>{avgActiveTenure.toFixed(1)} months</div>
          </div>
          <div>
            <div className="summary-label">Avg. lifespan at churn</div>
            <div className="summary-value numeral" style={{ fontSize: 22 }}>{avgChurnLifespan.toFixed(1)} months</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <p className="panel-title">Trello — task progress</p>
        {!trelloConfigured() ? (
          <div className="empty-state">
            Trello isn&apos;t connected yet. Add TRELLO_API_KEY, TRELLO_TOKEN and TRELLO_BOARD_IDS, then redeploy.
          </div>
        ) : trelloBoards.length === 0 ? (
          <div className="empty-state">No boards configured.</div>
        ) : (
          trelloBoards.map((b) =>
            b.lists.map((list) => (
              <div key={b.boardName + list.name} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
                  {list.name} ({list.cards.length} cards)
                </div>
                {list.cards.map((c) => (
                  <div className="progress-row" key={c.shortUrl}>
                    <span
                      style={{ flex: "0 0 200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      <a href={c.shortUrl} target="_blank" rel="noreferrer">{c.name}</a>
                    </span>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${c.total > 0 ? (c.done / c.total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="numeral progress-count">{c.total > 0 ? `${c.done}/${c.total}` : "—"}</span>
                  </div>
                ))}
              </div>
            ))
          )
        )}
      </div>
    </>
  );
}
