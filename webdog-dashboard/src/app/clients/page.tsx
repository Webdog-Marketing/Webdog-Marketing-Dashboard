"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Client = {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "ENDED";
  billable: boolean;
  monthlyHours: number;
  rate: number;
  startDate: string;
  endDate: string | null;
};

type Staff = {
  id: string;
  name: string;
  availableHours: number;
  hourlyCost: number | null;
  calendarLinked: boolean;
};

type CalendarStatus = {
  configured: boolean;
  connected: boolean;
  error?: boolean;
  workingHours?: number;
  busyHours?: number;
  netAvailable?: number;
};

function monthsBetween(a: Date, b: Date) {
  return Math.max(
    0,
    (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
  );
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [calendar, setCalendar] = useState<CalendarStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const [newClient, setNewClient] = useState({
    name: "",
    monthlyHours: "",
    rate: "",
    startDate: new Date().toISOString().slice(0, 10),
    billable: true,
    trelloCardId: "",
  });
  const [newStaff, setNewStaff] = useState({ name: "", availableHours: "", hourlyCost: "" });

  async function loadAll() {
    const [c, s, cal] = await Promise.all([
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/staff").then((r) => r.json()),
      fetch("/api/google/status").then((r) => r.json()),
    ]);
    setClients(c);
    setStaff(s);
    setCalendar(cal);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function addClient(e: React.FormEvent) {
    e.preventDefault();
    if (!newClient.name) return;
    await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newClient),
    });
    setNewClient({ ...newClient, name: "", monthlyHours: "", rate: "", trelloCardId: "" });
    loadAll();
  }

  async function updateClientStatus(id: string, status: Client["status"]) {
    await fetch(`/api/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadAll();
  }

  async function deleteClient(id: string) {
    if (!confirm("Remove this client? Income entries stay but lose the link.")) return;
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    loadAll();
  }

  async function disconnectCalendar() {
    if (!confirm("Disconnect Google Calendar?")) return;
    await fetch("/api/google/disconnect", { method: "POST" });
    loadAll();
  }

  async function toggleCalendarLinked(staffId: string, value: boolean) {
    await fetch(`/api/staff/${staffId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calendarLinked: value }),
    });
    loadAll();
  }

  async function addStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!newStaff.name) return;
    await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newStaff),
    });
    setNewStaff({ name: "", availableHours: "", hourlyCost: "" });
    loadAll();
  }

  async function deleteStaff(id: string) {
    if (!confirm("Remove this team member?")) return;
    await fetch(`/api/staff/${id}`, { method: "DELETE" });
    loadAll();
  }

  const billableClients = clients.filter((c) => c.billable);
  const proBonoClients = clients.filter((c) => !c.billable);
  const activeBillable = billableClients.filter((c) => c.status === "ACTIVE");
  const endedClients = clients.filter((c) => c.status === "ENDED");

  const totalHoursNeeded = activeBillable.reduce((s, c) => s + c.monthlyHours, 0);
  const totalAvailable = staff.reduce((s, m) => s + m.availableHours, 0);
  const totalValue = activeBillable.reduce((s, c) => s + c.monthlyHours * c.rate, 0);
  const blendedRate = totalHoursNeeded > 0 ? totalValue / totalHoursNeeded : 0;

  const now = new Date();
  const avgActiveTenure =
    activeBillable.length > 0
      ? activeBillable.reduce((s, c) => s + monthsBetween(new Date(c.startDate), now), 0) /
        activeBillable.length
      : 0;
  const avgChurnLifespan =
    endedClients.length > 0
      ? endedClients.reduce(
          (s, c) => s + monthsBetween(new Date(c.startDate), c.endDate ? new Date(c.endDate) : now),
          0
        ) / endedClients.length
      : 0;
  const everSigned = billableClients.length; // active + paused + ended, billable only
  const churnRate = everSigned > 0 ? (endedClients.length / everSigned) * 100 : 0;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Clients &amp; capacity</h1>
          <div className="page-sub">
            {totalHoursNeeded}h/month needed across active clients · {totalAvailable}h/month
            available across the team · blended rate £{blendedRate.toFixed(0)}/hr
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <p className="panel-title">Clients</p>
          {loading ? (
            <div className="empty-state">Loading…</div>
          ) : billableClients.length === 0 ? (
            <div className="empty-state">No clients yet — add your first below.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Started</th>
                  <th>Hours/mo</th>
                  <th>£/hr</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {billableClients.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/clients/${c.id}`} className="client-link-style">
                        {c.name}
                      </Link>
                    </td>
                    <td>
                      {new Date(c.startDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                    </td>
                    <td>{c.monthlyHours}h</td>
                    <td className="numeral">£{c.rate}</td>
                    <td>
                      <select
                        value={c.status}
                        onChange={(e) => updateClientStatus(c.id, e.target.value as Client["status"])}
                        style={{ border: "1px solid var(--line)", borderRadius: 4, fontSize: 12, padding: "2px 4px" }}
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="PAUSED">Paused</option>
                        <option value="ENDED">Ended</option>
                      </select>
                    </td>
                    <td>
                      <a className="delete-link" onClick={() => deleteClient(c.id)} href="#">remove</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <form onSubmit={addClient} style={{ marginTop: 18 }}>
            <div className="form-grid">
              <div className="form-row">
                <label>Client name</label>
                <input value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} />
              </div>
              <div className="form-row">
                <label>Hours needed / month</label>
                <input
                  type="number"
                  step="0.5"
                  value={newClient.monthlyHours}
                  onChange={(e) => setNewClient({ ...newClient, monthlyHours: e.target.value })}
                />
              </div>
            </div>
            <div className="form-grid">
              <div className="form-row">
                <label>Rate (£/hr)</label>
                <input
                  type="number"
                  step="0.5"
                  value={newClient.rate}
                  onChange={(e) => setNewClient({ ...newClient, rate: e.target.value })}
                />
              </div>
              <div className="form-row">
                <label>Started</label>
                <input
                  type="date"
                  value={newClient.startDate}
                  onChange={(e) => setNewClient({ ...newClient, startDate: e.target.value })}
                />
              </div>
            </div>
            <div className="form-row">
              <label>Trello card ID (optional)</label>
              <input
                value={newClient.trelloCardId}
                onChange={(e) => setNewClient({ ...newClient, trelloCardId: e.target.value })}
                placeholder="from the card's Share menu"
              />
            </div>
            <div className="form-row" style={{ marginBottom: 14 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="checkbox"
                  checked={!newClient.billable}
                  onChange={(e) => setNewClient({ ...newClient, billable: !e.target.checked })}
                  style={{ width: "auto" }}
                />
                Pro-bono / volunteer (not counted in capacity or blended rate)
              </label>
            </div>
            <button className="btn" type="submit">Add client</button>
          </form>
        </div>

        <div className="panel">
          <p className="panel-title">Team availability</p>
          {staff.length === 0 ? (
            <div className="empty-state">No one on the team yet.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Hours/mo</th>
                  <th>£/hr cost</th>
                  <th>Use calendar</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.availableHours}h</td>
                    <td>{s.hourlyCost ? `£${s.hourlyCost}` : "—"}</td>
                    <td>
                      <input
                        type="checkbox"
                        checked={s.calendarLinked}
                        disabled={!calendar?.connected}
                        onChange={(e) => toggleCalendarLinked(s.id, e.target.checked)}
                      />
                    </td>
                    <td>
                      <a className="delete-link" onClick={() => deleteStaff(s.id)} href="#">remove</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="panel" style={{ margin: "18px 0" }}>
            <p className="panel-title">Google Calendar</p>
            {!calendar?.configured ? (
              <div className="empty-state">
                Not set up yet — add <code>GOOGLE_CLIENT_ID</code> and{" "}
                <code>GOOGLE_CLIENT_SECRET</code>, then redeploy.
              </div>
            ) : calendar.connected ? (
              <div>
                <div className="summary-note" style={{ marginBottom: 10 }}>
                  Connected. This month:{" "}
                  {calendar.error
                    ? "couldn't reach Google just now."
                    : `${calendar.busyHours}h booked in meetings so far.`}{" "}
                  For anyone with &quot;use calendar&quot; ticked below, that gets subtracted
                  from their target hours, not from a full working month.
                </div>
                <button className="btn secondary" onClick={disconnectCalendar}>Disconnect</button>
              </div>
            ) : (
              <a className="btn" href="/api/google/connect">Connect Google Calendar</a>
            )}
          </div>

          <form onSubmit={addStaff} style={{ marginTop: 18 }}>
            <div className="form-row">
              <label>Name</label>
              <input value={newStaff.name} onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} />
            </div>
            <div className="form-grid">
              <div className="form-row">
                <label>Available hours / month</label>
                <input
                  type="number"
                  step="0.5"
                  value={newStaff.availableHours}
                  onChange={(e) => setNewStaff({ ...newStaff, availableHours: e.target.value })}
                />
              </div>
              <div className="form-row">
                <label>Cost £/hr (optional)</label>
                <input
                  type="number"
                  step="0.5"
                  value={newStaff.hourlyCost}
                  onChange={(e) => setNewStaff({ ...newStaff, hourlyCost: e.target.value })}
                />
              </div>
            </div>
            <button className="btn" type="submit">Add team member</button>
          </form>
        </div>
      </div>

      {proBonoClients.length > 0 && (
        <div className="panel" style={{ marginBottom: 24 }}>
          <p className="panel-title">Pro-bono &amp; volunteer</p>
          <div className="summary-note" style={{ marginBottom: 12 }}>
            Not counted in capacity or blended rate above.
          </div>
          <table>
            <thead>
              <tr><th>Client</th><th>Notional rate</th><th>Hours/mo</th><th></th></tr>
            </thead>
            <tbody>
              {proBonoClients.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/clients/${c.id}`} className="client-link-style">{c.name}</Link>
                  </td>
                  <td className="numeral">£{c.rate}/hr</td>
                  <td>{c.monthlyHours}h</td>
                  <td><span className="tag-probono">Pro-bono</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="panel">
        <p className="panel-title">Client health</p>
        <div className="stat-row" style={{ marginBottom: 20 }}>
          <div>
            <div className="summary-label">Churn rate (all-time)</div>
            <div className="summary-value numeral" style={{ fontSize: 22 }}>{churnRate.toFixed(0)}%</div>
            <div className="summary-note">{endedClients.length} ended / {everSigned} ever signed</div>
          </div>
          <div>
            <div className="summary-label">Avg. active tenure</div>
            <div className="summary-value numeral" style={{ fontSize: 22 }}>{avgActiveTenure.toFixed(1)} months</div>
            <div className="summary-note">across {activeBillable.length} current clients</div>
          </div>
          <div>
            <div className="summary-label">Avg. lifespan at churn</div>
            <div className="summary-value numeral" style={{ fontSize: 22 }}>{avgChurnLifespan.toFixed(1)} months</div>
            <div className="summary-note">across {endedClients.length} ended clients</div>
          </div>
        </div>
        {endedClients.length > 0 && (
          <>
            <p className="panel-title">Ended clients</p>
            <table>
              <thead><tr><th>Client</th><th>Started</th><th>Ended</th><th>Length</th></tr></thead>
              <tbody>
                {endedClients.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/clients/${c.id}`} className="client-link-style">{c.name}</Link>
                    </td>
                    <td>{new Date(c.startDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</td>
                    <td>{c.endDate ? new Date(c.endDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "—"}</td>
                    <td>{monthsBetween(new Date(c.startDate), c.endDate ? new Date(c.endDate) : now)} months</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </>
  );
}
