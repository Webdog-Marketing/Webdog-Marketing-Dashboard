import { NextResponse } from "next/server";
import { getMonthlyAvailability, googleConfigured } from "@/lib/google";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!googleConfigured()) {
    return NextResponse.json({ configured: false, connected: false });
  }
  const availability = await getMonthlyAvailability();
  return NextResponse.json({ configured: true, ...availability });
}
