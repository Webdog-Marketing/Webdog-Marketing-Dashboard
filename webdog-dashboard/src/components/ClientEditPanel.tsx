"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type EditableClient = {
  id: string;
  monthlyHours: number;
  rate: number;
  trelloCardId: string | null;
  website: string | null;
  googleDriveUrl: string | null;
  dataStudioUrl: string | null;
  searchConsoleUrl: string | null;
  googleAdsUrl: string | null;
  analyticsUrl: string | null;
  changelogUrl: string | null;
};

export default function ClientEditPanel({ client }: { client: EditableClient }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    monthlyHours: String(client.monthlyHours),
    rate: String(client.rate),
    trelloCardId: client.trelloCardId ?? "",
    website: client.website ?? "",
    googleDriveUrl: client.googleDriveUrl ?? "",
    dataStudioUrl: client.dataStudioUrl ?? "",
    searchConsoleUrl: client.searchConsoleUrl ?? "",
    googleAdsUrl: client.googleAdsUrl ?? "",
    analyticsUrl: client.analyticsUrl ?? "",
    changelogUrl: client.changelogUrl ?? "",
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        monthlyHours: form.monthlyHours,
        rate: form.rate,
        trelloCardId: form.trelloCardId || null,
        website: form.website || null,
        googleDriveUrl: form.googleDriveUrl || null,
        dataStudioUrl: form.dataStudioUrl || null,
        searchConsoleUrl: form.searchConsoleUrl || null,
        googleAdsUrl: form.googleAdsUrl || null,
        analyticsUrl: form.analyticsUrl || null,
        changelogUrl: form.changelogUrl || null,
      }),
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <button className="btn secondary" onClick={() => setEditing(true)} style={{ marginBottom: 24 }}>
        Edit details
      </button>
    );
  }

  return (
    <div className="card-form" style={{ marginBottom: 24 }}>
      <p className="panel-title">Edit details</p>
      <form onSubmit={save}>
        <div className="form-grid">
          <div className="form-row">
            <label>Hours needed / month</label>
            <input
              type="number"
              step="0.5"
              value={form.monthlyHours}
              onChange={(e) => setForm({ ...form, monthlyHours: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label>Rate (£/hr)</label>
            <input
              type="number"
              step="0.5"
              value={form.rate}
              onChange={(e) => setForm({ ...form, rate: e.target.value })}
            />
          </div>
        </div>
        <div className="form-row">
          <label>Trello card ID</label>
          <input
            value={form.trelloCardId}
            onChange={(e) => setForm({ ...form, trelloCardId: e.target.value })}
            placeholder="from the card's Share menu — just the ID, not the full URL"
          />
        </div>
        <div className="form-row">
          <label>Website</label>
          <input
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            placeholder="https://…"
          />
        </div>
        <div className="form-row">
          <label>Google Drive folder</label>
          <input
            value={form.googleDriveUrl}
            onChange={(e) => setForm({ ...form, googleDriveUrl: e.target.value })}
            placeholder="https://drive.google.com/…"
          />
        </div>
        <div className="form-row">
          <label>Data Studio link</label>
          <input
            value={form.dataStudioUrl}
            onChange={(e) => setForm({ ...form, dataStudioUrl: e.target.value })}
            placeholder="https://lookerstudio.google.com/…"
          />
        </div>
        <div className="form-row">
          <label>Google Search Console</label>
          <input
            value={form.searchConsoleUrl}
            onChange={(e) => setForm({ ...form, searchConsoleUrl: e.target.value })}
            placeholder="https://search.google.com/search-console…"
          />
        </div>
        <div className="form-row">
          <label>Google Ads</label>
          <input
            value={form.googleAdsUrl}
            onChange={(e) => setForm({ ...form, googleAdsUrl: e.target.value })}
            placeholder="https://ads.google.com/…"
          />
        </div>
        <div className="form-row">
          <label>Google Analytics</label>
          <input
            value={form.analyticsUrl}
            onChange={(e) => setForm({ ...form, analyticsUrl: e.target.value })}
            placeholder="https://analytics.google.com/…"
          />
        </div>
        <div className="form-row">
          <label>ChangeLog (e.g. Google Sheet)</label>
          <input
            value={form.changelogUrl}
            onChange={(e) => setForm({ ...form, changelogUrl: e.target.value })}
            placeholder="https://docs.google.com/spreadsheets/…"
          />
        </div>
        <button className="btn" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>{" "}
        <button
          type="button"
          className="btn secondary"
          onClick={() => setEditing(false)}
          disabled={saving}
        >
          Cancel
        </button>
      </form>
    </div>
  );
}
