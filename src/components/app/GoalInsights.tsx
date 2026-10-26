import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Heatmap, TrendChart, heatmapRange } from "@/components/app/charts";
import { rangeLogsQuery } from "@/lib/services/logs";
import type { GoalWithModules } from "@/lib/services/goals";
import { goalConsistency } from "@/lib/calc/consistency";
import { dailySuccessCounts, lastWeekStarts, weeklyConsistencySeries } from "@/lib/calc/trends";
import { weekStart, type IsoDate } from "@/lib/date/local-date";

/** Goal detail visuals: 26-week heatmap, 12-week trend, recent pace vs target. */
export function GoalInsights({
  userId,
  goal,
  today,
  threshold,
  elapsed,
}: {
  userId: string;
  goal: GoalWithModules;
  today: IsoDate;
  threshold: number;
  elapsed: number | null;
}) {
  const { from, to } = heatmapRange(today, 26);
  const { data } = useQuery(rangeLogsQuery(userId, from, to));
  const ids = useMemo(() => new Set(goal.modules.map((m) => m.id)), [goal.modules]);
  const logs = useMemo(() => (data ?? []).filter((l) => ids.has(l.module_id)), [data, ids]);
  const heat = useMemo(() => dailySuccessCounts(logs, from, to), [logs, from, to]);
  const trend = useMemo(
    () => weeklyConsistencySeries(goal.modules, logs, lastWeekStarts(weekStart(today), 12)),
    [goal.modules, logs, today],
  );
  // Recent pace: average of the last 4 complete weeks that had a schedule.
  const recent = goalConsistency(trend.slice(-5, -1).map((t) => t.value));

  return (
    <div className="mt-8 space-y-8">
      <section aria-labelledby="pace-h" className="grid gap-4 sm:grid-cols-3">
        <h2 id="pace-h" className="sr-only">
          Pace
        </h2>
        <PaceStat label="Recent pace (4 wks)" value={recent === null ? "—" : `${Math.round(Math.min(1, recent) * 100)}%`} />
        <PaceStat label="Target" value={`${Math.round(threshold * 100)}%`} />
        <PaceStat label="Time elapsed" value={elapsed === null ? "No deadline" : `${Math.round(elapsed * 100)}%`} />
        <p className="border-l-2 pl-2 text-[11px] uppercase tracking-[0.1em] text-muted-foreground sm:col-span-3">
          {recent === null
            ? "Pace appears after a full week of check-ins."
            : recent >= threshold
              ? "Your recent pace meets the target."
              : "Recent pace is under target."}{" "}
          Time elapsed is not a measure of completion.
        </p>
      </section>

      <section aria-labelledby="heat-h">
        <h2 id="heat-h" className="mb-3 text-sm font-medium">
          Last 26 weeks
        </h2>
        <div className="overflow-x-auto">
          <Heatmap days={heat} today={today} cell={12} gap={3} label="Check-ins, last 26 weeks" />
        </div>
      </section>

      <section aria-labelledby="gtrend-h">
        <h2 id="gtrend-h" className="mb-2 text-sm font-medium">
          Consistency trend
        </h2>
        <TrendChart data={trend} threshold={threshold} />
        <p className="mt-1 text-xs text-muted-foreground">Past weeks estimated from current schedules.</p>
      </section>
    </div>
  );
}

function PaceStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="num">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}
