import { NextRequest, NextResponse } from "next/server";
import { googleConfigured } from "@/lib/google";

export async function GET(req: NextRequest) {
  if (!googleConfigured()) {
    return NextResponse.json(
      { error: "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET first." },
      { status: 400 }
    );
  }

  const redirectUri = `${req.nextUrl.origin}/api/google/callback`;
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: "https://www.googleapis.com/auth/calendar.readonly",
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
