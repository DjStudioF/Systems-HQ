import { Link } from "@tanstack/react-router";
import { ProgressBar } from "@/components/app/ProgressBar";
import { timeElapsed } from "@/lib/calc/consistency";
import type { GoalWithModules } from "@/lib/services/goals";
import type { IsoDate } from "@/lib/date/local-date";

/**
 * Goal summary card. Shows time elapsed (calendar-based, never labelled as
 * completion). Weekly consistency arrives with daily logging in Stage 3.
 */
export function GoalCard({ goal, today }: { goal: GoalWithModules; today: IsoDate }) {
  const activeModules = goal.modules.filter((m) => !m.archived_at);
  const elapsed = timeElapsed(goal.start_date, goal.deadline, today);

  return (
    <Link
      to="/goals/$goalId"
      params={{ goalId: goal.id }}
      className="surface block space-y-3 p-4 transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-medium text-foreground">{goal.name}</h3>
        <span className="shrink-0 text-xs capitalize text-muted-foreground">
          {goal.mode}
          {goal.lifecycle !== "active" ? ` · ${goal.lifecycle}` : ""}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        {activeModules.length === 0
          ? "No routines yet"
          : `${activeModules.length} ${activeModules.length === 1 ? "routine" : "routines"}`}
      </p>
      <ProgressBar
        ratio={elapsed}
        label="Time elapsed"
        nullText="No deadline set"
        className="pt-1"
      />
      <p className="text-xs text-muted-foreground">Time elapsed — not a measure of completion.</p>
    </Link>
  );
}
