import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Heatmap, heatmapRange } from "@/components/app/charts";
import { Skeleton } from "@/components/ui/skeleton";
import { rangeLogsQuery } from "@/lib/services/logs";
import { dailySuccessCounts, lastWeekStarts, weeklyStatusCounts } from "@/lib/calc/trends";
import { formatIsoDate, weekStart, type IsoDate } from "@/lib/date/local-date";

/** History visuals: 52-week heatmap + stacked done/minimum/skipped per week (last 12). */
export function HistoryOverview({ userId, today }: { userId: string; today: IsoDate }) {
  const { from, to } = heatmapRange(today, 52);
  const { data, isPending } = useQuery(rangeLogsQuery(userId, from, to));
  const logs = useMemo(() => data ?? [], [data]);
  const heat = useMemo(() => dailySuccessCounts(logs, from, to), [logs, from, to]);
  const bars = useMemo(
    () =>
      weeklyStatusCounts(logs, lastWeekStarts(weekStart(today), 12)).map((w) => ({
        ...w,
        label: formatIsoDate(w.week, { month: "short", day: "numeric" }),
      })),
    [logs, today],
  );

  if (isPending)
    return (
      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]" aria-busy="true">
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
      </div>
    );

  if (logs.length === 0)
    return (
      <div className="mt-6 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Your year of check-ins will fill in here, one square per day.
      </div>
    );

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
      <section aria-labelledby="yr-h" className="rounded-xl border bg-surface-1 p-4">
        <h2 id="yr-h" className="mb-3 text-sm font-medium">
          Last 52 weeks
        </h2>
        <div className="overflow-x-auto pb-1">
          <Heatmap
            days={heat}
            today={today}
            cell={10}
            gap={2}
            label="Check-ins over the last year"
          />
        </div>
      </section>
      <section aria-labelledby="wk-h" className="rounded-xl border bg-surface-1 p-4">
        <h2 id="wk-h" className="mb-1 text-sm font-medium">
          Week shape
        </h2>
        <p className="mb-2 text-xs text-muted-foreground">Done · minimum · skipped per week</p>
        <div className="h-28" role="img" aria-label="Done, minimum and skipped per week">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <XAxis dataKey="label" hide />
              <Tooltip
                cursor={{ fill: "var(--color-surface-2)" }}
                contentStyle={{
                  background: "var(--color-popover)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--color-foreground)",
                }}
              />
              <Bar
                dataKey="done"
                name="Done"
                stackId="s"
                fill="var(--color-state-done)"
                isAnimationActive={false}
              />
              <Bar
                dataKey="minimum"
                name="Minimum"
                stackId="s"
                fill="var(--color-state-minimum)"
                isAnimationActive={false}
              />
              <Bar
                dataKey="skipped"
                name="Skipped"
                stackId="s"
                fill="var(--color-state-skipped)"
                radius={[2, 2, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
