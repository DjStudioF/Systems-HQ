import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageContainer } from "@/components/app/AppShell";
import { GoalForm } from "@/components/app/GoalForm";
import { ErrorState, FullPageLoading } from "@/components/app/States";
import { goalKeys, goalQuery, updateGoal } from "@/lib/services/goals";

export const Route = createFileRoute("/_authenticated/goals/$goalId_/edit")({
  head: () => ({
    meta: [
      { title: "Edit goal · Systems HQ" },
      { name: "description", content: "Edit a goal." },
      { property: "og:title", content: "Edit goal · Systems HQ" },
      { property: "og:description", content: "Edit a goal." },
    ],
  }),
  component: EditGoalPage,
});

function EditGoalPage() {
  const { user } = Route.useRouteContext();
  const { goalId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const goal = useQuery(goalQuery(user.id, goalId));

  const save = useMutation({
    mutationFn: updateGoal.bind(null, user.id, goalId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: goalKeys.list(user.id) });
      qc.invalidateQueries({ queryKey: goalKeys.detail(user.id, goalId) });
      toast.success("Goal saved");
      navigate({ to: "/goals/$goalId", params: { goalId }, search: { first: false } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (goal.isPending) return <FullPageLoading />;
  if (goal.isError)
    return (
      <PageContainer>
        <ErrorState message={goal.error.message} onRetry={() => goal.refetch()} />
      </PageContainer>
    );

  const g = goal.data;
  return (
    <PageContainer>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Edit goal</h1>
      <div className="mt-6">
        <GoalForm
          initial={{
            name: g.name,
            why: g.why,
            mode: g.mode,
            start_date: g.start_date,
            deadline: g.deadline,
            outcome_notes: g.outcome_notes,
          }}
          submitting={save.isPending}
          submitLabel="Save goal"
          onSubmit={(v) => save.mutate(v)}
          onCancel={() =>
            navigate({ to: "/goals/$goalId", params: { goalId }, search: { first: false } })
          }
        />
      </div>
    </PageContainer>
  );
}
