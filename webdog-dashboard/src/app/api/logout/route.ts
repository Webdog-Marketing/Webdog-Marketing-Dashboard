import { NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";

export const runtime = "edge";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(AUTH_COOKIE);
  return res;
}
