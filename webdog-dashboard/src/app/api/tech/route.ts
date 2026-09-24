import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const tools = await prisma.techTool.findMany({ orderBy: { renewsOn: "asc" } });
  return NextResponse.json(tools);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const tool = await prisma.techTool.create({
    data: {
      name: body.name,
      category: body.category,
      cost: Number(body.cost),
      billingCycle: body.billingCycle ?? "MONTHLY",
      renewsOn: new Date(body.renewsOn),
      url: body.url || null,
    },
  });
  return NextResponse.json(tool, { status: 201 });
}
