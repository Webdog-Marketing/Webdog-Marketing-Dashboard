"use client";

import { useEffect, useState } from "react";

type Tool = {
  id: string;
  name: string;
  category: string;
  cost: number;
  billingCycle: "MONTHLY" | "ANNUAL" | "ONE_OFF";
  renewsOn: string;
  url: string | null;
};

const CYCLE_LABEL: Record<Tool["billingCycle"], string> = {
  MONTHLY: "/mo",
  ANNUAL: "/yr",
  ONE_OFF: " one-off",
};

function monthlyEquivalent(t: Tool) {
  if (t.billingCycle === "ANNUAL") return t.cost / 12;
  if (t.billingCycle === "ONE_OFF") return 0;
  return t.cost;
}

// Client-side mirror of the server logic — just for the "renews in N days" flag.
function nextRenewal(t: Tool, from = new Date()) {
  const anchor = new Date(t.renewsOn);
  if (t.billingCycle === "ONE_OFF") return anchor;
  const next = new Date(anchor);
  if (t.billingCycle === "MONTHLY") {
    while (next.getTime() < from.getTime()) next.setMonth(next.getMonth() + 1);
  } else {
    while (next.getTime() < from.getTime()) next.setFullYear(next.getFullYear() + 1);
  }
  return next;
}

export default function TechStackPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    category: "Software subscription",
    cost: "",
    billingCycle: "MONTHLY" as Tool["billingCycle"],
    renewsOn: new Date().toISOString().slice(0, 10),
    url: "",
  });

  async function loadAll() {
    const t = await fetch("/api/tech").then((r) => r.json());
    setTools(t);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function addTool(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.cost) return;
    await fetch("/api/tech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ ...form, name: "", cost: "", url: "" });
    loadAll();
  }

  async function removeTool(id: string) {
    if (!confirm("Remove this tool?")) return;
    await fetch(`/api/tech/${id}`, { method: "DELETE" });
    loadAll();
  }

  const totalMonthly = tools.reduce((s, t) => s + monthlyEquivalent(t), 0);
  const sorted = [...tools].sort(
    (a, b) => nextRenewal(a).getTime() - nextRenewal(b).getTime()
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tech stack</h1>
          <div className="page-sub">
            {tools.length} tools tracked · £{totalMonthly.toFixed(2)}/mo, auto-logged to Expenditure
          </div>
        </div>
      </div>

      <div className="summary-note" style={{ marginBottom: 20 }}>
        Each tool posts to Expenditure automatically on the 1st of the month — monthly
        tools at their full cost, annual ones split evenly across 12 months (e.g. a
        £120/yr subscription becomes £10/mo), so spend stays smooth instead of spiking
        on the renewal date. The renewal date itself only drives the reminder below.
      </div>

      <div className="card-form">
        <p className="panel-title">Add a tool</p>
        <form onSubmit={addTool}>
          <div className="form-grid">
            <div className="form-row">
              <label>Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Canva Pro"
              />
            </div>
            <div className="form-row">
              <label>Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option>Domain</option>
                <option>Hosting / CMS</option>
                <option>Software subscription</option>
                <option>Other</option>
              </select>
            </div>
            <div className="form-row">
              <label>Cost</label>
              <input
                type="number"
                step="0.01"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
              />
            </div>
            <div className="form-row">
              <label>Billing cycle</label>
              <select
                value={form.billingCycle}
                onChange={(e) =>
                  setForm({ ...form, billingCycle: e.target.value as Tool["billingCycle"] })
                }
              >
                <option value="MONTHLY">Monthly</option>
                <option value="ANNUAL">Annual</option>
                <option value="ONE_OFF">One-off</option>
              </select>
            </div>
            <div className="form-row">
              <label>Renews on</label>
              <input
                type="date"
                value={form.renewsOn}
                onChange={(e) => setForm({ ...form, renewsOn: e.target.value })}
              />
            </div>
            <div className="form-row">
              <label>Link / account (optional)</label>
              <input
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://…"
              />
            </div>
          </div>
          <button className="btn" type="submit">
            Add tool
          </button>
        </form>
      </div>

      <div className="panel">
        <p className="panel-title">All tools — soonest renewal first</p>
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : sorted.length === 0 ? (
          <div className="empty-state">No tools tracked yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Tool</th>
                <th>Category</th>
                <th>Cost</th>
                <th>Renews</th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => {
                const renewal = nextRenewal(t);
                const days = Math.ceil((renewal.getTime() - Date.now()) / 86_400_000);
                const soon = t.billingCycle !== "ONE_OFF" && days <= 30;
                return (
                  <tr key={t.id}>
                    <td>{t.url ? <a href={t.url} target="_blank" rel="noreferrer">{t.name}</a> : t.name}</td>
                    <td>{t.category}</td>
                    <td className="numeral">
                      £{t.cost.toFixed(2)}
                      {CYCLE_LABEL[t.billingCycle]}
                    </td>
                    <td>
                      {renewal.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td>
                      {t.billingCycle !== "ONE_OFF" && (
                        <span className={soon ? "tag-soon" : "tag-ok"}>
                          {soon ? `Renews in ${days} days` : `${days} days`}
                        </span>
                      )}
                    </td>
                    <td>
                      <a className="delete-link" href="#" onClick={() => removeTool(t.id)}>
                        remove
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
