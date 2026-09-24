import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const expenses = await prisma.expense.findMany({
    orderBy: { date: "desc" },
  });
  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const expense = await prisma.expense.create({
    data: {
      label: body.label,
      category: body.category,
      amount: Number(body.amount),
      date: new Date(body.date),
      recurring: !!body.recurring,
    },
  });
  return NextResponse.json(expense, { status: 201 });
}
