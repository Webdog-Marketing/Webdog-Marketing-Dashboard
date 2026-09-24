"use client";

import { useEffect, useState } from "react";

type Expense = {
  id: string;
  label: string;
  category: string;
  amount: number;
  date: string;
  recurring: boolean;
  auto: boolean;
};

const CATEGORIES = [
  "Software",
  "Subcontractor",
  "Marketing",
  "Travel",
  "Office / co-working",
  "Other",
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    label: "",
    category: "Software",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    recurring: false,
  });

  async function loadAll() {
    const e = await fetch("/api/expenses").then((r) => r.json());
    setExpenses(e);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!form.label || !form.amount) return;
    await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ ...form, label: "", amount: "" });
    loadAll();
  }

  async function removeExpense(id: string) {
    if (!confirm("Delete this expense?")) return;
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    loadAll();
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const categoriesPresent = Array.from(new Set(expenses.map((e) => e.category)));
  const byCategory = categoriesPresent
    .map((cat) => ({
      cat,
      total: expenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0),
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Expenditure</h1>
          <div className="page-sub">
            {expenses.length} entries logged · £{total.toFixed(0)} total on record
          </div>
        </div>
      </div>

      <div className="card-form">
        <p className="panel-title">Log expense</p>
        <form onSubmit={addExpense}>
          <div className="form-grid">
            <div className="form-row">
              <label>Description</label>
              <input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="e.g. Ahrefs subscription"
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
              <label>Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
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
            Add expense
          </button>
        </form>
      </div>

      {byCategory.length > 0 && (
        <div className="panel" style={{ marginBottom: 24 }}>
          <p className="panel-title">By category</p>
          <table>
            <tbody>
              {byCategory.map((c) => (
                <tr key={c.cat}>
                  <td>{c.cat}</td>
                  <td style={{ textAlign: "right" }} className="numeral">
                    £{c.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="panel">
        <p className="panel-title">All entries</p>
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : expenses.length === 0 ? (
          <div className="empty-state">No expenses logged yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Amount</th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td>
                    {new Date(e.date).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td>{e.label}</td>
                  <td>{e.category}</td>
                  <td className="numeral">£{e.amount.toFixed(2)}</td>
                  <td>{e.auto && <span className="tag-auto">Auto</span>}</td>
                  <td>
                    {!e.auto && (
                      <a className="delete-link" href="#" onClick={() => removeExpense(e.id)}>
                        delete
                      </a>
                    )}
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
