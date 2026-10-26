import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Archive, ArchiveRestore, CheckCircle2, Pencil, Plus } from "lucide-react";
import { PageContainer } from "@/components/app/AppShell";
import { ModuleForm } from "@/components/app/ModuleForm";
import { GoalInsights } from "@/components/app/GoalInsights";
import { EmptyState, ErrorState, FullPageLoading } from "@/components/app/States";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  createModule,
  goalKeys,
  goalQuery,
  setGoalLifecycle,
  setModuleArchived,
  updateModule,
  type Module,
} from "@/lib/services/goals";
import { profileQuery } from "@/lib/services/profile";
import { timeElapsed } from "@/lib/calc/consistency";
import { formatIsoDate, localToday } from "@/lib/date/local-date";
import { DAY_LABELS, type ModuleFormValues } from "@/lib/validation/goal";

export const Route = createFileRoute("/_authenticated/goals/$goalId")({
  validateSearch: (s: Record<string, unknown>) => ({ first: s["first"] === true }),
  head: () => ({
    meta: [
      { title: "Goal · Systems HQ" },
      { name: "description", content: "Goal detail and its routines." },
      { property: "og:title", content: "Goal · Systems HQ" },
      { property: "og:description", content: "Goal detail and its routines." },
    ],
  }),
  component: GoalDetailPage,
});

function GoalDetailPage() {
  const { user } = Route.useRouteContext();
  const { goalId } = Route.useParams();
  const { first } = Route.useSearch();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: profile } = useQuery(profileQuery(user.id));
  const goal = useQuery(goalQuery(user.id, goalId));
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: goalKeys.list(user.id) });
    qc.invalidateQueries({ queryKey: goalKeys.detail(user.id, goalId) });
  };

  const lifecycle = useMutation({
    mutationFn: (l: "active" | "completed" | "archived") => setGoalLifecycle(user.id, goalId, l),
    onSuccess: (_d, l) => {
      refresh();
      toast.success(
        l === "archived"
          ? "Goal archived"
          : l === "completed"
            ? "Goal marked complete"
            : "Goal restored",
      );
      if (l === "archived") navigate({ to: "/goals" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addModule = useMutation({
    mutationFn: (v: ModuleFormValues) => createModule(user.id, goalId, v),
    onSuccess: () => {
      refresh();
      setAdding(false);
      toast.success("Routine added");
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
  const today = localToday(profile?.timezone ?? "UTC", new Date());
  const elapsed = timeElapsed(g.start_date, g.deadline, today);
  const activeModules = g.modules.filter((m) => !m.archived_at);
  const archivedModules = g.modules.filter((m) => m.archived_at);
  const isArchived = g.lifecycle === "archived";

  return (
    <PageContainer>
      <p className="text-sm text-muted-foreground">
        <Link to="/goals" className="hover:underline underline-offset-4">
          Goals
        </Link>{" "}
        / {g.name}
      </p>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{g.name}</h1>
          <p className="mt-1 text-sm capitalize text-muted-foreground">
            {g.mode} · started{" "}
            {formatIsoDate(g.start_date, { month: "short", day: "numeric", year: "numeric" })}
            {g.deadline &&
              ` · deadline ${formatIsoDate(g.deadline, { month: "short", day: "numeric", year: "numeric" })}`}
            {g.lifecycle !== "active" && ` · ${g.lifecycle}`}
          </p>
          {g.why && (
            <blockquote className="mt-5 max-w-2xl border-l-2 border-primary pl-4 text-xl leading-snug tracking-tight text-foreground/85">
              “{g.why}”
            </blockquote>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {!isArchived && (
            <Button variant="outline" asChild>
              <Link to="/goals/$goalId/edit" params={{ goalId }}>
                <Pencil /> Edit
              </Link>
            </Button>
          )}
          {g.lifecycle === "active" && (
            <Button variant="outline" onClick={() => lifecycle.mutate("completed")}>
              <CheckCircle2 /> Mark complete
            </Button>
          )}
          {isArchived ? (
            <Button variant="outline" onClick={() => lifecycle.mutate("active")}>
              <ArchiveRestore /> Restore
            </Button>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <Archive /> Archive
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Archive this goal?</AlertDialogTitle>
                  <AlertDialogDescription>
                    The goal and its routines leave your daily views. Nothing is deleted — you can
                    restore it any time.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => lifecycle.mutate("archived")}>
                    Archive
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <GoalInsights
        userId={user.id}
        goal={g}
        today={today}
        threshold={profile?.consistency_threshold ?? 0.8}
        elapsed={elapsed}
      />

      <div className="mt-10">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-tight">Routines</h2>
          {!isArchived && !adding && (
            <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
              <Plus /> Add routine
            </Button>
          )}
        </div>

        {first && activeModules.length === 0 && !adding && (
          <div className="surface mb-4 border-primary/40 p-4 text-sm">
            <p className="font-medium">Last setup step: add your first routine.</p>
            <p className="mt-1 text-muted-foreground">
              A routine is one repeatable action with a trigger, a full version, and a minimum
              version that still counts.
            </p>
            <Button size="sm" className="mt-3" onClick={() => setAdding(true)}>
              <Plus /> Add your first routine
            </Button>
          </div>
        )}

        {adding && (
          <div className="surface mb-4 p-4">
            <ModuleForm
              initial={{ name: "", trigger: "", action: "", minimum: "", days: [] }}
              submitting={addModule.isPending}
              submitLabel="Add routine"
              onSubmit={(v) => addModule.mutate(v)}
              onCancel={() => setAdding(false)}
            />
          </div>
        )}

        {activeModules.length === 0 && !adding ? (
          <EmptyState title="No routines yet.">
            Routines are the repeatable actions that serve this goal.
          </EmptyState>
        ) : (
          <div className="space-y-3">
            {activeModules.map((m) =>
              editingId === m.id ? (
                <div key={m.id} className="surface p-4">
                  <EditModuleForm
                    module={m}
                    userId={user.id}
                    onDone={() => {
                      setEditingId(null);
                      refresh();
                    }}
                  />
                </div>
              ) : (
                <ModuleRow
                  key={m.id}
                  module={m}
                  canEdit={!isArchived}
                  onEdit={() => setEditingId(m.id)}
                  onArchive={() => {
                    setModuleArchived(user.id, m.id, true)
                      .then(() => {
                        refresh();
                        toast.success("Routine archived");
                      })
                      .catch((e: Error) => toast.error(e.message));
                  }}
                />
              ),
            )}
          </div>
        )}

        {archivedModules.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              Archived routines ({archivedModules.length})
            </p>
            <div className="space-y-3 opacity-75">
              {archivedModules.map((m) => (
                <ModuleRow
                  key={m.id}
                  module={m}
                  canEdit={false}
                  onEdit={() => {}}
                  onRestore={() => {
                    setModuleArchived(user.id, m.id, false)
                      .then(() => {
                        refresh();
                        toast.success("Routine restored");
                      })
                      .catch((e: Error) => toast.error(e.message));
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}

function EditModuleForm({
  module,
  userId,
  onDone,
}: {
  module: Module;
  userId: string;
  onDone: () => void;
}) {
  const save = useMutation({
    mutationFn: (v: ModuleFormValues) => updateModule(userId, module.id, v),
    onSuccess: () => {
      toast.success("Routine saved");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <ModuleForm
      initial={{
        name: module.name,
        trigger: module.trigger,
        action: module.action,
        minimum: module.minimum,
        days: module.days,
      }}
      submitting={save.isPending}
      submitLabel="Save routine"
      onSubmit={(v) => save.mutate(v)}
      onCancel={onDone}
    />
  );
}

function ModuleRow({
  module,
  canEdit,
  onEdit,
  onArchive,
  onRestore,
}: {
  module: Module;
  canEdit: boolean;
  onEdit: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
}) {
  return (
    <div className="surface flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="font-medium text-foreground">{module.name}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {module.trigger && <span>{module.trigger} → </span>}
          {module.action} · minimum: {module.minimum}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {module.days.length === 0
            ? "No schedule"
            : module.days.map((d) => DAY_LABELS[d - 1]).join(" · ")}
        </p>
      </div>
      <div className="flex gap-2">
        {canEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil /> Edit
          </Button>
        )}
        {onArchive && canEdit && (
          <Button variant="ghost" size="sm" onClick={onArchive}>
            <Archive /> Archive
          </Button>
        )}
        {onRestore && (
          <Button variant="ghost" size="sm" onClick={onRestore}>
            <ArchiveRestore /> Restore
          </Button>
        )}
      </div>
    </div>
  );
}
