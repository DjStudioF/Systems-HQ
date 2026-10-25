/**
 * Derived-metric calculations. Pure functions with an injected clock —
 * never read `new Date()` here; callers pass `today` as a local ISO date.
 * Rules from the product spec:
 * - Weekly target is the number of selected days. Never prorated.
 * - Done and Minimum each earn 1; Skipped earns 0; no log ≠ Skipped.
 * - Module week ratio = min(successes / target, 1); target 0 => null ("No schedule").
 * - Goal consistency = unweighted mean of eligible module ratios, compared
 *   against the threshold using unrounded values.
 * - Time elapsed is calendar-day based, clamped 0–1, and is NOT completion.
 */
import { daysBetween, type IsoDate } from "@/lib/date/local-date";

/** Daily check-in status. Done and Minimum each earn one success. */
export type DailyStatus = "done" | "minimum" | "skipped";

/** Weekly target = number of selected days (full week, never prorated). */
export function moduleTarget(days: number[]): number {
  return days.length;
}

/**
 * Successes in a set of daily statuses: Done and Minimum each earn 1;
 * Skipped and days with no log earn 0.
 */
export function countSuccesses(statuses: DailyStatus[]): number {
  return statuses.filter((s) => s === "done" || s === "minimum").length;
}

/** Week ratio for one module. Null when the module has no scheduled days. */
export function moduleRatio(successes: number, days: number[]): number | null {
  const target = moduleTarget(days);
  if (target === 0) return null;
  return Math.min(successes / target, 1);
}

/**
 * Unweighted mean of eligible module ratios. Modules with no schedule (null
 * ratio) are excluded. Null when no module is eligible.
 */
export function goalConsistency(ratios: (number | null)[]): number | null {
  const eligible = ratios.filter((r): r is number => r !== null);
  if (eligible.length === 0) return null;
  return eligible.reduce((a, b) => a + b, 0) / eligible.length;
}

/** On-track uses the unrounded consistency value. Null consistency is never on track. */
export function isOnTrack(consistency: number | null, threshold: number): boolean {
  return consistency !== null && consistency >= threshold;
}

/**
 * Fraction of the goal's calendar span that has elapsed, clamped to 0–1.
 * Null when the goal has no deadline. This is time, not outcome completion.
 */
export function timeElapsed(
  startDate: IsoDate,
  deadline: IsoDate | null,
  today: IsoDate,
): number | null {
  if (!deadline) return null;
  const span = daysBetween(startDate, deadline);
  if (span <= 0) return today >= deadline ? 1 : 0;
  const elapsed = daysBetween(startDate, today);
  return Math.min(Math.max(elapsed / span, 0), 1);
}
