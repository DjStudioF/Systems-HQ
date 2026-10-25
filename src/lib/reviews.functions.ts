import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Get-or-create the review for a week. The SQL function computes the frozen
 * metrics snapshot server-side at creation; an existing row is returned
 * unchanged, so reopening a week never duplicates or recomputes it.
 */
export const startWeeklyReviewFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { weekStart: string; timezone: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: review, error } = await context.supabase.rpc("start_weekly_review", {
      p_week_start: data.weekStart,
      p_timezone: data.timezone,
    });
    if (error) throw new Error("Couldn't start the weekly review.");
    return review;
  });

/** Marks the week's review submitted. Only a draft can be submitted. */
export const submitWeeklyReviewFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { weekStart: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: review, error } = await context.supabase.rpc("submit_weekly_review", {
      p_week_start: data.weekStart,
    });
    if (error) throw new Error("Couldn't submit the review.");
    return review;
  });
