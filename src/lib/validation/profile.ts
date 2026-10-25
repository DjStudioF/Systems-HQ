import { z } from "zod";
import { isValidTimeZone } from "@/lib/date/timezones";

export const MOTTO_MAX = 160;
export const DISPLAY_NAME_MAX = 80;
export const DEFAULT_MOTTO = "Build the system. Keep the promise small.";

export const timezoneSchema = z
  .string()
  .trim()
  .refine(isValidTimeZone, { message: "Choose a valid timezone." });

export const profileUpdateSchema = z.object({
  display_name: z
    .string()
    .trim()
    .max(DISPLAY_NAME_MAX, `Keep it under ${DISPLAY_NAME_MAX} characters.`)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  timezone: timezoneSchema.optional(),
  theme: z.enum(["system", "light", "dark"]).optional(),
  consistency_threshold: z
    .number()
    .gt(0, "Threshold must be above 0%.")
    .lte(1, "Threshold can't exceed 100%.")
    .optional(),
  motto: z
    .string()
    .trim()
    .min(1, "Motto can't be empty.")
    .max(MOTTO_MAX, `Keep it under ${MOTTO_MAX} characters.`)
    .optional(),
});

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
