import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, checkPassword, expectedAuthToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const ok = await checkPassword(password ?? "");
  if (!ok) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }
  const token = await expectedAuthToken();
  const res = NextResponse.json({ ok: true });
  if (token) {
    res.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }
  return res;
}
