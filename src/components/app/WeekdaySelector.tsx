import { DAY_LABELS } from "@/lib/validation/goal";
import { cn } from "@/lib/utils";

/**
 * ISO weekday picker (Mon = 1 … Sun = 7). The weekly target is the number of
 * selected days; selecting none means "No schedule".
 */
export function WeekdaySelector({
  value,
  onChange,
  idPrefix = "day",
}: {
  value: number[];
  onChange: (days: number[]) => void;
  idPrefix?: string;
}) {
  const toggle = (day: number) =>
    onChange(
      value.includes(day)
        ? value.filter((d) => d !== day)
        : [...value, day].sort((a, b) => a - b),
    );

  return (
    <div role="group" aria-label="Scheduled days" className="flex flex-wrap gap-2">
      {DAY_LABELS.map((label, i) => {
        const day = i + 1;
        const active = value.includes(day);
        return (
          <button
            key={day}
            id={`${idPrefix}-${day}`}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(day)}
            className={cn(
              "tap min-w-11 rounded-lg border px-2 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
