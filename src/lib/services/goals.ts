import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import {
  goalFormSchema,
  goalUpdateSchema,
  moduleFormSchema,
  type GoalFormValues,
  type ModuleFormValues,
} from "@/lib/validation/goal";

/** Drops undefined keys so partial updates satisfy exactOptionalPropertyTypes. */
function defined<T extends Record<string, unknown>>(
  obj: T,
): { [K in keyof T]?: Exclude<T[K], undefined> } {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as {
    [K in keyof T]?: Exclude<T[K], undefined>;
  };
}

export type Goal = Tables<"goals">;
export type Module = Tables<"modules">;
export type GoalWithModules = Goal & { modules: Module[] };

/** Query keys are always scoped by account id so caches never cross accounts. */
export const goalKeys = {
  list: (userId: string) => ["account", userId, "goals"] as const,
  detail: (userId: string, goalId: string) => ["account", userId, "goals", goalId] as const,
};

function friendly(error: { code?: string; message?: string }): Error {
  if (error.code === "23514")
    return new Error("That value isn't allowed. Check the form and retry.");
  if (error.code === "23503") return new Error("That change would break a linked record.");
  return new Error("Couldn't save. Please try again.");
}

export async function fetchGoals(userId: string): Promise<GoalWithModules[]> {
  const { data, error } = await supabase
    .from("goals")
    .select("*, modules(*)")
    .eq("user_id", userId)
    .order("sort_order")
    .order("created_at");
  if (error) throw new Error("Couldn't load your goals.");
  return (data ?? []).map((g) => ({
    ...g,
    modules: [...(g.modules ?? [])].sort((a, b) => a.sort_order - b.sort_order),
  }));
}

export const goalsQuery = (userId: string) =>
  queryOptions({ queryKey: goalKeys.list(userId), queryFn: () => fetchGoals(userId) });

export async function fetchGoal(userId: string, goalId: string): Promise<GoalWithModules> {
  const { data, error } = await supabase
    .from("goals")
    .select("*, modules(*)")
    .eq("user_id", userId)
    .eq("id", goalId)
    .maybeSingle();
  if (error) throw new Error("Couldn't load this goal.");
  if (!data) throw new Error("This goal wasn't found.");
  return {
    ...data,
    modules: [...(data.modules ?? [])].sort((a, b) => a.sort_order - b.sort_order),
  };
}

export const goalQuery = (userId: string, goalId: string) =>
  queryOptions({
    queryKey: goalKeys.detail(userId, goalId),
    queryFn: () => fetchGoal(userId, goalId),
  });

export async function createGoal(userId: string, values: GoalFormValues): Promise<Goal> {
  const parsed = goalFormSchema.parse(values);
  const body: TablesInsert<"goals"> = { ...parsed, user_id: userId };
  const { data, error } = await supabase.from("goals").insert(body).select("*").single();
  if (error) throw friendly(error);
  return data;
}

export async function updateGoal(
  userId: string,
  goalId: string,
  values: Partial<GoalFormValues>,
): Promise<Goal> {
  const parsed = defined(goalUpdateSchema.parse(values));
  const { data, error } = await supabase
    .from("goals")
    .update(parsed)
    .eq("id", goalId)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw friendly(error);
  return data;
}

/**
 * Archive/restore are the only removal paths — goals are never deleted.
 * Archiving a goal archives its active routines; restoring brings them back.
 */
export async function setGoalLifecycle(
  userId: string,
  goalId: string,
  lifecycle: "active" | "completed" | "archived",
): Promise<void> {
  const { error } = await supabase
    .from("goals")
    .update({ lifecycle })
    .eq("id", goalId)
    .eq("user_id", userId);
  if (error) throw friendly(error);
  if (lifecycle === "archived") {
    const { error: mErr } = await supabase
      .from("modules")
      .update({ archived_at: new Date().toISOString() })
      .eq("goal_id", goalId)
      .eq("user_id", userId)
      .is("archived_at", null);
    if (mErr) throw friendly(mErr);
  } else if (lifecycle === "active") {
    const { error: mErr } = await supabase
      .from("modules")
      .update({ archived_at: null })
      .eq("goal_id", goalId)
      .eq("user_id", userId)
      .not("archived_at", "is", null);
    if (mErr) throw friendly(mErr);
  }
}

export async function createModule(
  userId: string,
  goalId: string,
  values: ModuleFormValues,
): Promise<Module> {
  const parsed = moduleFormSchema.parse(values);
  const body: TablesInsert<"modules"> = { ...parsed, user_id: userId, goal_id: goalId };
  const { data, error } = await supabase.from("modules").insert(body).select("*").single();
  if (error) throw friendly(error);
  return data;
}

export async function updateModule(
  userId: string,
  moduleId: string,
  values: Partial<ModuleFormValues>,
): Promise<Module> {
  const parsed = defined(moduleFormSchema.partial().parse(values));
  const { data, error } = await supabase
    .from("modules")
    .update(parsed)
    .eq("id", moduleId)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw friendly(error);
  return data;
}

/** Routines are archived, never deleted. */
export async function setModuleArchived(
  userId: string,
  moduleId: string,
  archived: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("modules")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", moduleId)
    .eq("user_id", userId);
  if (error) throw friendly(error);
}
