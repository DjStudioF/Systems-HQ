import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { PageContainer } from "@/components/app/AppShell";
import { GoalCard } from "@/components/app/GoalCard";
import { EmptyState, LoadingRows } from "@/components/app/States";
import { Button } from "@/components/ui/button";
import { goalsQuery } from "@/lib/services/goals";
import { profileQuery } from "@/lib/services/profile";
import { localToday, weekStart } from "@/lib/date/local-date";
import { rangeLogsQuery } from "@/lib/services/logs";
import { heatmapRange } from "@/components/app/charts";
import { dailySuccessCounts, weeklyConsistencySeries } from "@/lib/calc/trends";
import type { GoalWithModules } from "@/lib/services/goals";

export const Route = createFileRoute("/_authenticated/goals/")({
  head: () => ({
    meta: [
      { title: "Goals · Systems HQ" },
      { name: "description", content: "Your goals and the routines that serve them." },
      { property: "og:title", content: "Goals · Systems HQ" },
      { property: "og:description", content: "Your goals and the routines that serve them." },
    ],
  }),
  component: GoalsPage,
});

function GoalsPage() {
  const { user } = Route.useRouteContext();
  const { data: profile } = useQuery(profileQuery(user.id));
  const goals = useQuery(goalsQuery(user.id));
  const [showArchived, setShowArchived] = useState(false);
  const today = localToday(profile?.timezone ?? "UTC", new Date());
  const { from, to } = heatmapRange(today, 12);
  const { data: logs } = useQuery(rangeLogsQuery(user.id, from, to));
  const stats = useMemo(() => {
    const map = new Map<
      string,
      { consistency: number | null; heat: ReturnType<typeof dailySuccessCounts> }
    >();
    for (const g of goals.data ?? []) {
      const ids = new Set(g.modules.map((m) => m.id));
      const mine = (logs ?? []).filter((l) => ids.has(l.module_id));
      map.set(g.id, {
        consistency: weeklyConsistencySeries(g.modules, mine, [weekStart(today)])[0]?.value ?? null,
        heat: dailySuccessCounts(mine, from, to),
      });
    }
    return map;
  }, [goals.data, logs, today, from, to]);
  const card = (g: GoalWithModules) => (
    <GoalCard
      key={g.id}
      goal={g}
      today={today}
      consistency={stats.get(g.id)?.consistency ?? null}
      heat={stats.get(g.id)?.heat ?? []}
    />
  );

  if (goals.isPending)
    return (
      <PageContainer>
        <LoadingRows />
      </PageContainer>
    );

  const all = goals.data ?? [];
  const active = all.filter((g) => g.lifecycle !== "archived");
  const archived = all.filter((g) => g.lifecycle === "archived");

  return (
    <PageContainer>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Goals</h1>
        <Button asChild>
          <Link to="/goals/new">
            <Plus /> New goal
          </Link>
        </Button>
      </div>

      <div className="mt-6 space-y-4">
        {active.length === 0 ? (
          <EmptyState title="No goals yet.">
            A goal is something important to achieve or sustain. Routines are the repeatable actions
            that serve it.{" "}
            <Link
              to="/goals/new"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Create your first goal
            </Link>
            .
          </EmptyState>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">{active.map(card)}</div>
        )}
      </div>

      {archived.length > 0 && (
        <div className="mt-10">
          <Button variant="ghost" size="sm" onClick={() => setShowArchived((v) => !v)}>
            {showArchived ? "Hide" : "Show"} archived ({archived.length})
          </Button>
          {showArchived && <div className="mt-3 space-y-4 opacity-75">{archived.map(card)}</div>}
        </div>
      )}
    </PageContainer>
  );
}
