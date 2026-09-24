// Converts overlap between calendar "busy" blocks and a Mon–Fri working
// window into hours, timezone-aware (so 9am in Europe/London stays 9am
// through the BST/GMT switch).

function tzOffsetMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const asUTC = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour === "24" ? "0" : map.hour),
    Number(map.minute),
    Number(map.second)
  );
  return (asUTC - date.getTime()) / 60000;
}

export function localWallTimeToUTC(
  year: number,
  monthIndex: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  let guess = new Date(Date.UTC(year, monthIndex, day, hour, minute));
  for (let i = 0; i < 2; i++) {
    const offset = tzOffsetMinutes(guess, timeZone);
    guess = new Date(
      Date.UTC(year, monthIndex, day, hour, minute) - offset * 60000
    );
  }
  return guess;
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
