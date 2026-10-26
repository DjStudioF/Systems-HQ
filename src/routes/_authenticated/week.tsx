import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { PageContainer } from "@/components/app/AppShell";
import { EmptyState, LoadingRows } from "@/components/app/States";
import { InfoTip } from "@/components/app/viz";
import { GoalWeekGroup } from "@/components/app/GoalWeekGroup";
import { profileQuery } from "@/lib/services/profile";
import { goalsQuery } from "@/lib/services/goals";
import { weekLogsQuery } from "@/lib/services/logs";
import { addDays, formatIsoDate, weekStart } from "@/lib/date/local-date";
import { useLocalToday } from "@/lib/date/use-local-today";

export const Route = createFileRoute("/_authenticated/week")({
  head: () => ({
    meta: [
      { title: "This week · Systems HQ" },
      { name: "description", content: "Weekly consistency per routine, Monday to Sunday." },
      { property: "og:title", content: "This week · Systems HQ" },
      { property: "og:description", content: "Weekly consistency per routine, Monday to Sunday." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WeekPage,
});

function WeekPage() {
  const { user } = Route.useRouteContext();
  const { data: profile } = useQuery(profileQuery(user.id));
  const goals = useQuery(goalsQuery(user.id));
  const today = useLocalToday(profile?.timezone ?? "UTC");
  const mon = weekStart(today);
  const { data: weekLogs } = useQuery(weekLogsQuery(user.id, mon));
  const logs = useMemo(() => weekLogs ?? [], [weekLogs]);

  if (!profile || goals.isPending)
    return (
      <PageContainer>
        <LoadingRows />
      </PageContainer>
    );
  const withRoutines = (goals.data ?? []).filter(
    (g) => g.lifecycle !== "archived" && g.modules.some((m) => !m.archived_at),
  );
  const fmt = { month: "short", day: "numeric" } as const;

  return (
    <PageContainer>
      <header className="mb-6 flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">This week</h1>
        <p className="num text-sm text-muted-foreground">
          {formatIsoDate(mon, fmt)} – {formatIsoDate(addDays(mon, 6), fmt)}
        </p>
      </header>
      <p className="mb-4 flex items-center gap-1 text-xs text-muted-foreground">
        Minimum counts as a check-in
        <InfoTip term="minimum">The smallest version of a routine. It counts toward your weekly target, same as Done.</InfoTip>
        · Below target
        <InfoTip term="below target">This week's consistency is under your threshold (default 80%) — a signal, not a failure.</InfoTip>
      </p>
      {withRoutines.length === 0 ? (
        <EmptyState title="No routines yet.">Weekly progress appears once you have routines.</EmptyState>
      ) : (
        <div className="space-y-4">
          {withRoutines.map((g) => (
            <GoalWeekGroup
              key={g.id}
              goal={g}
              logs={logs}
              weekStart={mon}
              today={today}
              threshold={profile.consistency_threshold}
            />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
