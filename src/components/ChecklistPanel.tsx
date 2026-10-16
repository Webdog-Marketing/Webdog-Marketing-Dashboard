"use client";

import { useEffect, useState } from "react";

type Item = { id: string; label: string; linkUrl: string | null; order: number; done: boolean };

export default function ChecklistPanel({ clientId }: { clientId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLink, setEditingLink] = useState<string | null>(null);
  const [linkDraft, setLinkDraft] = useState("");
  const [newLabel, setNewLabel] = useState("");

  async function load() {
    const res = await fetch(`/api/clients/${clientId}/checklist`);
    setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  async function toggle(item: Item) {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)));
    await fetch(`/api/checklist/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !item.done }),
    });
  }

  async function saveLink(id: string) {
    await fetch(`/api/checklist/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linkUrl: linkDraft }),
    });
    setEditingLink(null);
    load();
  }

  async function removeItem(id: string) {
    if (!confirm("Remove this checklist item?")) return;
    await fetch(`/api/checklist/${id}`, { method: "DELETE" });
    load();
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    await fetch(`/api/clients/${clientId}/checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newLabel }),
    });
    setNewLabel("");
    load();
  }

  const done = items.filter((i) => i.done).length;

  return (
    <div className="panel" style={{ marginBottom: 24 }}>
      <p className="panel-title">
        Onboarding checklist {items.length > 0 && `(${done}/${items.length})`}
      </p>
      {loading ? (
        <div className="empty-state">Loading…</div>
      ) : (
        <>
          {items.length > 0 && (
            <div className="capacity-bar-track" style={{ marginBottom: 16 }}>
              <div className="capacity-bar-fill" style={{ width: `${(done / items.length) * 100}%` }} />
            </div>
          )}
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "7px 0",
                borderBottom: "1px solid var(--line)",
                fontSize: 14,
              }}
            >
              <input type="checkbox" checked={item.done} onChange={() => toggle(item)} />
              <span
                style={{
                  flex: 1,
                  textDecoration: item.done ? "line-through" : "none",
                  color: item.done ? "var(--text-muted)" : "var(--text)",
                }}
              >
                {item.label}
              </span>
              {editingLink === item.id ? (
                <>
                  <input
                    value={linkDraft}
                    onChange={(e) => setLinkDraft(e.target.value)}
                    placeholder="https://…"
                    style={{ fontSize: 12, padding: "3px 6px", border: "1px solid var(--line-dark)", borderRadius: 4, width: 180 }}
                  />
                  <a href="#" className="delete-link" onClick={() => saveLink(item.id)}>save</a>
                </>
              ) : item.linkUrl ? (
                <a href={item.linkUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>Open ↗</a>
              ) : (
                <a
                  href="#"
                  className="delete-link"
                  style={{ color: "var(--text-muted)" }}
                  onClick={() => { setEditingLink(item.id); setLinkDraft(""); }}
                >
                  add link
                </a>
              )}
              <a className="delete-link" href="#" onClick={() => removeItem(item.id)}>remove</a>
            </div>
          ))}
          <form onSubmit={addItem} style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Add a custom step for this client…"
              style={{ flex: 1 }}
            />
            <button className="btn secondary" type="submit">Add</button>
          </form>
        </>
      )}
    </div>
  );
}
