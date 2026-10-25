import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { PageContainer } from "@/components/app/AppShell";
import { GoalCard } from "@/components/app/GoalCard";
import { EmptyState, LoadingRows } from "@/components/app/States";
import { Button } from "@/components/ui/button";
import { goalsQuery } from "@/lib/services/goals";
import { profileQuery } from "@/lib/services/profile";
import { localToday } from "@/lib/date/local-date";

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
          active.map((g) => <GoalCard key={g.id} goal={g} today={today} />)
        )}
      </div>

      {archived.length > 0 && (
        <div className="mt-10">
          <Button variant="ghost" size="sm" onClick={() => setShowArchived((v) => !v)}>
            {showArchived ? "Hide" : "Show"} archived ({archived.length})
          </Button>
          {showArchived && (
            <div className="mt-3 space-y-4 opacity-75">
              {archived.map((g) => (
                <GoalCard key={g.id} goal={g} today={today} />
              ))}
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}
