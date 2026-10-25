import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { IsoDate } from "@/lib/date/local-date";

export type Review = Tables<"weekly_reviews">;

/** Frozen, server-generated metrics. Never reconstructed from current schedules. */
export type SnapshotModule = {
  id: string;
  name: string;
  days: number[];
  target: number;
  successes: number;
  ratio: number | null;
};
export type SnapshotGoal = {
  id: string;
  name: string;
  mode: string;
  modules: SnapshotModule[];
  consistency: number | null;
};
export type MetricsSnapshot = {
  week_start: IsoDate;
  week_end: IsoDate;
  threshold: number;
  goals: SnapshotGoal[];
};

export function readSnapshot(review: Review): MetricsSnapshot | null {
  return (review.metrics_snapshot as unknown as MetricsSnapshot | null) ?? null;
}

/** Query keys are always scoped by account id so caches never cross accounts. */
export const reviewKeys = {
  list: (userId: string) => ["account", userId, "reviews"] as const,
};

export async function fetchReviews(userId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from("weekly_reviews")
    .select("*")
    .eq("user_id", userId)
    .order("week_start", { ascending: false });
  if (error) throw new Error("Couldn't load your reviews.");
  return data ?? [];
}

export const reviewsQuery = (userId: string) =>
  queryOptions({ queryKey: reviewKeys.list(userId), queryFn: () => fetchReviews(userId) });

export type ReviewTextFields = {
  wins: string;
  skipped_and_why: string;
  keep_tweak_drop: string;
  next_week_focus: string;
};

/**
 * Saves the four reflection texts only. The reviews_guard trigger keeps the
 * snapshot, state and submission fields untouched on this update.
 */
export async function saveReviewText(
  userId: string,
  reviewId: string,
  fields: ReviewTextFields,
): Promise<Review> {
  const { data, error } = await supabase
    .from("weekly_reviews")
    .update(fields)
    .eq("id", reviewId)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw new Error("Couldn't save your draft. Your text is still here — retry.");
  return data;
}
