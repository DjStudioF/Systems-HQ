import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { WifiOff, X } from "lucide-react";
import { PageContainer } from "@/components/app/AppShell";
import { EmptyState, FullPageLoading } from "@/components/app/States";
import { MottoEditor } from "@/components/app/MottoEditor";
import { TodaySection } from "@/components/app/TodaySection";
import { profileQuery } from "@/lib/services/profile";
import { goalsQuery } from "@/lib/services/goals";
import { weekLogsQuery } from "@/lib/services/logs";
import { reviewsQuery } from "@/lib/services/reviews";
import { isoWeekday, weekStart } from "@/lib/date/local-date";
import { useLocalToday } from "@/lib/date/use-local-today";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Today · Systems HQ" },
      { name: "description", content: "Check in on today's routines in one tap each." },
      { property: "og:title", content: "Today · Systems HQ" },
      { property: "og:description", content: "Check in on today's routines in one tap each." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TodayPage,
});

/** Tracks connectivity so check-ins switch to read-only when offline. */
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

function TodayPage() {
  const { user } = Route.useRouteContext();
  const { data: profile } = useQuery(profileQuery(user.id));
  const { data: goals } = useQuery(goalsQuery(user.id));
  const tz = profile?.timezone ?? "UTC";
  const today = useLocalToday(tz);
  const online = useOnline();
  const { data: weekLogs } = useQuery(weekLogsQuery(user.id, weekStart(today)));
  const logs = useMemo(() => weekLogs ?? [], [weekLogs]);

  const { data: reviews } = useQuery(reviewsQuery(user.id));
  const [hideReview, setHideReview] = useState(false);
  const reviewDue =
    isoWeekday(today) === 7 &&
    !reviews?.some((r) => r.week_start === weekStart(today) && r.state === "submitted");

  if (!profile || !goals) return <FullPageLoading />;
  const activeGoals = (goals ?? []).filter((g) => g.lifecycle !== "archived");

  return (
    <PageContainer>
      <header className="flex flex-col gap-2 pb-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {profile.display_name ? `Hi, ${profile.display_name}` : "Today"}
        </h1>
        <MottoEditor userId={user.id} motto={profile.motto} />
      </header>

      {!online && (
        <div
          role="status"
          className="mb-6 flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground"
        >
          <WifiOff className="size-4 shrink-0" aria-hidden="true" />
          You're offline — showing your saved data. Check-ins are disabled until you reconnect.
        </div>
      )}

      {reviewDue && !hideReview && activeGoals.length > 0 && (
        <div
          role="status"
          className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary-soft px-4 py-3 text-sm text-primary-soft-foreground"
        >
          <span>
            It's Sunday — time for the weekly review.{" "}
            <Link to="/review" className="font-medium underline underline-offset-4">
              Open review
            </Link>
          </span>
          <button
            type="button"
            aria-label="Dismiss"
            className="tap flex items-center justify-center"
            onClick={() => setHideReview(true)}
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {activeGoals.length ? (
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
          <Link
            to="/goals/new"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Create your first goal
          </Link>{" "}
          and the routines that serve it — nothing has been added for you.
        </EmptyState>
      )}
    </PageContainer>
  );
}
