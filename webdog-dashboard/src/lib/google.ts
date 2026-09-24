import { prisma } from "@/lib/prisma";
import { daysInMonth, localWallTimeToUTC, round1 } from "@/lib/worktime";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ACCOUNT_ID = "default";

export function googleConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export async function isCalendarConnected() {
  const account = await prisma.googleAccount.findUnique({
    where: { id: ACCOUNT_ID },
  });
  return !!account;
}

export async function disconnectCalendar() {
  await prisma.googleAccount
    .delete({ where: { id: ACCOUNT_ID } })
    .catch(() => null);
}

export async function saveTokensFromCallback(
  code: string,
  redirectUri: string
) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
  const data = await res.json();

  await prisma.googleAccount.upsert({
    where: { id: ACCOUNT_ID },
    create: {
      id: ACCOUNT_ID,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
    update: {
      accessToken: data.access_token,
      // Google only returns refresh_token on first consent — keep the
      // existing one if this is a re-auth without prompt=consent forcing a new one.
      ...(data.refresh_token ? { refreshToken: data.refresh_token } : {}),
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
  });
}

async function getValidAccessToken(): Promise<string | null> {
  const account = await prisma.googleAccount.findUnique({
    where: { id: ACCOUNT_ID },
  });
  if (!account) return null;

  if (account.expiresAt.getTime() > Date.now() + 60_000) {
    return account.accessToken;
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: account.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();

  await prisma.googleAccount.update({
    where: { id: ACCOUNT_ID },
    data: {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
  });

  return data.access_token as string;
}

export type MonthlyAvailability =
  | { connected: false }
  | { connected: true; error: true }
  | {
      connected: true;
      error?: false;
      workingHours: number;
      busyHours: number;
      netAvailable: number;
    };

// Working hours for the *current* month, minus calendar meeting time that
// falls inside those hours. Mon–Fri only, 9am–5pm by default.
export async function getMonthlyAvailability(): Promise<MonthlyAvailability> {
  const token = await getValidAccessToken();
  if (!token) return { connected: false };

  const timeZone = process.env.WORK_TIMEZONE || "Europe/London";
  const startHour = Number(process.env.WORK_HOURS_START) || 9;
  const endHour = Number(process.env.WORK_HOURS_END) || 17;

  const now = new Date();
  const year = now.getFullYear();
  const monthIndex = now.getMonth();

  const windows: { start: Date; end: Date }[] = [];
  let workingMs = 0;
  for (let d = 1; d <= daysInMonth(year, monthIndex); d++) {
    const weekday = new Date(year, monthIndex, d).getDay();
    if (weekday === 0 || weekday === 6) continue; // skip Sat/Sun
    const start = localWallTimeToUTC(year, monthIndex, d, startHour, 0, timeZone);
    const end = localWallTimeToUTC(year, monthIndex, d, endHour, 0, timeZone);
    windows.push({ start, end });
    workingMs += end.getTime() - start.getTime();
  }

  const monthStart = new Date(Date.UTC(year, monthIndex, 1));
  const monthEnd = new Date(Date.UTC(year, monthIndex + 1, 1));

  const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin: monthStart.toISOString(),
      timeMax: monthEnd.toISOString(),
      items: [{ id: "primary" }],
    }),
    cache: "no-store",
  });

  if (!res.ok) return { connected: true, error: true };
  const data = await res.json();
  const busy: { start: string; end: string }[] =
    data.calendars?.primary?.busy ?? [];

  let busyMs = 0;
  for (const b of busy) {
    const bStart = new Date(b.start).getTime();
    const bEnd = new Date(b.end).getTime();
    for (const w of windows) {
      const overlapStart = Math.max(bStart, w.start.getTime());
      const overlapEnd = Math.min(bEnd, w.end.getTime());
      if (overlapEnd > overlapStart) busyMs += overlapEnd - overlapStart;
    }
  }

  const workingHours = workingMs / 3_600_000;
  const busyHours = busyMs / 3_600_000;

  return {
    connected: true,
    workingHours: round1(workingHours),
    busyHours: round1(busyHours),
    netAvailable: round1(Math.max(0, workingHours - busyHours)),
  };
}
