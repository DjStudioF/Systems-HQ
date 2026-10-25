import type { MetricsSnapshot } from "@/lib/services/reviews";

/**
 * Renders a frozen, server-captured metrics snapshot. When none exists the
 * week is honest about it — past numbers are never reconstructed from
 * today's schedules.
 */
export function SnapshotSummary({ snapshot }: { snapshot: MetricsSnapshot | null }) {
  if (!snapshot) {
    return (
      <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        No metrics snapshot was captured for this week, and it can't be reconstructed from today's
        schedules.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Snapshot of the week as captured · target {Math.round(snapshot.threshold * 100)}%
      </p>
      <ul className="space-y-3">
        {snapshot.goals.map((g) => (
          <li key={g.id} className="surface p-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-medium text-foreground">{g.name}</p>
              <span className="shrink-0 text-xs text-muted-foreground">
                {g.consistency === null
                  ? "No scheduled routines"
                  : `${Math.round(g.consistency * 100)}% consistency`}
              </span>
            </div>
            {g.modules.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {g.modules.map((m) => (
                  <li key={m.id} className="flex justify-between gap-3">
                    <span className="truncate">{m.name}</span>
                    <span className="shrink-0 tabular-nums">
                      {m.target === 0 ? "No schedule" : `${m.successes} of ${m.target}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
        {snapshot.goals.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No active goals when this snapshot was taken.
          </p>
        )}
      </ul>
    </div>
  );
}
