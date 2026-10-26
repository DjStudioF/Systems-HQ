import { Check, Info, Minus, X } from "lucide-react";
import type { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { DailyStatus } from "@/lib/calc/consistency";

/** Progress ring. `value` is 0..1; null renders an empty track. */
export function Ring({
  value,
  size = 28,
  stroke = 3,
  label,
  className,
  children,
}: {
  value: number | null;
  size?: number;
  stroke?: number;
  label: string;
  className?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value ?? 0));
  return (
    <span
      role="img"
      aria-label={label}
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-surface-3"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          className="stroke-primary transition-[stroke-dashoffset] duration-[var(--motion-base)] ease-out-quick"
        />
      </svg>
      {children && <span className="num absolute inset-0 flex items-center justify-center text-[10px] font-medium">{children}</span>}
    </span>
  );
}

const STATE = {
  done: { label: "Done", icon: Check, cls: "border-state-done/40 text-state-done" },
  minimum: { label: "Minimum", icon: Minus, cls: "border-state-minimum/40 text-state-minimum" },
  skipped: { label: "Skipped", icon: X, cls: "border-state-skipped/40 text-state-skipped" },
} as const;

/** Status chip: icon + text, so state is never conveyed by color alone. */
export function StateChip({
  status,
  suffix,
}: {
  status: DailyStatus;
  suffix?: string | undefined;
}) {
  const s = STATE[status];
  const Icon = s.icon;
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs font-medium",
        s.cls,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {s.label}
      {suffix && <span className="num text-muted-foreground">· {suffix}</span>}
    </span>
  );
}

/** Teach-in-place: small info button revealing a one-line explanation. */
export function InfoTip({ term, children }: { term: string; children: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={`What does "${term}" mean?`}
        className="inline-flex size-5 items-center justify-center rounded-full align-middle text-muted-foreground hover:text-foreground"
      >
        <Info className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent className="w-64 text-sm">{children}</PopoverContent>
    </Popover>
  );
}
