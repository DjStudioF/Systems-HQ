import { countSuccesses, goalConsistency, moduleRatio, type DailyStatus } from "./consistency";
import { addDays, daysBetween, type IsoDate } from "@/lib/date/local-date";

type ModuleLike = { id: string; days: number[]; created_at: string; archived_at: string | null };
type LogLike = { module_id: string; log_date: string; status: DailyStatus };

/** Mondays of the last `n` weeks ending with `currentMonday`, oldest first. */
export function lastWeekStarts(currentMonday: IsoDate, n: number): IsoDate[] {
  return Array.from({ length: n }, (_, i) => addDays(currentMonday, (i - n + 1) * 7));
}

/**
 * Combined (unweighted) consistency per week using CURRENT schedules — an
 * estimate for past weeks, never a reconstruction of historic targets.
 * Modules created after a week ended are excluded from that week. Null = no schedule.
 */
export function weeklyConsistencySeries(
  modules: ModuleLike[],
  logs: LogLike[],
  weekStarts: IsoDate[],
): { week: IsoDate; value: number | null }[] {
  return weekStarts.map((week) => {
    const end = addDays(week, 6);
    const ratios = modules
      .filter((m) => !m.archived_at && m.created_at.slice(0, 10) <= end)
      .map((m) => {
        const s = logs
          .filter((l) => l.module_id === m.id && l.log_date >= week && l.log_date <= end)
          .map((l) => l.status);
        return moduleRatio(countSuccesses(s), m.days);
      });
    return { week, value: goalConsistency(ratios) };
  });
}

/** Signed change between two consistency values; null if either is missing. */
export function weekDelta(current: number | null, previous: number | null): number | null {
  return current === null || previous === null ? null : current - previous;
}

/** Successful check-ins (done/minimum) per day for a heatmap, `from`..`to` inclusive. */
export function dailySuccessCounts(
  logs: LogLike[],
  from: IsoDate,
  to: IsoDate,
): { date: IsoDate; count: number; skipped: number }[] {
  const n = daysBetween(from, to) + 1;
  return Array.from({ length: Math.max(0, n) }, (_, i) => {
    const date = addDays(from, i);
    const day = logs.filter((l) => l.log_date === date);
    return {
      date,
      count: day.filter((l) => l.status !== "skipped").length,
      skipped: day.filter((l) => l.status === "skipped").length,
    };
  });
}
