import { useState } from "react";
import { WeekdaySelector } from "@/components/app/WeekdaySelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ACTION_MAX,
  MINIMUM_MAX,
  MODULE_NAME_MAX,
  TRIGGER_MAX,
  moduleFormSchema,
  type ModuleFormValues,
} from "@/lib/validation/goal";

export function ModuleForm({
  initial,
  submitting,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: ModuleFormValues;
  submitting: boolean;
  submitLabel: string;
  onSubmit: (values: ModuleFormValues) => void;
  onCancel?: () => void;
}) {
  const [f, setF] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = moduleFormSchema.safeParse(f);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form and try again.");
      return;
    }
    setError(null);
    onSubmit(parsed.data);
  };

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="space-y-2">
        <Label htmlFor="mod-name">Routine</Label>
        <Input
          id="mod-name"
          className="h-11"
          maxLength={MODULE_NAME_MAX}
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          placeholder="e.g. Morning walk"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mod-trigger">Trigger (optional)</Label>
        <Input
          id="mod-trigger"
          className="h-11"
          maxLength={TRIGGER_MAX}
          value={f.trigger}
          onChange={(e) => setF({ ...f, trigger: e.target.value })}
          placeholder="e.g. After I pour my coffee"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mod-action">Action</Label>
        <Input
          id="mod-action"
          className="h-11"
          maxLength={ACTION_MAX}
          value={f.action}
          onChange={(e) => setF({ ...f, action: e.target.value })}
          placeholder="e.g. Walk for 30 minutes"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mod-minimum">Minimum version</Label>
        <Input
          id="mod-minimum"
          className="h-11"
          maxLength={MINIMUM_MAX}
          value={f.minimum}
          onChange={(e) => setF({ ...f, minimum: e.target.value })}
          placeholder="e.g. Walk around the block"
        />
        <p className="text-sm text-muted-foreground">
          The smallest version that still counts. Done and Minimum both earn the day.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Days</Label>
        <WeekdaySelector value={f.days} onChange={(days) => setF({ ...f, days })} />
        <p className="text-sm text-muted-foreground">
          {f.days.length === 0
            ? "No days selected — this routine will show “No schedule”."
            : `Weekly target: ${f.days.length} ${f.days.length === 1 ? "day" : "days"} (never prorated).`}
        </p>
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
