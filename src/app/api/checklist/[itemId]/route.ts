import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { itemId: string } }) {
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.done !== undefined) {
    data.done = !!body.done;
    data.doneAt = body.done ? new Date() : null;
  }
  if (body.linkUrl !== undefined) data.linkUrl = body.linkUrl || null;
  if (body.label !== undefined) data.label = body.label;
  const item = await prisma.checklistItem.update({ where: { id: params.itemId }, data });
  return NextResponse.json(item);
}

export async function DELETE(_req: NextRequest, { params }: { params: { itemId: string } }) {
  await prisma.checklistItem.delete({ where: { id: params.itemId } });
  return NextResponse.json({ ok: true });
}
