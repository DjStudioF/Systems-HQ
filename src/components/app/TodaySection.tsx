import { memo, useCallback, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Minus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/app/States";
import { Ring, StateChip } from "@/components/app/viz";
import { useLogMutations, weekLogsQuery, type Log } from "@/lib/services/logs";
import type { GoalWithModules, Module } from "@/lib/services/goals";
import type { DailyStatus } from "@/lib/calc/consistency";
import { addDays, isoWeekday, weekStart, type IsoDate } from "@/lib/date/local-date";
import { cn } from "@/lib/utils";

type Entry = { module: Module; goalName: string; goalId: string };
const LABEL: Record<DailyStatus, string> = { done: "Done", minimum: "Minimum", skipped: "Skipped" };

function timeIn(tz: string, iso: string | undefined) {
  if (!iso) return undefined;
  try {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZone: tz }).format(new Date(iso));
  } catch {
    return undefined;
  }
}

/**
 * Today's check-in rail. Done is the primary action; Minimum/Skipped are
 * secondary. Logged cards settle into a state chip (click to undo) and sink
 * below unfinished ones. Keys: 1/2/3 mark the focused card, J/K move focus.
 */
export function TodaySection({
  userId,
  goals,
  logs,
  today,
  timezone,
  online,
}: {
  userId: string;
  goals: GoalWithModules[];
  logs: Log[];
  today: IsoDate;
  timezone: string;
  online: boolean;
}) {
  const mon = weekStart(today);
  const { act, retry, failed, pending } = useLogMutations(userId, mon);
  const { data: prevWeek } = useQuery(weekLogsQuery(userId, addDays(mon, -7)));
  const listRef = useRef<HTMLUListElement>(null);
  const [showKeys, setShowKeys] = useState(false);

  const weekday = isoWeekday(today);
  const entries: Entry[] = goals.flatMap((g) =>
    g.modules
      .filter((m) => !m.archived_at && m.days.includes(weekday))
      .map((m) => ({ module: m, goalName: g.name, goalId: g.id })),
  );
  const logFor = (id: string) => logs.find((l) => l.module_id === id && l.log_date === today);
  const allLogs = [...(prevWeek ?? []), ...logs];

  const mark = useCallback(
    (module: Module, status: DailyStatus) => {
      const prev = logs.find((l) => l.module_id === module.id && l.log_date === today)?.status ?? null;
      act({ kind: "set", moduleId: module.id, date: today, status, timezone });
      const undo = () =>
        prev
          ? act({ kind: "set", moduleId: module.id, date: today, status: prev, timezone })
          : act({ kind: "clear", moduleId: module.id, date: today });
      const wasCounted = prev === "done" || prev === "minimum";
      const counts = status !== "skipped";
      const before = logs.filter(
        (l) => l.module_id === module.id && l.log_date !== today && l.status !== "skipped",
      ).length + (wasCounted ? 1 : 0);
      const after = before - (wasCounted ? 1 : 0) + (counts ? 1 : 0);
      const target = module.days.length;
      if (after >= target && before < target) {
        toast.success(`${module.name} hit its weekly target`, {
          description: `${after} of ${target} this week.`,
          action: { label: "Undo", onClick: undo },
          duration: 5000,
        });
      } else {
        toast(`${module.name} · ${LABEL[status]}`, {
          action: { label: "Undo", onClick: undo },
          duration: 4000,
        });
      }
    },
    [act, logs, today, timezone],
  );

  const reopen = useCallback(
    (module: Module) => act({ kind: "clear", moduleId: module.id, date: today }),
    [act, today],
  );

  const onKey = (e: KeyboardEvent<HTMLUListElement>) => {
    const cards = Array.from(listRef.current?.querySelectorAll<HTMLElement>("[data-card]") ?? []);
    const i = cards.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    const k = e.key.toLowerCase();
    if (k === "j" || k === "arrowdown" || k === "arrowright") cards[Math.min(i + 1, cards.length - 1)]?.focus();
    else if (k === "k" || k === "arrowup" || k === "arrowleft") cards[Math.max(i - 1, 0)]?.focus();
    else if (["1", "2", "3"].includes(k) && online && !pending) {
      const e2 = entries.find((x) => x.module.id === cards[i].dataset.card);
      if (e2) mark(e2.module, (["done", "minimum", "skipped"] as const)[Number(k) - 1]);
    } else return;
    e.preventDefault();
  };

  if (entries.length === 0)
    return (
      <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Nothing is scheduled for today.
      </p>
    );

  const checked = entries.filter((e) => logFor(e.module.id)).length;
  const allDone = checked === entries.length;
  const sorted = [...entries].sort(
    (a, b) => Number(!!logFor(a.module.id)) - Number(!!logFor(b.module.id)),
  );
  const counts = { done: 0, minimum: 0, skipped: 0 };
  entries.forEach((e) => {
    const s = logFor(e.module.id)?.status;
    if (s) counts[s]++;
  });

  return (
    <div className="space-y-4">
      {failed && <ErrorState message={failed.message} onRetry={retry} />}

      {allDone ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border bg-surface-1 px-6 py-10 text-center animate-in fade-in duration-300">
          <Ring value={1} size={72} stroke={6} label="All check-ins done">
            <Check className="size-6 text-primary" />
          </Ring>
          <p className="text-xl font-semibold tracking-tight">Day closed. The system ran.</p>
          <p className="num text-sm text-muted-foreground">
            {counts.done} done · {counts.minimum} minimum · {counts.skipped} skipped
          </p>
        </div>
      ) : (
        <div className="flex items-baseline justify-between text-sm text-muted-foreground">
          <p className="num">
            {checked} of {entries.length} checked in
          </p>
          <button
            type="button"
            className="hidden text-xs underline-offset-4 hover:underline md:inline"
            onClick={() => setShowKeys((v) => !v)}
          >
            Keyboard shortcuts
          </button>
        </div>
      )}
      {showKeys && (
        <p className="hidden text-xs text-muted-foreground md:block">
          Focus a card, then <Kbd>1</Kbd> Done · <Kbd>2</Kbd> Minimum · <Kbd>3</Kbd> Skipped ·{" "}
          <Kbd>J</Kbd>/<Kbd>K</Kbd> move
        </p>
      )}

      <ul
        ref={listRef}
        onKeyDown={onKey}
        className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr))]"
      >
        {sorted.map((e) => {
          const log = logFor(e.module.id);
          return (
            <CheckInCard
              key={e.module.id}
              entry={e}
              status={log?.status ?? null}
              time={timeIn(timezone, log?.updated_at || log?.created_at)}
              dots={last7(e.module, allLogs, today)}
              disabled={!online || pending}
              onMark={mark}
              onReopen={reopen}
            />
          );
        })}
      </ul>
    </div>
  );
}

function Kbd({ children }: { children: string }) {
  return <kbd className="num rounded border bg-surface-2 px-1.5 py-0.5 text-[11px]">{children}</kbd>;
}

type Dot = { date: IsoDate; status: DailyStatus | null; scheduled: boolean };
function last7(module: Module, logs: Log[], today: IsoDate): Dot[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    return {
      date,
      status: logs.find((l) => l.module_id === module.id && l.log_date === date)?.status ?? null,
      scheduled: module.days.includes(isoWeekday(date)),
    };
  });
}

const BORDER: Record<DailyStatus, string> = {
  done: "border-state-done/50",
  minimum: "border-state-minimum/50",
  skipped: "border-state-skipped/50",
};

const CheckInCard = memo(function CheckInCard({
  entry,
  status,
  time,
  dots,
  disabled,
  onMark,
  onReopen,
}: {
  entry: Entry;
  status: DailyStatus | null;
  time?: string;
  dots: Dot[];
  disabled: boolean;
  onMark: (m: Module, s: DailyStatus) => void;
  onReopen: (m: Module) => void;
}) {
  const { module, goalName, goalId } = entry;
  return (
    <li
      data-card={module.id}
      tabIndex={0}
      aria-label={`${module.name}${status ? `, ${LABEL[status]}` : ", not checked in"}`}
      className={cn(
        "flex flex-col gap-3 rounded-2xl border bg-surface-1 p-5 transition-all duration-[var(--motion-base)] ease-out-quick",
        status ? cn(BORDER[status], "bg-background opacity-80") : "shadow-sm",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={cn("text-lg font-semibold leading-tight tracking-tight", status && "text-muted-foreground")}>
          {module.name}
        </p>
        <DotStrip dots={dots} />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Link
          to="/goals/$goalId"
          params={{ goalId }}
          className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
        >
          {goalName}
        </Link>
        {module.trigger && <p className="text-xs text-muted-foreground">After: {module.trigger}</p>}
      </div>

      {status ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onReopen(module)}
          className="tap -mb-1 flex items-center gap-2 self-start rounded-lg text-xs text-muted-foreground hover:text-foreground"
          aria-label={`${LABEL[status]}. Undo check-in`}
          title="Click to undo"
        >
          <StateChip status={status} suffix={time} />
          <span>Undo</span>
        </button>
      ) : (
        <div className="mt-auto flex gap-2" role="group" aria-label={`Log ${module.name}`}>
          <Button
            className="h-12 flex-1 text-base"
            disabled={disabled}
            onClick={() => onMark(module, "done")}
          >
            <Check /> Done
          </Button>
          <Button
            variant="ghost"
            className="h-12 px-3 text-muted-foreground"
            disabled={disabled}
            onClick={() => onMark(module, "minimum")}
          >
            <Minus /> Min
          </Button>
          <Button
            variant="ghost"
            className="h-12 px-3 text-muted-foreground"
            disabled={disabled}
            aria-label="Skipped"
            onClick={() => onMark(module, "skipped")}
          >
            <X /> Skip
          </Button>
        </div>
      )}
    </li>
  );
});

function DotStrip({ dots }: { dots: Dot[] }) {
  return (
    <span className="flex shrink-0 items-center gap-1 pt-1.5" role="img" aria-label="Last 7 days">
      {dots.map((d) => (
        <span
          key={d.date}
          title={`${d.date}: ${d.status ? LABEL[d.status] : d.scheduled ? "no entry" : "not scheduled"}`}
          className={cn(
            "size-1.5 rounded-full",
            d.status === "done" && "bg-state-done",
            d.status === "minimum" && "bg-state-minimum",
            d.status === "skipped" && "border border-state-skipped",
            !d.status && (d.scheduled ? "bg-surface-3" : "bg-surface-2"),
          )}
        />
      ))}
    </span>
  );
}
