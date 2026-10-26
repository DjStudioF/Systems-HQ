/**
 * Pure reminder scheduling. Given a user's notification settings, their
 * timezone and an injected instant, decide which reminders are due in the
 * current 15-minute slot. Never reads the clock directly.
 */
import { isoWeekday, localToday, weekStart, type IsoDate } from "@/lib/date/local-date";

export type ReminderSettings = {
  daily_enabled: boolean;
  daily_times: string[];
  daily_days: number[];
  review_enabled: boolean;
  review_day: number;
  review_time: string;
};

export type DueReminder =
  | { kind: "daily"; slotKey: string; date: IsoDate }
  | { kind: "review"; slotKey: string; date: IsoDate; weekStart: IsoDate };

export const REMINDER_TIME_RE = /^([01]\d|2[0-3]):(00|15|30|45)$/;

/** Local "HH:MM" floored to the 15-minute slot. */
export function localSlot(timeZone: string, now: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return `${h}:${String(Math.floor(m / 15) * 15).padStart(2, "0")}`;
}

export function dueReminders(s: ReminderSettings, timeZone: string, now: Date): DueReminder[] {
  const date = localToday(timeZone, now);
  const wd = isoWeekday(date);
  const slot = localSlot(timeZone, now);
  const out: DueReminder[] = [];
  if (s.daily_enabled && s.daily_days.includes(wd) && s.daily_times.includes(slot)) {
    out.push({ kind: "daily", slotKey: `daily:${date}:${slot}`, date });
  }
  if (s.review_enabled && s.review_day === wd && s.review_time === slot) {
    out.push({ kind: "review", slotKey: `review:${date}`, date, weekStart: weekStart(date) });
  }
  return out;
}

/** Notification copy for open routines; null means nothing to nudge about. */
export function dailyMessage(open: number, total: number): string | null {
  if (total === 0 || open === 0) return null;
  if (open === total) return `${open} routine${open === 1 ? "" : "s"} waiting for today's check-in.`;
  return `${open} of ${total} routines still open today.`;
}
