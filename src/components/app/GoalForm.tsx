import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  GOAL_NAME_MAX,
  WHY_MAX,
  goalFormSchema,
  type GoalFormValues,
} from "@/lib/validation/goal";

export function GoalForm({
  initial,
  submitting,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: GoalFormValues;
  submitting: boolean;
  submitLabel: string;
  onSubmit: (values: GoalFormValues) => void;
  onCancel?: () => void;
}) {
  const [f, setF] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = goalFormSchema.safeParse({
      ...f,
      deadline: f.deadline === "" ? null : f.deadline,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form and try again.");
      return;
    }
    setError(null);
    onSubmit(parsed.data);
  };

  return (
    <form className="max-w-xl space-y-6" onSubmit={submit}>
      <div className="space-y-2">
        <Label htmlFor="goal-name">Goal</Label>
        <Input
          id="goal-name"
          className="h-11"
          maxLength={GOAL_NAME_MAX}
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          placeholder="e.g. Stay healthy enough to play with my kids"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="goal-why">Why it matters (optional)</Label>
        <Textarea
          id="goal-why"
          rows={2}
          maxLength={WHY_MAX}
          value={f.why}
          onChange={(e) => setF({ ...f, why: e.target.value })}
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Mode</legend>
        <div role="radiogroup" className="inline-flex rounded-lg border bg-card p-1">
          {(
            [
              ["focus", "Focus — building toward something"],
              ["maintain", "Maintain — keeping something in place"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className="tap flex cursor-pointer items-center rounded-md px-4 text-sm has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
            >
              <input
                type="radio"
                name="goal-mode"
                value={value}
                checked={f.mode === value}
                onChange={() => setF({ ...f, mode: value })}
                className="sr-only"
              />
              {label.split(" — ")[0]}
            </label>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          {f.mode === "focus"
            ? "Focus — building toward something."
            : "Maintain — keeping something in place."}
        </p>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="goal-start">Start date</Label>
          <Input
            id="goal-start"
            type="date"
            className="h-11"
            value={f.start_date}
            onChange={(e) => setF({ ...f, start_date: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="goal-deadline">Deadline (optional)</Label>
          <Input
            id="goal-deadline"
            type="date"
            className="h-11"
            value={f.deadline ?? ""}
            onChange={(e) => setF({ ...f, deadline: e.target.value })}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
