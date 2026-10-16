import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { STANDARD_ONBOARDING_STEPS } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  let items = await prisma.checklistItem.findMany({
    where: { clientId: params.id },
    orderBy: { order: "asc" },
  });

  // Clients created before this feature existed get the standard set on first view.
  if (items.length === 0) {
    const client = await prisma.client.findUnique({ where: { id: params.id } });
    if (client) {
      await prisma.checklistItem.createMany({
        data: STANDARD_ONBOARDING_STEPS.map((label, i) => ({ clientId: params.id, label, order: i })),
      });
      items = await prisma.checklistItem.findMany({
        where: { clientId: params.id },
        orderBy: { order: "asc" },
      });
    }
  }
  return NextResponse.json(items);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const max = await prisma.checklistItem.aggregate({
    where: { clientId: params.id },
    _max: { order: true },
  });
  const item = await prisma.checklistItem.create({
    data: {
      clientId: params.id,
      label: body.label,
      linkUrl: body.linkUrl || null,
      order: (max._max.order ?? -1) + 1,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
