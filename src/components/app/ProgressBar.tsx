import { cn } from "@/lib/utils";

export function textBar(ratio: number): string {
  const r = Math.min(Math.max(ratio, 0), 1);
  const filled = Math.floor(r * 5);
  return "▰".repeat(filled) + "▱".repeat(5 - filled);
}

/** Accessible bar. A null ratio shows the provided text instead of a fake 0%. */
export function ProgressBar({ ratio, label, nullText, className }: { ratio: number | null; label: string; nullText?: string; className?: string }) {
  if (ratio === null) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        <span className="sr-only">{label}: </span>
        {nullText ?? "Not available"}
      </div>
    );
  }
  const r = Math.min(Math.max(ratio, 0), 1);
  const pct = Math.round(r * 100);
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 text-right text-sm tabular-nums text-muted-foreground" aria-hidden="true">
        {pct}%
      </span>
    </div>
  );
}
