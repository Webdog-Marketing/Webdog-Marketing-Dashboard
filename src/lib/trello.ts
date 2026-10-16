const TRELLO_BASE = "https://api.trello.com/1";

export type TrelloCheckItem = { state: "complete" | "incomplete" };
export type TrelloChecklist = { checkItems: TrelloCheckItem[] };

export type TrelloCard = {
  id: string;
  name: string;
  idList: string;
  shortUrl: string;
  checklists: TrelloChecklist[];
};

export type TrelloList = { id: string; name: string };

export type TrelloBoardData = {
  boardId: string;
  boardName: string;
  lists: TrelloList[];
  cards: TrelloCard[];
};

function creds() {
  const key = process.env.TRELLO_API_KEY;
  const token = process.env.TRELLO_TOKEN;
  if (!key || !token) return null;
  return { key, token };
}

export function trelloConfigured() {
  return !!creds();
}

// Comma-separated board IDs in TRELLO_BOARD_IDS, e.g. "abc123,def456"
export function configuredBoardIds(): string[] {
  const raw = process.env.TRELLO_BOARD_IDS || "";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

// Sums checklist items across all checklists on a card.
export function cardProgress(card: { checklists: TrelloChecklist[] }): {
  done: number;
  total: number;
} {
  let done = 0;
  let total = 0;
  for (const cl of card.checklists ?? []) {
    for (const item of cl.checkItems ?? []) {
      total += 1;
      if (item.state === "complete") done += 1;
    }
  }
  return { done, total };
}

export async function fetchBoardData(boardId: string): Promise<TrelloBoardData | null> {
  const c = creds();
  if (!c) return null;

  const params = `key=${c.key}&token=${c.token}`;

  const [boardRes, listsRes, cardsRes] = await Promise.all([
    fetch(`${TRELLO_BASE}/boards/${boardId}?${params}&fields=name`, { cache: "no-store" }),
    fetch(`${TRELLO_BASE}/boards/${boardId}/lists?${params}&fields=name`, { cache: "no-store" }),
    fetch(
      `${TRELLO_BASE}/boards/${boardId}/cards?${params}` +
        `&fields=name,idList,shortUrl` +
        `&checklists=all&checklist_fields=none&checkItems=all&checkItem_fields=state`,
      { cache: "no-store" }
    ),
  ]);

  if (!boardRes.ok || !listsRes.ok || !cardsRes.ok) return null;

  const board = await boardRes.json();
  const lists = await listsRes.json();
  const cards = await cardsRes.json();

  return { boardId, boardName: board.name, lists, cards };
}

// Fetches a single card (used for a specific client's linked card) with
// its checklist progress. Cheaper than pulling the whole board.
export async function fetchCard(cardId: string): Promise<TrelloCard | null> {
  const c = creds();
  if (!c) return null;

  const res = await fetch(
    `${TRELLO_BASE}/cards/${cardId}?key=${c.key}&token=${c.token}` +
      `&fields=name,idList,shortUrl` +
      `&checklists=all&checklist_fields=none&checkItems=all&checkItem_fields=state`,
    { cache: "no-store" }
  );
  if (!res.ok) return null;
  return res.json();
}
