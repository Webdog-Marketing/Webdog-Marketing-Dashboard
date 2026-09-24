import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const staff = await prisma.staffMember.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(staff);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const member = await prisma.staffMember.create({
    data: {
      name: body.name,
      availableHours: Number(body.availableHours) || 0,
      hourlyCost: body.hourlyCost ? Number(body.hourlyCost) : null,
    },
  });
  return NextResponse.json(member, { status: 201 });
}
