import { z } from "zod";

export const GOAL_NAME_MAX = 120;
export const WHY_MAX = 500;
export const MODULE_NAME_MAX = 120;
export const TRIGGER_MAX = 200;
export const ACTION_MAX = 200;
export const MINIMUM_MAX = 200;
export const OUTCOME_MAX = 1000;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
  .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)), "Use a valid date.");

/** ISO weekdays, unique and sorted, Monday = 1 … Sunday = 7. */
export const daysSchema = z
  .array(z.number().int().min(1).max(7))
  .max(7)
  .refine((d) => new Set(d).size === d.length, "Each day can only be selected once.")
  .transform((d) => [...d].sort((a, b) => a - b));

export const goalFormSchema = z
  .object({
    name: z.string().trim().min(1, "Give the goal a name.").max(GOAL_NAME_MAX),
    why: z.string().trim().max(WHY_MAX).default(""),
    mode: z.enum(["focus", "maintain"]),
    start_date: isoDate,
    deadline: isoDate.nullable(),
    outcome_notes: z.string().trim().max(OUTCOME_MAX).default(""),
  })
  .refine((g) => !g.deadline || g.deadline >= g.start_date, {
    message: "Deadline can't be before the start date.",
    path: ["deadline"],
  });

export const moduleFormSchema = z.object({
  name: z.string().trim().min(1, "Give the routine a name.").max(MODULE_NAME_MAX),
  trigger: z.string().trim().max(TRIGGER_MAX).default(""),
  action: z.string().trim().min(1, "Describe the action.").max(ACTION_MAX),
  minimum: z.string().trim().min(1, "Describe the smallest version.").max(MINIMUM_MAX),
  days: daysSchema,
});

export type GoalFormValues = z.infer<typeof goalFormSchema>;
export type ModuleFormValues = z.infer<typeof moduleFormSchema>;

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
