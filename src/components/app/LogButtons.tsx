import { Check, Minus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DailyStatus } from "@/lib/calc/consistency";

const OPTIONS = [
  { status: "done", label: "Done", variant: "done", icon: Check },
  { status: "minimum", label: "Minimum", variant: "minimum", icon: Minus },
  { status: "skipped", label: "Skipped", variant: "skipped", icon: X },
] as const;

/**
 * One-tap daily check-in. The selected status is expressed with aria-pressed;
 * tapping a different status is a correction, not a new entry.
 */
export function LogButtons({
  value,
  disabled,
  onSelect,
}: {
  value: DailyStatus | null;
  disabled?: boolean;
  onSelect: (status: DailyStatus) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Log today">
      {OPTIONS.map(({ status, label, variant, icon: Icon }) => (
        <Button
          key={status}
          variant={variant}
          size="sm"
          aria-pressed={value === status}
          disabled={disabled}
          onClick={() => onSelect(status)}
        >
          {value === status && <Icon aria-hidden="true" />}
          {label}
        </Button>
      ))}
    </div>
  );
}
