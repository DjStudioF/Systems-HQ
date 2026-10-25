import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageContainer } from "@/components/app/AppShell";
import { GoalForm } from "@/components/app/GoalForm";
import { createGoal, goalKeys } from "@/lib/services/goals";
import { profileQuery } from "@/lib/services/profile";
import { localToday } from "@/lib/date/local-date";

export const Route = createFileRoute("/_authenticated/goals/new")({
  head: () => ({
    meta: [
      { title: "New goal · Systems HQ" },
      { name: "description", content: "Define a goal and why it matters." },
      { property: "og:title", content: "New goal · Systems HQ" },
      { property: "og:description", content: "Define a goal and why it matters." },
    ],
  }),
  component: NewGoalPage,
});

function NewGoalPage() {
  const { user } = Route.useRouteContext();
  const { data: profile } = useQuery(profileQuery(user.id));
  const qc = useQueryClient();
  const navigate = useNavigate();

  const create = useMutation({
    mutationFn: (v: Parameters<typeof createGoal>[1]) => createGoal(user.id, v),
    onSuccess: (goal) => {
      qc.invalidateQueries({ queryKey: goalKeys.list(user.id) });
      toast.success("Goal created — now add your first routine.");
      // Onboarding step 3: a new goal goes straight to adding its first routine.
      navigate({ to: "/goals/$goalId", params: { goalId: goal.id }, search: { first: true } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <PageContainer>
      <h1 className="text-3xl font-semibold tracking-tight">New goal</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Something important to achieve or sustain. You'll add the repeatable routines next.
      </p>
      <div className="mt-6">
        <GoalForm
          initial={{
            name: "",
            why: "",
            mode: "focus",
            start_date: localToday(profile?.timezone ?? "UTC", new Date()),
            deadline: null,
            outcome_notes: "",
          }}
          submitting={create.isPending}
          submitLabel="Create goal"
          onSubmit={(v) => create.mutate(v)}
          onCancel={() => navigate({ to: "/goals" })}
        />
      </div>
    </PageContainer>
  );
}
