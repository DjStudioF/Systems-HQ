import { describe, expect, it } from "vitest";
import { dailyMessage, dueReminders, localSlot, type ReminderSettings } from "./reminders";

const base: ReminderSettings = {
  daily_enabled: true,
  daily_times: ["20:00", "08:30"],
  daily_days: [1, 2, 3, 4, 5],
  review_enabled: true,
  review_day: 7,
  review_time: "18:00",
};

describe("reminders", () => {
  it("floors local time to the 15-minute slot in the user's timezone", () => {
    // 19:07 UTC on Mon 26 Oct 2026 = 20:07 in Berlin (CET)
    expect(localSlot("Europe/Berlin", new Date("2026-10-26T19:07:00Z"))).toBe("20:00");
  });

  it("fires the daily reminder at a chosen time on a chosen weekday", () => {
    const due = dueReminders(base, "Europe/Berlin", new Date("2026-10-26T19:05:00Z"));
    expect(due).toEqual([{ kind: "daily", slotKey: "daily:2026-10-26:20:00", date: "2026-10-26" }]);
  });

  it("does not fire on weekdays the user turned off", () => {
    // Saturday 31 Oct 2026 20:00 Berlin
    expect(dueReminders(base, "Europe/Berlin", new Date("2026-10-31T19:00:00Z"))).toEqual([]);
  });

  it("does not fire when the type is disabled", () => {
    const off = { ...base, daily_enabled: false };
    expect(dueReminders(off, "Europe/Berlin", new Date("2026-10-26T19:00:00Z"))).toEqual([]);
  });

  it("fires the weekly review reminder once on the chosen day and time", () => {
    // Sunday 1 Nov 2026 18:00 Berlin = 17:00 UTC
    const due = dueReminders(base, "Europe/Berlin", new Date("2026-11-01T17:10:00Z"));
    expect(due).toEqual([
      { kind: "review", slotKey: "review:2026-11-01", date: "2026-11-01", weekStart: "2026-10-26" },
    ]);
  });

  it("stays quiet when nothing is open", () => {
    expect(dailyMessage(0, 3)).toBeNull();
    expect(dailyMessage(0, 0)).toBeNull();
    expect(dailyMessage(2, 3)).toBe("2 of 3 routines still open today.");
  });
});
