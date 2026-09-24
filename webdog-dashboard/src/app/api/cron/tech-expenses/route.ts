import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { monthlyEquivalent } from "@/lib/techstack";

// Called by Vercel Cron on the 1st of every month (see vercel.json).
// Idempotent: safe to call more than once in the same month — it won't
// double-post for a tool it's already logged this month.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const tools = await prisma.techTool.findMany({
    where: { billingCycle: { in: ["MONTHLY", "ANNUAL"] } },
  });

  const created: string[] = [];

  for (const tool of tools) {
    const already = await prisma.expense.findFirst({
      where: { techToolId: tool.id, date: { gte: monthStart, lt: monthEnd } },
    });
    if (already) continue;

    const amount = monthlyEquivalent(tool);
    if (amount <= 0) continue;

    await prisma.expense.create({
      data: {
        label: tool.name,
        category: "Tech stack (auto)",
        amount,
        date: monthStart,
        recurring: true,
        auto: true,
        techToolId: tool.id,
      },
    });
    created.push(tool.name);
  }

  return NextResponse.json({ ok: true, created });
}
