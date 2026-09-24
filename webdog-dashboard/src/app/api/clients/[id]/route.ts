import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      timeEntries: { orderBy: { date: "desc" } },
      incomeEntries: { orderBy: { date: "desc" } },
    },
  });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(client);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();

  // If status is moving to ENDED and no endDate was supplied, stamp it now.
  const data: Record<string, unknown> = {
    name: body.name,
    status: body.status,
    billable: body.billable !== undefined ? !!body.billable : undefined,
    monthlyHours:
      body.monthlyHours !== undefined ? Number(body.monthlyHours) : undefined,
    rate: body.rate !== undefined ? Number(body.rate) : undefined,
    startDate: body.startDate ? new Date(body.startDate) : undefined,
    trelloCardId: body.trelloCardId,
    website: body.website,
    googleDriveUrl: body.googleDriveUrl,
    dataStudioUrl: body.dataStudioUrl,
    searchConsoleUrl: body.searchConsoleUrl,
    googleAdsUrl: body.googleAdsUrl,
    analyticsUrl: body.analyticsUrl,
    notes: body.notes,
  };

  if (body.status === "ENDED") {
    data.endDate = body.endDate ? new Date(body.endDate) : new Date();
  } else if (body.status && body.status !== "ENDED") {
    data.endDate = null;
  }

  const client = await prisma.client.update({
    where: { id: params.id },
    data,
  });
  return NextResponse.json(client);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.client.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
