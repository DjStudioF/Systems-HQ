import { useState } from "react";
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { DailyStatus } from "@/lib/calc/consistency";
import { addDays, type IsoDate } from "@/lib/date/local-date";

export type Log = Tables<"logs">;

/** Query keys are always scoped by account id so caches never cross accounts. */
export const logKeys = {
  week: (userId: string, weekStart: IsoDate) => ["account", userId, "logs", weekStart] as const,
};

export async function fetchWeekLogs(userId: string, weekStart: IsoDate): Promise<Log[]> {
  const { data, error } = await supabase
    .from("logs")
    .select("*")
    .eq("user_id", userId)
    .gte("log_date", weekStart)
    .lte("log_date", addDays(weekStart, 6));
  if (error) throw new Error("Couldn't load your check-ins.");
  return data ?? [];
}

export const weekLogsQuery = (userId: string, weekStart: IsoDate) =>
  queryOptions({
    queryKey: logKeys.week(userId, weekStart),
    queryFn: () => fetchWeekLogs(userId, weekStart),
  });

/**
 * The only write path for check-ins. The database unique constraint
 * (user_id, module_id, log_date) guarantees one log per routine per day;
 * upserting on that key makes writes atomic and retry-safe. Corrections are
 * the same upsert with a new status — the logs_guard trigger bumps revision
 * and updated_at server-side and locks module, date, and entry timezone.
 */
export async function upsertLog(
  userId: string,
  moduleId: string,
  date: IsoDate,
  status: DailyStatus,
  timezone: string,
): Promise<Log> {
  const { data, error } = await supabase
    .from("logs")
    .upsert(
      {
        user_id: userId,
        module_id: moduleId,
        log_date: date,
        status,
        timezone_at_entry: timezone,
      },
      { onConflict: "user_id,module_id,log_date" },
    )
    .select("*")
    .single();
  if (error) throw new Error("Couldn't save your check-in. Please retry.");
  return data;
}

/** Clear entry removes the day's row entirely. */
export async function deleteLog(userId: string, moduleId: string, date: IsoDate): Promise<void> {
  const { error } = await supabase
    .from("logs")
    .delete()
    .eq("user_id", userId)
    .eq("module_id", moduleId)
    .eq("log_date", date);
  if (error) throw new Error("Couldn't clear the entry. Please retry.");
}

export type LogAction =
  | { kind: "set"; moduleId: string; date: IsoDate; status: DailyStatus; timezone: string }
  | { kind: "clear"; moduleId: string; date: IsoDate };

/**
 * Optimistic log mutations for one week. The cache updates instantly on tap;
 * on failure it rolls back and the failed action is kept in `failed` so the
 * UI can show a persistent error with a Retry that re-runs the same action.
 */
export function useLogMutations(userId: string, weekStart: IsoDate) {
  const qc = useQueryClient();
  const key = logKeys.week(userId, weekStart);
  const [failed, setFailed] = useState<{ action: LogAction; message: string } | null>(null);

  const mutation = useMutation<void, Error, LogAction, { previous: Log[] | undefined }>({
    mutationFn: async (action) => {
      if (action.kind === "set") {
        await upsertLog(userId, action.moduleId, action.date, action.status, action.timezone);
      } else {
        await deleteLog(userId, action.moduleId, action.date);
      }
    },
    onMutate: async (action) => {
      setFailed(null);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Log[]>(key);
      qc.setQueryData<Log[]>(key, (logs = []) => {
        if (action.kind === "clear") {
          return logs.filter(
            (l) => !(l.module_id === action.moduleId && l.log_date === action.date),
          );
        }
        const existing = logs.find(
          (l) => l.module_id === action.moduleId && l.log_date === action.date,
        );
        if (existing) {
          return logs.map((l) => (l.id === existing.id ? { ...l, status: action.status } : l));
        }
        const optimistic: Log = {
          id: `optimistic-${action.moduleId}-${action.date}`,
          user_id: userId,
          module_id: action.moduleId,
          log_date: action.date,
          status: action.status,
          timezone_at_entry: action.timezone,
          revision: 1,
          created_at: "",
          updated_at: "",
        };
        return [...logs, optimistic];
      });
      return { previous };
    },
    onError: (_error, action, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous);
      setFailed({
        action,
        message:
          action.kind === "set"
            ? "Couldn't save your check-in. Your previous state was restored."
            : "Couldn't clear the entry. Your previous state was restored.",
      });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  return {
    act: (action: LogAction) => mutation.mutate(action),
    retry: () => {
      if (failed) mutation.mutate(failed.action);
    },
    failed,
    pending: mutation.isPending,
  };
}
