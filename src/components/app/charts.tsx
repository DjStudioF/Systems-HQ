import { memo } from "react";
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { addDays, formatIsoDate, isoWeekday, type IsoDate } from "@/lib/date/local-date";
import { cn } from "@/lib/utils";

/** Consistency trend (0..1) with a dashed target line. Styled only with tokens. */
export const TrendChart = memo(function TrendChart({
  data,
  threshold,
  height = 160,
}: {
  data: { week: IsoDate; value: number | null }[];
  threshold: number;
  height?: number;
}) {
  const points = data.map((d) => ({
    label: formatIsoDate(d.week, { month: "short", day: "numeric" }),
    pct: d.value === null ? null : Math.round(Math.min(1, d.value) * 100),
  }));
  if (!points.some((p) => p.pct !== null))
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground"
        style={{ height }}
      >
        Your trend line starts after your first full week of check-ins.
      </div>
    );
  return (
    <div style={{ height }} role="img" aria-label="Weekly consistency trend">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 50, 100]}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          />
          <ReferenceLine
            y={Math.round(threshold * 100)}
            stroke="var(--color-muted-foreground)"
            strokeDasharray="4 4"
            strokeOpacity={0.6}
          />
          <Tooltip
            cursor={{ stroke: "var(--color-border)" }}
            contentStyle={{
              background: "var(--color-popover)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--color-foreground)",
            }}
            formatter={(v) => [`${v}%`, "Consistency"]}
          />
          <Line
            type="monotone"
            dataKey="pct"
            stroke="var(--color-primary)"
            strokeWidth={2}
            dot={{ r: 2.5, fill: "var(--color-primary)", strokeWidth: 0 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

/**
 * GitHub-style heatmap, columns = weeks (Mon..Sun rows). Intensity = number of
 * successful check-ins; hollow cell when only skipped. `cell` in px.
 */
export const Heatmap = memo(function Heatmap({
  days,
  today,
  cell = 10,
  gap = 2,
  label,
}: {
  days: { date: IsoDate; count: number; skipped: number }[];
  today: IsoDate;
  cell?: number;
  gap?: number;
  label: string;
}) {
  const first = days[0];
  if (!first) return null;
  const pad = isoWeekday(first.date) - 1;
  const cells: ({ date: IsoDate; count: number; skipped: number } | null)[] = [
    ...Array.from({ length: pad }, () => null),
    ...days,
  ];
  const max = Math.max(1, ...days.map((d) => d.count));
  const cols = Math.ceil(cells.length / 7);
  return (
    <div
      role="img"
      aria-label={label}
      className="grid grid-flow-col"
      style={{ gridTemplateRows: `repeat(7, ${cell}px)`, gridTemplateColumns: `repeat(${cols}, ${cell}px)`, gap }}
    >
      {cells.map((d, i) =>
        d ? (
          <span
            key={d.date}
            title={`${formatIsoDate(d.date, { month: "short", day: "numeric" })}: ${d.count} checked in${d.skipped ? `, ${d.skipped} skipped` : ""}`}
            className={cn(
              "rounded-[2px]",
              d.count === 0 && (d.skipped ? "border border-state-skipped/60" : "bg-surface-3"),
              d.date > today && "opacity-30",
              d.date === today && "ring-1 ring-foreground/40",
            )}
            style={
              d.count > 0
                ? {
                    background: `color-mix(in oklab, var(--color-primary) ${35 + Math.round((d.count / max) * 65)}%, transparent)`,
                  }
                : undefined
            }
          />
        ) : (
          <span key={`pad-${i}`} />
        ),
      )}
    </div>
  );
});

export function heatmapRange(today: IsoDate, weeks: number): { from: IsoDate; to: IsoDate } {
  const mon = addDays(today, 1 - isoWeekday(today));
  return { from: addDays(mon, -(weeks - 1) * 7), to: addDays(mon, 6) };
}
