import { describe, expect, it } from "vitest";
import { weeklyStatusCounts, dailySuccessCounts, lastWeekStarts, weekDelta, weeklyConsistencySeries } from "./trends";

const mod = { id: "m", days: [1, 3, 5], created_at: "2026-10-01T00:00:00Z", archived_at: null };

describe("trends", () => {
  it("lists the last N Mondays oldest first", () => {
    expect(lastWeekStarts("2026-10-26", 3)).toEqual(["2026-10-12", "2026-10-19", "2026-10-26"]);
  });

  it("week consistency uses full-week target and minimum counts", () => {
    const logs = [
      { module_id: "m", log_date: "2026-10-19", status: "done" as const },
      { module_id: "m", log_date: "2026-10-21", status: "minimum" as const },
      { module_id: "m", log_date: "2026-10-23", status: "skipped" as const },
    ];
    const [w] = weeklyConsistencySeries([mod], logs, ["2026-10-19"]);
    expect(w?.value).toBeCloseTo(2 / 3);
  });

  it("weeks before a routine existed have no schedule (null)", () => {
    const [w] = weeklyConsistencySeries([mod], [], ["2026-09-21"]);
    expect(w?.value).toBeNull();
  });

  it("delta is null when a week has no schedule", () => {
    expect(weekDelta(0.8, null)).toBeNull();
    expect(weekDelta(0.8, 0.5)).toBeCloseTo(0.3);
  });

  it("heatmap counts done+minimum, separates skipped", () => {
    const d = dailySuccessCounts(
      [
        { module_id: "m", log_date: "2026-10-01", status: "done" },
        { module_id: "n", log_date: "2026-10-01", status: "skipped" },
      ],
      "2026-10-01",
      "2026-10-02",
    );
    expect(d).toEqual([
      { date: "2026-10-01", count: 1, skipped: 1 },
      { date: "2026-10-02", count: 0, skipped: 0 },
    ]);
  });

  it("weekly status counts split by status within the week only", () => {
    const [w] = weeklyStatusCounts(
      [
        { module_id: "m", log_date: "2026-10-19", status: "done" },
        { module_id: "m", log_date: "2026-10-20", status: "minimum" },
        { module_id: "m", log_date: "2026-10-26", status: "skipped" },
      ],
      ["2026-10-19"],
    );
    expect(w).toEqual({ week: "2026-10-19", done: 1, minimum: 1, skipped: 0 });
  });
});
