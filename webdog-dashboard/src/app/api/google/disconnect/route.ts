import { NextResponse } from "next/server";
import { disconnectCalendar } from "@/lib/google";

export async function POST() {
  await disconnectCalendar();
  return NextResponse.json({ ok: true });
}
