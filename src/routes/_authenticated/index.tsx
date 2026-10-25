import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { WifiOff } from "lucide-react";
import { PageContainer } from "@/components/app/AppShell";
import { EmptyState } from "@/components/app/States";
import { GoalCard } from "@/components/app/GoalCard";
import { MottoEditor } from "@/components/app/MottoEditor";
import { TodaySection } from "@/components/app/TodaySection";
import { GoalWeekGroup } from "@/components/app/GoalWeekGroup";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { profileQuery } from "@/lib/services/profile";
import { goalsQuery, type GoalWithModules } from "@/lib/services/goals";
import { weekLogsQuery, type Log } from "@/lib/services/logs";
import {
  countSuccesses,
  goalConsistency,
  moduleRatio,
  type DailyStatus,
} from "@/lib/calc/consistency";
import { addDays, formatIsoDate, localToday, weekStart, type IsoDate } from "@/lib/date/local-date";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Dashboard · Systems HQ" },
      {
        name: "description",
        content: "Today's routines, this week's consistency, goals and weekly review.",
      },
      { property: "og:title", content: "Dashboard · Systems HQ" },
      {
        property: "og:description",
        content: "Today's routines, this week's consistency, goals and weekly review.",
      },
    ],
  }),
  component: Dashboard,
});

const HOW_IT_WORKS = [
  "Goals define the direction; modules define the repeatable actions.",
  "Each day, mark a routine Done, Minimum, or Skipped.",
  "Done and Minimum both count; each routine can earn one completion per day.",
  "Weekly consistency measures follow-through; time elapsed does not measure goal completion.",
  "Review weekly and keep, tweak, or drop what is not working.",
];

/** Re-reads the local date on focus/visibility so an idle tab rolls over at midnight. */
function useLocalToday(tz: string) {
  const [today, setToday] = useState(() => localToday(tz, new Date()));
  useEffect(() => {
    const check = () => setToday(localToday(tz, new Date()));
    check();
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    const t = window.setInterval(check, 60_000);
    return () => {
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
      window.clearInterval(t);
    };
  }, [tz]);
  return today;
}

/** Tracks connectivity so the dashboard can switch to read-only when offline. */
function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

/** Weekly consistency for one goal from this week's logs. Null when nothing is scheduled. */
function weekConsistency(goal: GoalWithModules, logs: Log[]): number | null {
  const ratios = goal.modules
    .filter((m) => !m.archived_at)
    .map((m) => {
      const statuses: DailyStatus[] = logs.filter((l) => l.module_id === m.id).map((l) => l.status);
      return moduleRatio(countSuccesses(statuses), m.days);
    });
  return goalConsistency(ratios);
}

function Dashboard() {
  const { user } = Route.useRouteContext();
  const { data: profile } = useQuery(profileQuery(user.id));
  const { data: goals } = useQuery(goalsQuery(user.id));
  const tz = profile?.timezone ?? "UTC";
  const today = useLocalToday(tz);
  const mon = weekStart(today);
  const sun = addDays(mon, 6);
  const online = useOnline();
  const { data: weekLogs } = useQuery(weekLogsQuery(user.id, mon));
  const logs = useMemo(() => weekLogs ?? [], [weekLogs]);

  if (!profile) return null;
  const activeGoals = (goals ?? []).filter((g) => g.lifecycle !== "archived");
  const hasGoals = activeGoals.length > 0;
  const goalsWithRoutines = activeGoals.filter((g) => g.modules.some((m) => !m.archived_at));
  const threshold = profile.consistency_threshold;

  return (
    <PageContainer>
      <header className="flex flex-col gap-2 border-b pb-6">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <p tabIndex={0} className="w-fit text-sm text-muted-foreground">
                {formatIsoDate(today)} <span className="text-xs">· {tz.replace(/_/g, " ")}</span>
              </p>
            </TooltipTrigger>
            <TooltipContent>
              Dates follow your saved timezone ({tz}). Change it in Settings.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <h1 className="text-3xl font-semibold tracking-tight">
          {profile.display_name ? `Hi, ${profile.display_name}` : "Your systems"}
        </h1>
        <MottoEditor userId={user.id} motto={profile.motto} />
      </header>

      {!online && (
        <div
          role="status"
          className="mt-6 flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground"
        >
          <WifiOff className="size-4 shrink-0" aria-hidden="true" />
          You're offline — showing your saved data. Check-ins are disabled until you reconnect.
        </div>
      )}

      <div className="mt-8 space-y-12">
        <Section id="today" title="Today">
          {hasGoals ? (
            <TodaySection
              userId={user.id}
              goals={activeGoals}
              logs={logs}
              today={today}
              timezone={tz}
              online={online}
            />
          ) : (
            <EmptyState title="Nothing to check in yet.">
              Create a goal and routine first — nothing has been added for you.
            </EmptyState>
          )}
        </Section>

        <Section
          id="week"
          title="This week"
          meta={`${formatIsoDate(mon, { month: "short", day: "numeric" })} – ${formatIsoDate(sun, { month: "short", day: "numeric" })}`}
        >
          {goalsWithRoutines.length === 0 ? (
            <EmptyState title="No routines yet.">
              Weekly progress appears once you have routines.
            </EmptyState>
          ) : (
            <div className="space-y-4">
              {goalsWithRoutines.map((g) => (
                <GoalWeekGroup
                  key={g.id}
                  goal={g}
                  logs={logs}
                  weekStart={mon}
                  today={today}
                  threshold={threshold}
                />
              ))}
            </div>
          )}
        </Section>

        <Section id="goals" title="Goals">
          {activeGoals.length === 0 ? (
            <EmptyState title="No goals yet.">
              <Link
                to="/goals/new"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Create your first goal
              </Link>{" "}
              and the routines that serve it.
            </EmptyState>
          ) : (
            <div className="space-y-4">
              {activeGoals.map((g) => (
                <GoalCard
                  key={g.id}
                  goal={g}
                  today={today}
                  consistency={weekConsistency(g, logs)}
                  threshold={threshold}
                />
              ))}
              <Link
                to="/goals"
                className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                View all goals
              </Link>
            </div>
          )}
        </Section>

        <Section id="review" title="Weekly review">
          <EmptyState title="No reviews yet.">
            Weekly reviews arrive in a later build stage.
          </EmptyState>
        </Section>

        <Section id="how" title="How this works">
          <Accordion type="single" collapsible className="surface px-4">
            <AccordionItem value="how" className="border-none">
              <AccordionTrigger className="text-base">
                Five ideas behind Systems HQ
              </AccordionTrigger>
              <AccordionContent>
                <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
                  {HOW_IT_WORKS.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ol>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Section>
      </div>
    </PageContainer>
  );
}

function Section({
  id,
  title,
  meta,
  children,
}: {
  id: string;
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-20">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 id={`${id}-h`} className="text-xl font-semibold tracking-tight">
          {title}
        </h2>
        {meta && <p className="text-sm text-muted-foreground">{meta}</p>}
      </div>
      {children}
    </section>
  );
}
