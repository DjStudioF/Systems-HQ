/**
 * Calendar-date helpers. Dates are "YYYY-MM-DD" strings (SQL DATE).
 * Never derive "today" from a UTC ISO slice; always pass the profile timezone
 * and an injected clock (`now`) so tests are deterministic.
 */
export type IsoDate = string;

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseIsoDate(d: IsoDate): { y: number; m: number; day: number } {
  const match = ISO_RE.exec(d);
  if (!match) throw new Error(`Invalid ISO date: ${d}`);
  return { y: Number(match[1]), m: Number(match[2]), day: Number(match[3]) };
}

function fromParts(y: number, m: number, day: number): IsoDate {
  const dt = new Date(Date.UTC(y, m - 1, day));
  return dt.toISOString().slice(0, 10); // pure calendar math in UTC: no DST
}

/** Local calendar date in an IANA timezone for the given instant. */
export function localToday(timeZone: string, now: Date): IsoDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function addDays(d: IsoDate, n: number): IsoDate {
  const { y, m, day } = parseIsoDate(d);
  return fromParts(y, m, day + n);
}

/** ISO weekday: Monday = 1 … Sunday = 7. */
export function isoWeekday(d: IsoDate): number {
  const { y, m, day } = parseIsoDate(d);
  const w = new Date(Date.UTC(y, m - 1, day)).getUTCDay();
  return w === 0 ? 7 : w;
}

/** Monday of the week containing `d`. */
export function weekStart(d: IsoDate): IsoDate {
  return addDays(d, 1 - isoWeekday(d));
}

/** Whole calendar days from a to b (b - a), DST-safe. */
export function daysBetween(a: IsoDate, b: IsoDate): number {
  const pa = parseIsoDate(a);
  const pb = parseIsoDate(b);
  return Math.round((Date.UTC(pb.y, pb.m - 1, pb.day) - Date.UTC(pa.y, pa.m - 1, pa.day)) / 86_400_000);
}

/** Human label for a stored calendar date, without timezone shifting. */
export function formatIsoDate(d: IsoDate, opts: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric" }): string {
  const { y, m, day } = parseIsoDate(d);
  return new Intl.DateTimeFormat(undefined, { ...opts, timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, day)));
}
