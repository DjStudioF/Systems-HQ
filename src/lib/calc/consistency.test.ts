import { describe, expect, it } from "vitest";
import {
  goalConsistency,
  isOnTrack,
  moduleRatio,
  moduleTarget,
  timeElapsed,
} from "./consistency";

describe("moduleTarget", () => {
  it("is the count of selected days, never prorated", () => {
    expect(moduleTarget([1, 3, 5])).toBe(3);
    expect(moduleTarget([])).toBe(0);
    expect(moduleTarget([1, 2, 3, 4, 5, 6, 7])).toBe(7);
  });
});

describe("moduleRatio", () => {
  it("is successes over target, capped at 1", () => {
    expect(moduleRatio(2, [1, 3, 5])).toBeCloseTo(2 / 3);
    expect(moduleRatio(5, [1, 3, 5])).toBe(1);
  });
  it("is null when there is no schedule (no division by zero)", () => {
    expect(moduleRatio(0, [])).toBeNull();
    expect(moduleRatio(3, [])).toBeNull();
  });
});

describe("goalConsistency", () => {
  it("is the unweighted mean of eligible module ratios", () => {
    // 1/1 and 1/3 => (1 + 1/3) / 2, not (1+1)/(1+3)
    expect(goalConsistency([1, 1 / 3])).toBeCloseTo(2 / 3);
  });
  it("excludes modules with no schedule", () => {
    expect(goalConsistency([null, 0.5])).toBe(0.5);
  });
  it("is null when no module is eligible", () => {
    expect(goalConsistency([])).toBeNull();
    expect(goalConsistency([null, null])).toBeNull();
  });
});

describe("isOnTrack", () => {
  it("compares unrounded values against the threshold (default 0.8)", () => {
    expect(isOnTrack(0.8, 0.8)).toBe(true);
    expect(isOnTrack(0.7999, 0.8)).toBe(false);
    expect(isOnTrack(null, 0.8)).toBe(false);
  });
});

describe("timeElapsed", () => {
  it("is calendar-day based and clamped to 0–1", () => {
    expect(timeElapsed("2026-10-01", "2026-10-11", "2026-10-06")).toBeCloseTo(0.5);
    expect(timeElapsed("2026-10-01", "2026-10-11", "2026-09-01")).toBe(0);
    expect(timeElapsed("2026-10-01", "2026-10-11", "2026-12-01")).toBe(1);
  });
  it("is null without a deadline", () => {
    expect(timeElapsed("2026-10-01", null, "2026-10-06")).toBeNull();
  });
  it("handles a zero-length span", () => {
    expect(timeElapsed("2026-10-01", "2026-10-01", "2026-10-01")).toBe(1);
    expect(timeElapsed("2026-10-01", "2026-10-01", "2026-09-30")).toBe(0);
  });
});
