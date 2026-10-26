import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { PageContainer } from "@/components/app/AppShell";
import { EmptyState, LoadingRows } from "@/components/app/States";
import { InfoTip } from "@/components/app/viz";
import { TrendChart } from "@/components/app/charts";
import { profileQuery } from "@/lib/services/profile";
import { goalsQuery, type Module } from "@/lib/services/goals";
import { rangeLogsQuery, type Log } from "@/lib/services/logs";
import { countSuccesses, moduleRatio, moduleTarget } from "@/lib/calc/consistency";
import { lastWeekStarts, weekDelta, weeklyConsistencySeries } from "@/lib/calc/trends";
import { addDays, formatIsoDate, isoWeekday, weekStart, type IsoDate } from "@/lib/date/local-date";
import { useLocalToday } from "@/lib/date/use-local-today";
import { cn } from "@/lib/utils";

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

const WEEKS = 12;
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
type Row = { module: Module; goalName: string; goalId: string };
type Status = "on" | "minimum" | "below" | "progress";

function WeekPage() {
  const { user } = Route.useRouteContext();
  const { data: profile } = useQuery(profileQuery(user.id));
  const goals = useQuery(goalsQuery(user.id));
  const today = useLocalToday(profile?.timezone ?? "UTC");
  const mon = weekStart(today);
  const sun = addDays(mon, 6);
  const from = addDays(mon, -(WEEKS - 1) * 7);
  const range = useQuery(rangeLogsQuery(user.id, from, sun));
  const [open, setOpen] = useState<string | null>(null);
  const threshold = profile?.consistency_threshold ?? 0.8;

  const rows: Row[] = useMemo(
    () =>
      (goals.data ?? [])
        .filter((g) => g.lifecycle !== "archived")
        .flatMap((g) =>
          g.modules
            .filter((m) => !m.archived_at)
            .map((m) => ({ module: m, goalName: g.name, goalId: g.id })),
        ),
    [goals.data],
  );
  const logs = useMemo(() => range.data ?? [], [range.data]);
  const weeks = useMemo(() => lastWeekStarts(mon, WEEKS), [mon]);
  const series = useMemo(
    () =>
      weeklyConsistencySeries(
        rows.map((r) => r.module),
        logs,
        weeks,
      ),
    [rows, logs, weeks],
  );

  if (!profile || goals.isPending || range.isPending)
    return (
      <PageContainer>
        <LoadingRows />
      </PageContainer>
    );

  const fmt = { month: "short", day: "numeric" } as const;
  const thisWeek = logs.filter((l) => l.log_date >= mon && l.log_date <= sun);
  const totalTarget = rows.reduce((n, r) => n + moduleTarget(r.module.days), 0);
  const totalDone = rows.reduce(
    (n, r) =>
      n +
      Math.min(
        moduleTarget(r.module.days),
        countSuccesses(thisWeek.filter((l) => l.module_id === r.module.id).map((l) => l.status)),
      ),
    0,
  );
  const cur = series.at(-1)?.value ?? null;
  const delta = weekDelta(cur, series.at(-2)?.value ?? null);

  return (
    <PageContainer>
      <header className="mb-5 flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">This week</h1>
        <p className="num text-sm text-muted-foreground">
          {formatIsoDate(mon, fmt)} – {formatIsoDate(sun, fmt)}
        </p>
      </header>

      {rows.length === 0 ? (
        <EmptyState title="No routines yet.">
          <Link
            to="/goals/new"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Create a goal and routine
          </Link>{" "}
          — weekly progress appears here.
        </EmptyState>
      ) : (
        <div className="space-y-6">
          <section
            aria-label="Week summary"
            className="grid grid-cols-3 divide-x rounded-xl border bg-surface-1 text-sm"
          >
            <Stat label="Consistency">
              <span className="text-3xl font-semibold tracking-tight">
                {cur === null ? "—" : `${Math.round(Math.min(1, cur) * 100)}%`}
              </span>
              {delta !== null && Math.round(delta * 100) !== 0 && (
                <span className="ml-2 text-xs text-muted-foreground">
                  {delta > 0 ? "▲" : "▼"} {Math.abs(Math.round(delta * 100))}% vs last week
                </span>
              )}
            </Stat>
            <Stat label="Check-ins">
              <span className="text-xl font-semibold">{totalDone}</span>
              <span className="text-muted-foreground"> / {totalTarget}</span>
            </Stat>
            <Stat label="Target">
              <span className="text-xl font-semibold">{Math.round(threshold * 100)}%</span>
            </Stat>
          </section>

          <section
            aria-label="Routines this week"
            className="overflow-x-auto rounded-xl border bg-surface-1"
          >
            <table className="num w-full min-w-[640px] text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-medium">Routine</th>
                  {DAYS.map((d, i) => (
                    <th
                      key={i}
                      className={cn(
                        "w-6 py-2 text-center font-medium",
                        addDays(mon, i) === today && "text-foreground",
                      )}
                    >
                      {d}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right font-medium">Count</th>
                  <th className="w-24 px-3 py-2 font-medium" aria-label="Progress" />
                  <th className="px-3 py-2 text-left font-medium">
                    <span className="inline-flex items-center gap-1">
                      Status
                      <InfoTip term="below target">
                        Below target: this week's ratio is under your {Math.round(threshold * 100)}%
                        threshold. Minimum check-ins count toward it.
                      </InfoTip>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <WeekRow
                    key={r.module.id}
                    row={r}
                    logs={logs}
                    mon={mon}
                    today={today}
                    weeks={weeks}
                    threshold={threshold}
                    open={open === r.module.id}
                    onToggle={() => setOpen((o) => (o === r.module.id ? null : r.module.id))}
                  />
                ))}
              </tbody>
            </table>
          </section>

          <section aria-labelledby="trend-h" className="rounded-xl border bg-surface-1 p-4">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 id="trend-h" className="text-sm font-medium">
                Consistency, last {WEEKS} weeks
              </h2>
              <p className="text-xs text-muted-foreground">
                Past weeks estimated from current schedules
              </p>
            </div>
            <TrendChart data={series} threshold={threshold} />
          </section>
        </div>
      )}
    </PageContainer>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="num px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5">{children}</p>
    </div>
  );
}

const CHIP: Record<Status, { label: string; cls: string }> = {
  on: { label: "On target", cls: "border-state-done/40 text-state-done" },
  minimum: { label: "At minimum", cls: "border-state-minimum/40 text-state-minimum" },
  below: { label: "Below target", cls: "border-state-below/40 text-state-below" },
  progress: { label: "In progress", cls: "border-border text-muted-foreground" },
};

function WeekRow({
  row,
  logs,
  mon,
  today,
  weeks,
  threshold,
  open,
  onToggle,
}: {
  row: Row;
  logs: Log[];
  mon: IsoDate;
  today: IsoDate;
  weeks: IsoDate[];
  threshold: number;
  open: boolean;
  onToggle: () => void;
}) {
  const { module: m } = row;
  const sun = addDays(mon, 6);
  const mine = logs.filter((l) => l.module_id === m.id);
  const week = mine.filter((l) => l.log_date >= mon && l.log_date <= sun);
  const target = moduleTarget(m.days);
  const successes = countSuccesses(week.map((l) => l.status));
  const ratio = moduleRatio(successes, m.days) ?? 0;
  const mins = week.filter((l) => l.status === "minimum").length;
  const remaining = m.days.filter((d) => addDays(mon, d - 1) >= today).length;
  const status: Status =
    ratio >= threshold
      ? mins > successes / 2
        ? "minimum"
        : "on"
      : (successes + remaining) / Math.max(1, target) >= threshold
        ? "progress"
        : "below";
  const trend = useMemo(() => weeklyConsistencySeries([m], mine, weeks), [m, mine, weeks]);
  const prior = trend.slice(-3, -1);
  const slipping =
    prior.length === 2 && prior.every((p) => p.value !== null && p.value < threshold);

  return (
    <Fragment>
      <tr className="border-b last:border-0 hover:bg-surface-2/60">
        <td className="px-3 py-2">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className="flex items-center gap-2 text-left"
          >
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
              aria-hidden="true"
            />
            <span>
              <span className="block font-medium leading-tight">{m.name}</span>
              <span className="block text-xs text-muted-foreground">{row.goalName}</span>
            </span>
          </button>
        </td>
        {DAYS.map((_, i) => {
          const date = addDays(mon, i);
          return (
            <td key={i} className="py-2 text-center">
              <Cell
                date={date}
                today={today}
                scheduled={m.days.includes(isoWeekday(date))}
                status={week.find((l) => l.log_date === date)?.status ?? null}
              />
            </td>
          );
        })}
        <td className="whitespace-nowrap px-3 py-2 text-right">
          {Math.min(successes, target)} <span className="text-muted-foreground">of {target}</span>
        </td>
        <td className="px-3 py-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(1, ratio) * 100}%` }}
            />
          </div>
        </td>
        <td className="px-3 py-2">
          <span
            className={cn(
              "inline-flex h-6 items-center whitespace-nowrap rounded-full border px-2 text-xs font-medium",
              CHIP[status].cls,
            )}
          >
            {CHIP[status].label}
          </span>
        </td>
      </tr>
      {slipping && (
        <tr className="border-b">
          <td colSpan={11} className="px-3 pb-2 pl-9 text-xs text-muted-foreground">
            Under target two weeks running — the standard may be set higher than this week's life
            allows. Consider a smaller minimum or fewer days.
          </td>
        </tr>
      )}
      {open && (
        <tr className="border-b bg-background/40">
          <td colSpan={11} className="px-3 py-3">
            <TrendChart data={trend} threshold={threshold} height={120} />
          </td>
        </tr>
      )}
    </Fragment>
  );
}

/** Matrix cell: shape differs per state (filled / half / ring / dot), not color alone. */
function Cell({
  date,
  today,
  scheduled,
  status,
}: {
  date: IsoDate;
  today: IsoDate;
  scheduled: boolean;
  status: Log["status"] | null;
}) {
  const label = `${formatIsoDate(date, { weekday: "short" })}: ${status ?? (scheduled ? "no entry" : "not scheduled")}`;
  return (
    <span
      title={label}
      aria-label={label}
      role="img"
      className={cn(
        "mx-auto block size-4 rounded-[3px]",
        date === today && "outline outline-1 outline-offset-1 outline-foreground/60",
        date > today && "opacity-40",
        status === "done" && "bg-state-done",
        status === "minimum" &&
          "bg-[linear-gradient(to_top,var(--color-state-minimum)_50%,transparent_50%)] border border-state-minimum",
        status === "skipped" && "border border-state-skipped",
        !status && (scheduled ? "bg-surface-3" : "bg-surface-2 opacity-50"),
      )}
    />
  );
}
