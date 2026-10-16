"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Card = {
  id: string;
  name: string;
  shortUrl: string;
  progress: { done: number; total: number };
};
type ListData = { id: string; name: string; cards: Card[] };
type BoardData = { boardId: string; boardName: string; lists: ListData[] };

export default function TasksPage() {
  const [configured, setConfigured] = useState(true);
  const [noBoards, setNoBoards] = useState(false);
  const [boards, setBoards] = useState<BoardData[]>([]);
  const [clientsByTrelloId, setClientsByTrelloId] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/trello").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
    ]).then(([trello, clients]) => {
      setConfigured(trello.configured);
      setNoBoards(!!trello.noBoards);
      setBoards(trello.boards ?? []);
      const map: Record<string, string> = {};
      (clients ?? []).forEach((c: { id: string; trelloCardId: string | null }) => {
        if (c.trelloCardId) map[c.trelloCardId] = c.id;
      });
      setClientsByTrelloId(map);
      setLoading(false);
    });
  }, []);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tasks</h1>
          <div className="page-sub">Live from Trello — one card per client, progress from their checklist.</div>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Loading…</div>
      ) : !configured ? (
        <div className="panel">
          <div className="empty-state">
            Trello isn&apos;t connected. Add <code>TRELLO_API_KEY</code>,{" "}
            <code>TRELLO_TOKEN</code> and <code>TRELLO_BOARD_IDS</code> as
            environment variables, then redeploy.
          </div>
        </div>
      ) : noBoards ? (
        <div className="panel">
          <div className="empty-state">
            Trello is connected but no boards are configured. Set{" "}
            <code>TRELLO_BOARD_IDS</code>.
          </div>
        </div>
      ) : (
        boards.map((b) => (
          <div key={b.boardId}>
            {b.lists
              .filter((l) => l.cards.length > 0)
              .map((list) => (
                <div className="panel" key={list.id} style={{ marginBottom: 24 }}>
                  <p className="panel-title">
                    {list.name} ({list.cards.length} cards)
                  </p>
                  {list.cards.map((c) => {
                    const clientId = clientsByTrelloId[c.id];
                    const pct = c.progress.total > 0 ? (c.progress.done / c.progress.total) * 100 : 0;
                    const label = clientId ? (
                      <Link href={`/clients/${clientId}`} className="client-link-style">
                        {c.name}
                      </Link>
                    ) : (
                      <a href={c.shortUrl} target="_blank" rel="noreferrer">
                        {c.name}
                      </a>
                    );
                    return (
                      <div className="progress-row" key={c.id}>
                        <span style={{ flex: "0 0 220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {label}
                        </span>
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="numeral progress-count">
                          {c.progress.total > 0 ? `${c.progress.done}/${c.progress.total}` : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
          </div>
        ))
      )}
    </>
  );
}
