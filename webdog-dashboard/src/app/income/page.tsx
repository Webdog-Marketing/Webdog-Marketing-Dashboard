"use client";

import { useEffect, useState } from "react";

type IncomeEntry = {
  id: string;
  label: string;
  type: string;
  amount: number;
  date: string;
  recurring: boolean;
  client: { id: string; name: string } | null;
};

type Client = { id: string; name: string };

const TYPE_LABELS: Record<string, string> = {
  SEO_RETAINER: "SEO retainer",
  ONE_OFF_PROJECT: "One-off project",
  WEBSITE: "Website",
  ADS: "Ads",
  OTHER: "Other",
};

const TYPE_CLASS: Record<string, string> = {
  SEO_RETAINER: "retainer",
  ONE_OFF_PROJECT: "oneoff",
  WEBSITE: "website",
  ADS: "ads",
  OTHER: "other",
};

export default function IncomePage() {
  const [entries, setEntries] = useState<IncomeEntry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    label: "",
    type: "SEO_RETAINER",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    clientId: "",
    recurring: false,
  });

  async function loadAll() {
    const [e, c] = await Promise.all([
      fetch("/api/income").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
    ]);
    setEntries(e);
    setClients(c);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!form.label || !form.amount) return;
    await fetch("/api/income", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, clientId: form.clientId || null }),
    });
    setForm({ ...form, label: "", amount: "" });
    loadAll();
  }

  async function removeEntry(id: string) {
    if (!confirm("Delete this income entry?")) return;
    await fetch(`/api/income/${id}`, { method: "DELETE" });
    loadAll();
  }

  const total = entries.reduce((s, e) => s + e.amount, 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Income</h1>
          <div className="page-sub">
            {entries.length} entries logged · £{total.toFixed(0)} total on record
          </div>
        </div>
      </div>

      <div className="card-form">
        <p className="panel-title">Log income</p>
        <form onSubmit={addEntry}>
          <div className="form-grid">
            <div className="form-row">
              <label>Description</label>
              <input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="e.g. September retainer"
              />
            </div>
            <div className="form-row">
              <label>Amount (£)</label>
              <input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div className="form-row">
              <label>Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
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
              <label>Client (optional)</label>
              <select
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              >
                <option value="">— none —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row" style={{ justifyContent: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="checkbox"
                  checked={form.recurring}
                  onChange={(e) => setForm({ ...form, recurring: e.target.checked })}
                  style={{ width: "auto" }}
                />
                Recurs monthly
              </label>
            </div>
          </div>
          <button className="btn" type="submit">
            Add entry
          </button>
        </form>
      </div>

      <div className="panel">
        <p className="panel-title">All entries</p>
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="empty-state">No income logged yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Client</th>
                <th>Type</th>
                <th>Amount</th>
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
                  <td>{e.label}</td>
                  <td>{e.client?.name ?? "—"}</td>
                  <td>
                    <span className={`pill ${TYPE_CLASS[e.type]}`}>
                      {TYPE_LABELS[e.type]}
                    </span>
                  </td>
                  <td className="numeral">£{e.amount.toFixed(2)}</td>
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
