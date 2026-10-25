import { WeekStrip } from "@/components/app/WeekStrip";
import {
  countSuccesses,
  goalConsistency,
  isOnTrack,
  moduleRatio,
  moduleTarget,
  type DailyStatus,
} from "@/lib/calc/consistency";
import type { GoalWithModules } from "@/lib/services/goals";
import type { Log } from "@/lib/services/logs";
import type { IsoDate } from "@/lib/date/local-date";
import { cn } from "@/lib/utils";

/**
 * One goal's week: each active routine with its seven-day strip and
 * successes vs full-week target, plus the goal's unweighted consistency
 * compared against the threshold using unrounded values.
 */
export function GoalWeekGroup({
  goal,
  logs,
  weekStart,
  today,
  threshold,
}: {
  goal: GoalWithModules;
  logs: Log[];
  weekStart: IsoDate;
  today: IsoDate;
  threshold: number;
}) {
  const active = goal.modules.filter((m) => !m.archived_at);
  if (active.length === 0) return null;

  const rows = active.map((m) => {
    const statuses: Record<IsoDate, DailyStatus> = {};
    for (const l of logs) if (l.module_id === m.id) statuses[l.log_date] = l.status;
    const successes = countSuccesses(Object.values(statuses));
    return { module: m, statuses, successes, ratio: moduleRatio(successes, m.days) };
  });
  const consistency = goalConsistency(rows.map((r) => r.ratio));
  const onTrack = isOnTrack(consistency, threshold);

  return (
    <div className="surface space-y-4 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-medium text-foreground">{goal.name}</h3>
        <span
          className={cn(
            "shrink-0 text-xs font-medium",
            consistency === null
              ? "text-muted-foreground"
              : onTrack
                ? "text-primary"
                : "text-warning",
          )}
        >
          {consistency === null
            ? "No scheduled routines"
            : `${Math.round(consistency * 100)}% · ${onTrack ? "on track" : "below target"}`}
        </span>
      </div>
      <ul className="space-y-4">
        {rows.map(({ module, statuses, successes }) => (
          <li key={module.id} className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{module.name}</p>
              <p className="text-xs text-muted-foreground">
                {moduleTarget(module.days) === 0
                  ? "No schedule"
                  : `${successes} of ${moduleTarget(module.days)} this week`}
              </p>
            </div>
            <WeekStrip days={module.days} statuses={statuses} weekStart={weekStart} today={today} />
          </li>
        ))}
      </ul>
    </div>
  );
}
