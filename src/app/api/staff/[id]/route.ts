import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const member = await prisma.staffMember.update({
    where: { id: params.id },
    data: {
      name: body.name,
      availableHours:
        body.availableHours !== undefined
          ? Number(body.availableHours)
          : undefined,
      hourlyCost:
        body.hourlyCost !== undefined ? Number(body.hourlyCost) : undefined,
      calendarLinked:
        body.calendarLinked !== undefined ? !!body.calendarLinked : undefined,
    },
  });
  return NextResponse.json(member);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.staffMember.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
