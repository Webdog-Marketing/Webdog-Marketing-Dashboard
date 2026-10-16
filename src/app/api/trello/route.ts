import { NextResponse } from "next/server";
import { cardProgress, configuredBoardIds, fetchBoardData, trelloConfigured } from "@/lib/trello";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!trelloConfigured()) {
    return NextResponse.json({ configured: false, boards: [] });
  }

  const boardIds = configuredBoardIds();
  if (boardIds.length === 0) {
    return NextResponse.json({ configured: true, noBoards: true, boards: [] });
  }

  const boardsRaw = await Promise.all(boardIds.map(fetchBoardData));
  const boards = boardsRaw
    .filter((b): b is NonNullable<typeof b> => !!b)
    .map((b) => ({
      boardId: b.boardId,
      boardName: b.boardName,
      lists: b.lists.map((list) => ({
        id: list.id,
        name: list.name,
        cards: b.cards
          .filter((c) => c.idList === list.id)
          .map((c) => ({
            id: c.id,
            name: c.name,
            shortUrl: c.shortUrl,
            progress: cardProgress(c),
          })),
      })),
    }));

  return NextResponse.json({ configured: true, boards });
}
