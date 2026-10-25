import { addDays, formatIsoDate, type IsoDate } from "@/lib/date/local-date";
import type { DailyStatus } from "@/lib/calc/consistency";
import { cn } from "@/lib/utils";

const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

const STATUS_LABEL: Record<DailyStatus, string> = {
  done: "Done",
  minimum: "Minimum",
  skipped: "Skipped",
};

/**
 * Seven-day strip (Mon–Sun) for one routine. Scheduled days show the logged
 * status; unscheduled days are muted; future days are dimmed. Purely
 * presentational — all dates are injected.
 */
export function WeekStrip({
  days,
  statuses,
  weekStart,
  today,
}: {
  days: number[];
  statuses: Record<IsoDate, DailyStatus>;
  weekStart: IsoDate;
  today: IsoDate;
}) {
  return (
    <div className="flex gap-1.5" role="list" aria-label="This week, Monday to Sunday">
      {WEEKDAY_LETTERS.map((letter, i) => {
        const date = addDays(weekStart, i);
        const weekday = i + 1;
        const scheduled = days.includes(weekday);
        const status = statuses[date] ?? null;
        const future = date > today;
        const label = `${formatIsoDate(date)}: ${
          status
            ? STATUS_LABEL[status]
            : scheduled
              ? future
                ? "Scheduled, upcoming"
                : "Scheduled, not logged"
              : "Not scheduled"
        }`;
        return (
          <div key={date} role="listitem" className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-medium text-muted-foreground" aria-hidden="true">
              {letter}
            </span>
            <span
              role="img"
              aria-label={label}
              title={label}
              className={cn(
                "flex size-7 items-center justify-center rounded-md text-xs font-medium",
                status === "done" && "bg-primary text-primary-foreground",
                status === "minimum" && "bg-primary-soft text-primary-soft-foreground",
                status === "skipped" && "bg-secondary text-muted-foreground",
                !status && scheduled && "border border-dashed border-input text-muted-foreground",
                !status && !scheduled && "text-muted-foreground/40",
                future && !status && "opacity-50",
              )}
            >
              {status === "done" ? "✓" : status === "minimum" ? "–" : status === "skipped" ? "×" : scheduled ? "" : "·"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
