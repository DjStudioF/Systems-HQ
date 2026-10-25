import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/app/States";
import { LogButtons } from "@/components/app/LogButtons";
import { useLogMutations, type Log } from "@/lib/services/logs";
import type { GoalWithModules, Module } from "@/lib/services/goals";
import type { DailyStatus } from "@/lib/calc/consistency";
import { isoWeekday, weekStart, type IsoDate } from "@/lib/date/local-date";

type TodayEntry = { module: Module; goalName: string };

/**
 * Today's routines with one-tap check-ins. Undo restores the status from
 * before the last tap (kept in memory for the session) and is only offered
 * after a correction; Clear entry removes a first tap entirely.
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
  const { act, retry, failed, pending } = useLogMutations(userId, weekStart(today));
  const [previous, setPrevious] = useState<Record<string, DailyStatus | null>>({});

  const weekday = isoWeekday(today);
  const entries: TodayEntry[] = goals.flatMap((g) =>
    g.modules
      .filter((m) => !m.archived_at && m.days.includes(weekday))
      .map((m) => ({ module: m, goalName: g.name })),
  );

  const statusFor = (moduleId: string): DailyStatus | null =>
    logs.find((l) => l.module_id === moduleId && l.log_date === today)?.status ?? null;

  const tap = (moduleId: string, status: DailyStatus) => {
    setPrevious((p) => ({ ...p, [moduleId]: statusFor(moduleId) }));
    act({ kind: "set", moduleId, date: today, status, timezone });
  };

  const undo = (moduleId: string) => {
    const prev = previous[moduleId];
    if (!prev) return;
    setPrevious((p) => ({ ...p, [moduleId]: null }));
    act({ kind: "set", moduleId, date: today, status: prev, timezone });
  };

  const clear = (moduleId: string) => {
    setPrevious((p) => ({ ...p, [moduleId]: null }));
    act({ kind: "clear", moduleId, date: today });
  };

  const checkedIn = entries.filter((e) => statusFor(e.module.id) !== null).length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {checkedIn} of {entries.length} checked in
      </p>
      {failed && <ErrorState message={failed.message} onRetry={retry} />}
      {entries.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nothing is scheduled for today.
        </p>
      ) : (
        <ul className="space-y-3">
          {entries.map(({ module, goalName }) => {
            const status = statusFor(module.id);
            const prev = previous[module.id];
            return (
              <li key={module.id} className="surface space-y-3 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium text-foreground">{module.name}</p>
                  <p className="shrink-0 text-xs text-muted-foreground">{goalName}</p>
                </div>
                {module.trigger && (
                  <p className="text-sm text-muted-foreground">After: {module.trigger}</p>
                )}
                <LogButtons
                  value={status}
                  disabled={!online || pending}
                  onSelect={(s) => tap(module.id, s)}
                />
                <div className="flex gap-4 text-sm">
                  {prev && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0"
                      disabled={!online || pending}
                      onClick={() => undo(module.id)}
                    >
                      Undo
                    </Button>
                  )}
                  {status && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-muted-foreground"
                      disabled={!online || pending}
                      onClick={() => clear(module.id)}
                    >
                      Clear entry
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
