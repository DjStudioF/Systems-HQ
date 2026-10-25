import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Log } from "@/lib/services/logs";

export const HISTORY_PAGE_SIZE = 25;

export type HistoryFilters = {
  goal: string;
  module: string;
  status: string;
  page: number;
};

export type HistoryRow = Log & {
  modules: { name: string; goal_id: string; goals: { name: string } };
};

/** Query keys are always scoped by account id so caches never cross accounts. */
export const historyKeys = {
  list: (userId: string, f: HistoryFilters) =>
    ["account", userId, "history", f.goal, f.module, f.status, f.page] as const,
};

export async function fetchHistory(
  userId: string,
  f: HistoryFilters,
): Promise<{ rows: HistoryRow[]; total: number }> {
  let q = supabase
    .from("logs")
    .select("*, modules!inner(name, goal_id, goals!inner(name))", { count: "exact" })
    .eq("user_id", userId)
    .order("log_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range((f.page - 1) * HISTORY_PAGE_SIZE, f.page * HISTORY_PAGE_SIZE - 1);
  if (f.status) q = q.eq("status", f.status as "done" | "minimum" | "skipped");
  if (f.module) q = q.eq("module_id", f.module);
  if (f.goal) q = q.eq("modules.goal_id", f.goal);
  const { data, error, count } = await q;
  if (error) throw new Error("Couldn't load your history.");
  return { rows: (data ?? []) as unknown as HistoryRow[], total: count ?? 0 };
}

export const historyQuery = (userId: string, f: HistoryFilters) =>
  queryOptions({
    queryKey: historyKeys.list(userId, f),
    queryFn: () => fetchHistory(userId, f),
  });
