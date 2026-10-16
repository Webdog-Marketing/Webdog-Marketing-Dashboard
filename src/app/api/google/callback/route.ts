import { NextRequest, NextResponse } from "next/server";
import { saveTokensFromCallback } from "@/lib/google";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  const backTo = new URL("/clients", req.nextUrl.origin);

  if (error || !code) {
    backTo.searchParams.set("calendar_error", error || "missing_code");
    return NextResponse.redirect(backTo);
  }

  try {
    const redirectUri = `${req.nextUrl.origin}/api/google/callback`;
    await saveTokensFromCallback(code, redirectUri);
    backTo.searchParams.set("calendar_connected", "1");
  } catch (e) {
    backTo.searchParams.set("calendar_error", "token_exchange_failed");
  }

  return NextResponse.redirect(backTo);
}
