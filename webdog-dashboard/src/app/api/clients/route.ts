import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const clients = await prisma.client.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const client = await prisma.client.create({
    data: {
      name: body.name,
      status: body.status ?? "ACTIVE",
      billable: body.billable !== undefined ? !!body.billable : true,
      monthlyHours: Number(body.monthlyHours) || 0,
      rate: Number(body.rate) || 0,
      startDate: body.startDate ? new Date(body.startDate) : new Date(),
      trelloCardId: body.trelloCardId || null,
      website: body.website || null,
      googleDriveUrl: body.googleDriveUrl || null,
      dataStudioUrl: body.dataStudioUrl || null,
      searchConsoleUrl: body.searchConsoleUrl || null,
      googleAdsUrl: body.googleAdsUrl || null,
      analyticsUrl: body.analyticsUrl || null,
      notes: body.notes || null,
    },
  });
  return NextResponse.json(client, { status: 201 });
}
