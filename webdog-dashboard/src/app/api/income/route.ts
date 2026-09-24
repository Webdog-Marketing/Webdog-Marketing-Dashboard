import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const entries = await prisma.incomeEntry.findMany({
    orderBy: { date: "desc" },
    include: { client: true },
  });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const entry = await prisma.incomeEntry.create({
    data: {
      clientId: body.clientId || null,
      label: body.label,
      type: body.type,
      amount: Number(body.amount),
      date: new Date(body.date),
      recurring: !!body.recurring,
    },
  });
  return NextResponse.json(entry, { status: 201 });
}
