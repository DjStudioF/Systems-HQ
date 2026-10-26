import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { PageContainer } from "@/components/app/AppShell";
import { EmptyState, ErrorState, LoadingRows } from "@/components/app/States";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { profileQuery } from "@/lib/services/profile";
import { goalsQuery } from "@/lib/services/goals";
import { deleteLog, upsertLog } from "@/lib/services/logs";
import { HISTORY_PAGE_SIZE, historyQuery, type HistoryRow } from "@/lib/services/history";
import type { DailyStatus } from "@/lib/calc/consistency";
import { formatIsoDate } from "@/lib/date/local-date";
import { useLocalToday } from "@/lib/date/use-local-today";
import { cn } from "@/lib/utils";
import { HistoryOverview } from "@/components/app/HistoryOverview";

const searchSchema = z.object({
  goal: fallback(z.string(), "").default(""),
  module: fallback(z.string(), "").default(""),
  status: fallback(z.string(), "").default(""),
  page: fallback(z.number().int(), 1).default(1),
});

export const Route = createFileRoute("/_authenticated/history")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "History · Systems HQ" },
      { name: "description", content: "Your recorded check-ins, newest first." },
      { property: "og:title", content: "History · Systems HQ" },
      { property: "og:description", content: "Your recorded check-ins, newest first." },
    ],
  }),
  component: HistoryPage,
});

const STATUS_LABEL: Record<DailyStatus, string> = {
  done: "Done",
  minimum: "Minimum",
  skipped: "Skipped",
};

function HistoryPage() {
  const { user } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/history" });
  const qc = useQueryClient();
  const { data: profile } = useQuery(profileQuery(user.id));
  const { data: goals } = useQuery(goalsQuery(user.id));
  const tz = profile?.timezone ?? "UTC";
  const today = useLocalToday(tz);

  const filters = {
    goal: search.goal,
    module: search.module,
    status: search.status,
    page: Math.max(1, search.page),
  };
  const { data, isPending, error, refetch } = useQuery(historyQuery(user.id, filters));

  const correct = useMutation({
    mutationFn: async (a: { moduleId: string; date: string; status: DailyStatus | null }) => {
      if (a.status === null) await deleteLog(user.id, a.moduleId, a.date);
      else await upsertLog(user.id, a.moduleId, a.date, a.status, tz);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["account", user.id, "history"] });
      qc.invalidateQueries({ queryKey: ["account", user.id, "logs"] });
    },
  });

  const setFilter = (patch: Partial<typeof filters>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch, page: 1 }), replace: true });

  const allModules = (goals ?? []).flatMap((g) =>
    g.modules.map((m) => ({ ...m, goalName: g.name })),
  );
  const moduleOptions = filters.goal
    ? allModules.filter((m) => m.goal_id === filters.goal)
    : allModules;

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE));

  return (
    <PageContainer>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">History</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every check-in, newest first. Correct a status or clear an entry any time — edits are
          counted, originals keep their entry timezone.
        </p>
      </header>

      <HistoryOverview userId={user.id} today={today} />

      <div className="mt-8 grid gap-4 sm:flex sm:flex-wrap sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="f-goal">Goal</Label>
          <Select
            value={filters.goal || "all"}
            onValueChange={(v) => setFilter({ goal: v === "all" ? "" : v, module: "" })}
          >
            <SelectTrigger id="f-goal" className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All goals</SelectItem>
              {(goals ?? []).map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-module">Routine</Label>
          <Select
            value={filters.module || "all"}
            onValueChange={(v) => setFilter({ module: v === "all" ? "" : v })}
          >
            <SelectTrigger id="f-module" className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All routines</SelectItem>
              {moduleOptions.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-status">Status</Label>
          <Select
            value={filters.status || "all"}
            onValueChange={(v) => setFilter({ status: v === "all" ? "" : v })}
          >
            <SelectTrigger id="f-status" className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="minimum">Minimum</SelectItem>
              <SelectItem value="skipped">Skipped</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-6">
        {isPending ? (
          <LoadingRows rows={5} />
        ) : error ? (
          <ErrorState message="Couldn't load your history." onRetry={() => refetch()} />
        ) : !data || data.rows.length === 0 ? (
          <EmptyState title="No check-ins match.">
            {filters.goal || filters.module || filters.status
              ? "Try widening the filters."
              : "Check-ins appear here once you start logging."}
          </EmptyState>
        ) : (
          <>
            {correct.isError && (
              <div className="mb-4">
                <ErrorState message="Couldn't apply that change. Nothing was saved — retry." />
              </div>
            )}
            <ul className="space-y-2">
              {data.rows.map((row) => (
                <HistoryRowView
                  key={row.id}
                  row={row}
                  today={today}
                  pending={correct.isPending}
                  onCorrect={(status) =>
                    correct.mutate({ moduleId: row.module_id, date: row.log_date, status })
                  }
                />
              ))}
            </ul>
            <div className="mt-6 flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                Page {filters.page} of {pages} · {total} {total === 1 ? "entry" : "entries"}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.page <= 1}
                  onClick={() =>
                    navigate({
                      search: (prev) => ({ ...prev, page: filters.page - 1 }),
                      replace: true,
                    })
                  }
                >
                  Newer
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.page >= pages}
                  onClick={() =>
                    navigate({
                      search: (prev) => ({ ...prev, page: filters.page + 1 }),
                      replace: true,
                    })
                  }
                >
                  Older
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
}

function HistoryRowView({
  row,
  today,
  pending,
  onCorrect,
}: {
  row: HistoryRow;
  today: string;
  pending: boolean;
  onCorrect: (status: DailyStatus | null) => void;
}) {
  return (
    <li className="surface flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">
          {row.modules.name}
          <span className="font-normal text-muted-foreground"> · {row.modules.goals.name}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {formatIsoDate(row.log_date, { weekday: "short", month: "short", day: "numeric" })}
          {row.log_date === today && " · today"}
          {row.revision > 1 && ` · edited ${row.revision - 1}×`}
        </p>
      </div>
      <div className="flex items-center gap-1.5" role="group" aria-label="Correct this entry">
        {(Object.keys(STATUS_LABEL) as DailyStatus[]).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={row.status === s}
            disabled={pending}
            onClick={() => onCorrect(s)}
            className={cn(
              "tap rounded-md border px-2.5 text-xs font-medium transition-colors",
              row.status === s
                ? s === "done"
                  ? "border-primary bg-primary text-primary-foreground"
                  : s === "minimum"
                    ? "border-primary bg-primary-soft text-primary-soft-foreground"
                    : "border-foreground/30 bg-secondary text-foreground"
                : "border-input text-muted-foreground hover:bg-secondary",
            )}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
        <button
          type="button"
          disabled={pending}
          onClick={() => onCorrect(null)}
          className="tap rounded-md px-2 text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Clear
        </button>
      </div>
    </li>
  );
}
