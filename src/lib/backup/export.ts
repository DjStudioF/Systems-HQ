import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

/**
 * Complete account-scoped export. Reads are paginated past the 1000-row
 * default so nothing is truncated, and include archived goals/modules and
 * frozen review snapshots. No auth secrets are ever included.
 */

const PAGE = 1000;

type Row = Record<string, unknown>;

async function fetchAll<T>(
  label: string,
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(`Couldn't export your ${label}.`);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) return out;
  }
}

export type BackupFile = {
  version: 1;
  app: "systems-hq";
  exported_at: string;
  user_id: string;
  profile: {
    display_name: string | null;
    timezone: string;
    theme: string;
    consistency_threshold: number;
    motto: string;
  } | null;
  goals: Tables<"goals">[];
  modules: Tables<"modules">[];
  logs: Tables<"logs">[];
  weekly_reviews: Tables<"weekly_reviews">[];
};

export async function buildBackup(userId: string): Promise<BackupFile> {
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("display_name, timezone, theme, consistency_threshold, motto")
    .eq("id", userId)
    .maybeSingle();
  if (pErr) throw new Error("Couldn't export your profile.");

  const [goals, modules, logs, weekly_reviews] = await Promise.all([
    fetchAll("goals", (from, to) =>
      supabase.from("goals").select("*").eq("user_id", userId).order("created_at").range(from, to),
    ),
    fetchAll("routines", (from, to) =>
      supabase
        .from("modules")
        .select("*")
        .eq("user_id", userId)
        .order("created_at")
        .range(from, to),
    ),
    fetchAll("check-ins", (from, to) =>
      supabase.from("logs").select("*").eq("user_id", userId).order("log_date").range(from, to),
    ),
    fetchAll("reviews", (from, to) =>
      supabase
        .from("weekly_reviews")
        .select("*")
        .eq("user_id", userId)
        .order("week_start")
        .range(from, to),
    ),
  ]);

  return {
    version: 1,
    app: "systems-hq",
    exported_at: new Date().toISOString(),
    user_id: userId,
    profile: profile
      ? {
          display_name: profile.display_name,
          timezone: profile.timezone,
          theme: profile.theme,
          consistency_threshold: Number(profile.consistency_threshold),
          motto: profile.motto,
        }
      : null,
    goals,
    modules,
    logs,
    weekly_reviews,
  };
}

/** Escapes one CSV cell and neutralises spreadsheet formula injection. */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: Row[], columns: { key: string; label: string }[]): string {
  const header = columns.map((c) => csvCell(c.label)).join(",");
  const lines = rows.map((r) => columns.map((c) => csvCell(r[c.key])).join(","));
  return [header, ...lines].join("\r\n");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** iOS-safe delivery: share sheet (Save to Files) on touch devices, download elsewhere. */
export async function deliverFile(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: blob.type });
  const touch = matchMedia("(pointer: coarse)").matches;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return;
    }
  }
  downloadBlob(blob, filename);
}

const CSV_COLUMNS: Record<
  "goals" | "modules" | "logs" | "weekly_reviews",
  { key: string; label: string }[]
> = {
  goals: [
    { key: "id", label: "id" },
    { key: "name", label: "name" },
    { key: "why", label: "why" },
    { key: "mode", label: "mode" },
    { key: "start_date", label: "start_date" },
    { key: "deadline", label: "deadline" },
    { key: "outcome_notes", label: "outcome_notes" },
    { key: "lifecycle", label: "lifecycle" },
    { key: "sort_order", label: "sort_order" },
    { key: "created_at", label: "created_at" },
  ],
  modules: [
    { key: "id", label: "id" },
    { key: "goal_id", label: "goal_id" },
    { key: "name", label: "name" },
    { key: "trigger", label: "trigger" },
    { key: "action", label: "action" },
    { key: "minimum", label: "minimum" },
    { key: "days", label: "days" },
    { key: "archived_at", label: "archived_at" },
    { key: "sort_order", label: "sort_order" },
    { key: "created_at", label: "created_at" },
  ],
  logs: [
    { key: "id", label: "id" },
    { key: "module_id", label: "module_id" },
    { key: "log_date", label: "log_date" },
    { key: "status", label: "status" },
    { key: "timezone_at_entry", label: "timezone_at_entry" },
    { key: "revision", label: "revision" },
    { key: "created_at", label: "created_at" },
    { key: "updated_at", label: "updated_at" },
  ],
  weekly_reviews: [
    { key: "id", label: "id" },
    { key: "week_start", label: "week_start" },
    { key: "wins", label: "wins" },
    { key: "skipped_and_why", label: "skipped_and_why" },
    { key: "keep_tweak_drop", label: "keep_tweak_drop" },
    { key: "next_week_focus", label: "next_week_focus" },
    { key: "state", label: "state" },
    { key: "submitted_at", label: "submitted_at" },
    { key: "created_at", label: "created_at" },
  ],
};

export function backupCsv(
  backup: BackupFile,
  entity: "goals" | "modules" | "logs" | "weekly_reviews",
): string {
  const rows = (backup[entity] as unknown as Row[]).map((r) => ({
    ...r,
    days: Array.isArray(r["days"]) ? (r["days"] as unknown[]).join(" ") : r["days"],
  }));
  return toCsv(rows, CSV_COLUMNS[entity]);
}
