"use client";

import { useEffect, useState } from "react";

type Client = { id: string; name: string; rate: number; billable: boolean };
type TimeEntryRow = {
  id: string;
  hours: number;
  rate: number;
  date: string;
  note: string | null;
  client: Client;
};

export default function TimePage() {
  const [entries, setEntries] = useState<TimeEntryRow[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    clientId: "",
    hours: "",
    date: new Date().toISOString().slice(0, 10),
    note: "",
  });

  async function loadAll() {
    const [t, c] = await Promise.all([
      fetch("/api/time").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
    ]);
    setEntries(t);
    setClients(c);
    setLoading(false);
    if (!form.clientId && c.length) setForm((f) => ({ ...f, clientId: c[0].id }));
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedClient = clients.find((c) => c.id === form.clientId);

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientId || !form.hours) return;
    await fetch("/api/time", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ ...form, hours: "", note: "" });
    loadAll();
  }

  async function removeEntry(id: string) {
    if (!confirm("Delete this time entry?")) return;
    await fetch(`/api/time/${id}`, { method: "DELETE" });
    loadAll();
  }

  const totalHours = entries.reduce((s, e) => s + e.hours, 0);
  const billableValue = entries
    .filter((e) => e.client.billable)
    .reduce((s, e) => s + e.hours * e.rate, 0);
  const proBonoValue = entries
    .filter((e) => !e.client.billable)
    .reduce((s, e) => s + e.hours * e.rate, 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Time</h1>
          <div className="page-sub">
            {totalHours}h logged · £{(billableValue + proBonoValue).toFixed(0)} total value
            (£{billableValue.toFixed(0)} billable, £{proBonoValue.toFixed(0)} pro-bono unbilled)
          </div>
        </div>
      </div>

      <div className="card-form">
        <p className="panel-title">Log time</p>
        <form onSubmit={addEntry}>
          <div className="form-grid">
            <div className="form-row">
              <label>Client</label>
              <select
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {!c.billable ? " — pro-bono" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>Hours</label>
              <input
                type="number"
                step="0.25"
                value={form.hours}
                onChange={(e) => setForm({ ...form, hours: e.target.value })}
              />
            </div>
            <div className="form-row">
              <label>Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="form-row">
              <label>Note (optional)</label>
              <input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="e.g. Board meeting prep"
              />
            </div>
          </div>
          {selectedClient && (
            <div className="summary-note" style={{ marginBottom: 10 }}>
              Rate pulled from the client: £{selectedClient.rate}/hr
              {!selectedClient.billable ? " (notional — this client is marked pro-bono)" : ""}
            </div>
          )}
          <button className="btn" type="submit">
            Log time
          </button>
        </form>
      </div>

      <div className="panel">
        <p className="panel-title">All entries</p>
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="empty-state">No time logged yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Client</th>
                <th>Hours</th>
                <th>Rate</th>
                <th>Value</th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td>
                    {new Date(e.date).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td>{e.client.name}</td>
                  <td>{e.hours}h</td>
                  <td className="numeral">£{e.rate}/hr</td>
                  <td className="numeral">£{(e.hours * e.rate).toFixed(2)}</td>
                  <td>
                    <span className={e.client.billable ? "tag-billable" : "tag-probono"}>
                      {e.client.billable ? "Billable" : "Pro-bono"}
                    </span>
                  </td>
                  <td>
                    <a className="delete-link" href="#" onClick={() => removeEntry(e.id)}>
                      delete
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
