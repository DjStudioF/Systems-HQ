import { Link } from "@tanstack/react-router";
import { Ring } from "@/components/app/viz";
import { Heatmap } from "@/components/app/charts";
import { timeElapsed } from "@/lib/calc/consistency";
import type { GoalWithModules } from "@/lib/services/goals";
import { formatIsoDate, type IsoDate } from "@/lib/date/local-date";

export function goalStatusLabel(g: GoalWithModules) {
  if (g.lifecycle === "archived") return "Archived";
  if (g.lifecycle === "completed") return "Completed";
  return g.mode === "maintain" ? "Maintain" : "Active";
}

/**
 * Calm, typographic goal card: name, why, small consistency ring, routine
 * count + deadline, 12-week mini heatmap. Time elapsed is never completion.
 */
export function GoalCard({
  goal,
  today,
  consistency,
  heat,
}: {
  goal: GoalWithModules;
  today: IsoDate;
  consistency: number | null;
  heat: { date: IsoDate; count: number; skipped: number }[];
}) {
  const n = goal.modules.filter((m) => !m.archived_at).length;
  const elapsed = timeElapsed(goal.start_date, goal.deadline, today);
  const pct = consistency === null ? null : Math.round(Math.min(1, consistency) * 100);

  const archived = goal.lifecycle === "archived";
  return (
    <Link
      to="/goals/$goalId"
      params={{ goalId: goal.id }}
      search={{ first: false }}
      className={
        "group flex h-full flex-col rounded-2xl border bg-surface-1 p-6 transition-colors duration-[var(--motion-fast)] hover:border-foreground/20 " +
        (archived ? "opacity-60" : "")
      }
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {goalStatusLabel(goal)}
          </p>
          <h3 className="mt-1.5 text-2xl font-semibold leading-tight tracking-tight">
            {goal.name}
          </h3>
          {goal.why && (
            <p className="mt-1.5 line-clamp-1 text-sm text-muted-foreground">{goal.why}</p>
          )}
        </div>
        <div className="flex flex-col items-center gap-1">
          <Ring
            value={consistency}
            size={44}
            stroke={4}
            label={pct === null ? "No schedule this week" : `${pct}% consistency this week`}
          >
            {pct === null ? "—" : pct}
          </Ring>
          <span className="text-[10px] text-muted-foreground">this week</span>
        </div>
      </div>

      <div className="mt-5 space-y-3 border-t pt-4 ">
        <p className="num text-xs text-muted-foreground">
          {n === 0 ? "No routines yet" : `${n} ${n === 1 ? "routine" : "routines"}`} ·{" "}
          {goal.deadline
            ? `Deadline ${formatIsoDate(goal.deadline, { month: "short", day: "numeric", year: "numeric" })}`
            : "No deadline set"}
          {elapsed !== null && ` · ${Math.round(elapsed * 100)}% of time elapsed`}
        </p>
        {elapsed !== null && (
          <p className="border-l-2 pl-2 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
            Time elapsed — not a measure of completion
          </p>
        )}
        <div className="flex items-end justify-between gap-3 overflow-hidden">
          <Heatmap
            days={heat}
            today={today}
            cell={8}
            gap={2}
            label={`${goal.name}: last 12 weeks`}
          />
          <span className="shrink-0 text-[10px] text-muted-foreground">12 weeks</span>
        </div>
      </div>
    </Link>
  );
}
