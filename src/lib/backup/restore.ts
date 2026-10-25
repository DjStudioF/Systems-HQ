import { z } from "zod";

/** Client-side validation for a Systems HQ backup file, before anything is sent. */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
const uuid = z.string().uuid();

const goalSchema = z.object({
  id: uuid,
  name: z.string().min(1),
  why: z.string(),
  mode: z.enum(["focus", "maintain"]),
  start_date: isoDate,
  deadline: isoDate.nullable(),
  outcome_notes: z.string(),
  lifecycle: z.enum(["active", "completed", "archived"]),
  sort_order: z.number().int(),
  created_at: z.string(),
});

const moduleSchema = z.object({
  id: uuid,
  goal_id: uuid,
  name: z.string().min(1),
  trigger: z.string(),
  action: z.string().min(1),
  minimum: z.string().min(1),
  days: z.array(z.number().int().min(1).max(7)),
  archived_at: z.string().nullable(),
  sort_order: z.number().int(),
  created_at: z.string(),
});

const logSchema = z.object({
  id: uuid,
  module_id: uuid,
  log_date: isoDate,
  status: z.enum(["done", "minimum", "skipped"]),
  timezone_at_entry: z.string().min(1),
  created_at: z.string(),
});

const reviewSchema = z.object({
  id: uuid,
  week_start: isoDate,
  wins: z.string(),
  skipped_and_why: z.string(),
  keep_tweak_drop: z.string(),
  next_week_focus: z.string(),
  state: z.enum(["draft", "submitted"]),
  metrics_snapshot: z.unknown().nullable(),
  snapshot_captured_at: z.string().nullable(),
  snapshot_timezone: z.string().nullable(),
  submitted_at: z.string().nullable(),
  created_at: z.string(),
});

export const backupSchema = z.object({
  version: z.literal(1),
  app: z.literal("systems-hq"),
  exported_at: z.string(),
  user_id: uuid,
  profile: z
    .object({
      display_name: z.string().nullable(),
      timezone: z.string(),
      theme: z.enum(["system", "light", "dark"]),
      consistency_threshold: z.number(),
      motto: z.string(),
    })
    .nullable(),
  goals: z.array(goalSchema),
  modules: z.array(moduleSchema),
  logs: z.array(logSchema),
  weekly_reviews: z.array(reviewSchema),
});

export type ParsedBackup = z.infer<typeof backupSchema>;

export type BackupPreview = {
  goals: number;
  archivedGoals: number;
  modules: number;
  archivedModules: number;
  logs: number;
  reviews: number;
  submittedReviews: number;
  sameAccount: boolean;
};

/** Pure summary shown before the user confirms a restore. */
export function summarizeBackup(b: ParsedBackup, currentUserId: string): BackupPreview {
  return {
    goals: b.goals.length,
    archivedGoals: b.goals.filter((g) => g.lifecycle === "archived").length,
    modules: b.modules.length,
    archivedModules: b.modules.filter((m) => m.archived_at !== null).length,
    logs: b.logs.length,
    reviews: b.weekly_reviews.length,
    submittedReviews: b.weekly_reviews.filter((r) => r.state === "submitted").length,
    sameAccount: b.user_id === currentUserId,
  };
}

export type ParseResult =
  | { ok: true; backup: ParsedBackup }
  | { ok: false; message: string };

export function parseBackupFile(text: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, message: "That file isn't valid JSON." };
  }
  const parsed = backupSchema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const where = first?.path.join(".") || "file";
    return {
      ok: false,
      message: `That file isn't a valid Systems HQ backup (problem at ${where}).`,
    };
  }
  return { ok: true, backup: parsed.data };
}
