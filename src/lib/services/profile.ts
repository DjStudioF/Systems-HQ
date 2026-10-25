import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";
import { profileUpdateSchema, type ProfileUpdate } from "@/lib/validation/profile";

export type Profile = Tables<"profiles">;

/** Query keys are always scoped by account id so caches never cross accounts. */
export const profileKeys = {
  detail: (userId: string) => ["account", userId, "profile"] as const,
};

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error("Couldn't load your profile.");
  if (!data) throw new Error("Your profile wasn't found. Ask the owner to recreate your account.");
  return data;
}

export const profileQuery = (userId: string) =>
  queryOptions({ queryKey: profileKeys.detail(userId), queryFn: () => fetchProfile(userId) });

export async function updateProfile(
  userId: string,
  patch: ProfileUpdate & { timezone_confirmed?: boolean },
) {
  const parsed = profileUpdateSchema.parse(patch);
  const body = Object.fromEntries(
    Object.entries({ ...parsed, timezone_confirmed: patch.timezone_confirmed }).filter(
      ([, v]) => v !== undefined,
    ),
  ) as TablesUpdate<"profiles">;
  const { data, error } = await supabase
    .from("profiles")
    .update(body)
    .eq("id", userId)
    .select("*")
    .single();
  if (error)
    throw new Error(
      error.code === "22023"
        ? "That timezone isn't recognised."
        : "Couldn't save. Please try again.",
    );
  return data;
}
