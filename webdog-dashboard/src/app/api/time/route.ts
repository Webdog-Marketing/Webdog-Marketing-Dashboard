import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const entries = await prisma.timeEntry.findMany({
    orderBy: { date: "desc" },
    include: { client: true },
  });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const client = await prisma.client.findUnique({ where: { id: body.clientId } });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 400 });

  const entry = await prisma.timeEntry.create({
    data: {
      clientId: body.clientId,
      hours: Number(body.hours),
      rate: body.rate !== undefined ? Number(body.rate) : client.rate,
      date: new Date(body.date),
      note: body.note || null,
    },
  });
  return NextResponse.json(entry, { status: 201 });
}
