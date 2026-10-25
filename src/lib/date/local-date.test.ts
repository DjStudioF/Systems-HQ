import { describe, expect, it } from "vitest";
import { addDays, daysBetween, isoWeekday, localToday, weekStart } from "./local-date";
import { isValidTimeZone } from "./timezones";

describe("localToday", () => {
  const instant = new Date("2026-03-01T23:30:00Z");
  it("differs across significantly different timezones", () => {
    expect(localToday("America/Los_Angeles", instant)).toBe("2026-03-01");
    expect(localToday("Asia/Tokyo", instant)).toBe("2026-03-02");
  });
  it("crosses local midnight for an open tab", () => {
    expect(localToday("Europe/Berlin", new Date("2026-06-10T21:59:00Z"))).toBe("2026-06-10");
    expect(localToday("Europe/Berlin", new Date("2026-06-10T22:01:00Z"))).toBe("2026-06-11");
  });
});

describe("calendar math", () => {
  it("handles Sunday/Monday boundary", () => {
    expect(isoWeekday("2026-10-25")).toBe(7);
    expect(isoWeekday("2026-10-26")).toBe(1);
    expect(weekStart("2026-10-25")).toBe("2026-10-19");
    expect(weekStart("2026-10-26")).toBe("2026-10-26");
  });
  it("handles month/year boundary", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(weekStart("2027-01-01")).toBe("2026-12-28");
  });
  it("counts days across DST without drift", () => {
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2); // EU DST starts Mar 29
    expect(daysBetween("2026-10-24", "2026-10-26")).toBe(2);
  });
});

describe("isValidTimeZone", () => {
  it("accepts IANA zones and rejects junk", () => {
    expect(isValidTimeZone("Europe/Berlin")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });
});
