import { NextResponse } from "next/server";
import { disconnectCalendar } from "@/lib/google";

export const dynamic = "force-dynamic";

export async function POST() {
  await disconnectCalendar();
  return NextResponse.json({ ok: true });
}
