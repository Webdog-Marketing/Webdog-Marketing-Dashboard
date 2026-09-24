import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { cardProgress, fetchCard, trelloConfigured } from "@/lib/trello";

const LINK_FIELDS: { key: keyof NonNullable<Awaited<ReturnType<typeof getClient>>>; label: string }[] = [
  { key: "website", label: "Website" },
  { key: "googleDriveUrl", label: "Google Drive folder" },
  { key: "dataStudioUrl", label: "Data Studio link" },
  { key: "searchConsoleUrl", label: "Google Search Console" },
  { key: "googleAdsUrl", label: "Google Ads" },
  { key: "analyticsUrl", label: "Google Analytics" },
];

async function getClient(id: string) {
  return prisma.client.findUnique({
    where: { id },
    include: {
      timeEntries: { orderBy: { date: "desc" } },
    },
  });
}

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const client = await getClient(params.id);
  if (!client) notFound();

  const monthlyValue = client.monthlyHours * client.rate;

  let trelloProgress: { done: number; total: number } | null = null;
  let trelloUrl: string | null = null;
  if (client.trelloCardId && trelloConfigured()) {
    const card = await fetchCard(client.trelloCardId);
    if (card) {
      trelloProgress = cardProgress(card);
      trelloUrl = card.shortUrl;
    }
  }

  return (
    <>
      <Link href="/clients" className="delete-link" style={{ color: "var(--text-muted)" }}>
        &larr; Back to clients
      </Link>
      <div className="page-header" style={{ marginTop: 14 }}>
        <div>
          <h1 className="page-title">
            {client.name}{" "}
            <span className={client.billable ? "tag-billable" : "tag-probono"} style={{ marginLeft: 8, verticalAlign: "middle" }}>
              {client.billable ? client.status : "Pro-bono"}
            </span>
          </h1>
          <div className="page-sub">
            Started{" "}
            {client.startDate.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
            {client.endDate
              ? ` · ended ${client.endDate.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`
              : ""}
          </div>
        </div>
      </div>

      <div className="stat-row" style={{ marginBottom: 28 }}>
        <div>
          <div className="summary-label">Hours / month</div>
          <div className="summary-value numeral" style={{ fontSize: 22 }}>{client.monthlyHours}h</div>
        </div>
        <div>
          <div className="summary-label">Rate</div>
          <div className="summary-value numeral" style={{ fontSize: 22 }}>
            £{client.rate}/hr{!client.billable ? " (notional)" : ""}
          </div>
        </div>
        <div>
          <div className="summary-label">Est. monthly value</div>
          <div className="summary-value numeral" style={{ fontSize: 22 }}>£{monthlyValue.toFixed(0)}</div>
        </div>
      </div>

      {client.trelloCardId && (
        <div className="panel" style={{ marginBottom: 24 }}>
          <p className="panel-title">Trello card</p>
          {trelloProgress ? (
            <>
              <div className="progress-row" style={{ marginBottom: 0 }}>
                <span>Checklist</span>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${trelloProgress.total > 0 ? (trelloProgress.done / trelloProgress.total) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="numeral progress-count">
                  {trelloProgress.done}/{trelloProgress.total}
                </span>
              </div>
              {trelloUrl && (
                <div style={{ marginTop: 10 }}>
                  <a href={trelloUrl} target="_blank" rel="noreferrer">Open card ↗</a>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">Couldn&apos;t reach this card just now.</div>
          )}
        </div>
      )}

      <div className="panel" style={{ marginBottom: 24 }}>
        <p className="panel-title">Links</p>
        {LINK_FIELDS.map(({ key, label }) => {
          const url = client[key] as string | null;
          return (
            <div className="link-row" key={String(key)}>
              <span className="link-row-label">{label}</span>
              {url ? (
                <span className="link-row-value">
                  <a href={url} target="_blank" rel="noreferrer">Open ↗</a>
                </span>
              ) : (
                <span className="link-row-value empty">Not linked yet</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="panel">
        <p className="panel-title">Time logged</p>
        {client.timeEntries.length === 0 ? (
          <div className="empty-state">No time logged for this client yet.</div>
        ) : (
          <table>
            <thead>
              <tr><th>Date</th><th>Hours</th><th>Note</th><th>Value</th></tr>
            </thead>
            <tbody>
              {client.timeEntries.map((t) => (
                <tr key={t.id}>
                  <td>{t.date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                  <td className="numeral">{t.hours}h</td>
                  <td>{t.note ?? "—"}</td>
                  <td className="numeral">£{(t.hours * t.rate).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
