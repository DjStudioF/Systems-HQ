# Stage 3 — Daily logging loop

## Mutation / uniqueness / revision strategy (agreed approach)

- **One log per routine per day** is enforced by the database unique constraint
  `(user_id, module_id, log_date)` added in Stage 1. Every write goes through a
  single `upsert` keyed on that constraint — atomic, no read-then-write race,
  and safe to retry.
- **Status correction** is the same upsert with a new status. The existing
  `logs_guard` trigger bumps `revision` and `updated_at` server-side and locks
  module, date, and entry timezone — clients can never rewrite history metadata.
- **Undo** restores the previous status (the value before the last tap, kept in
  memory for the session). It is only shown when a prior status exists, i.e.
  after a correction — never for a first tap, where **Clear entry** (delete the
  row) is the correct reversal. Delete is already permitted by RLS.
- **Optimistic updates**: the TanStack Query cache is updated instantly on tap;
  on failure the cache rolls back and a persistent inline error with a Retry
  action stays visible until resolved. No toasts that disappear.
- **No schema change needed** — constraints, trigger, and policies already exist.

## Build

1. `src/lib/services/logs.ts` — week-scoped log query (keys
   `["account", userId, "logs", weekStart]`), `upsertLog`, `deleteLog`,
   optimistic-mutation helpers with rollback + persistent error.
2. Calc additions in `src/lib/calc/consistency.ts`: count successes
   (Done + Minimum = 1 each; Skipped and no-log = 0) and per-module week
   aggregation from raw logs. Pure, injected dates. New vitest cases.
3. Components:
   - `LogButtons` — one-tap Done / Minimum / Skipped using the existing Button
     variants with `aria-pressed`.
   - `TodaySection` — routines scheduled today (weekday filter), one-tap
     logging, conditional Undo / Clear entry, inline error + Retry.
   - `WeekStrip` — seven-day strip (Mon–Sun) per routine showing each day's
     status.
   - `GoalWeekGroup` — This week grouped by goal: routines with strips,
     ratio vs full-week target, goal consistency vs the 80% default threshold
     (unrounded comparison, "No schedule" => null, never division by zero).
4. Dashboard rewrite: Today section (live), This week section (live), GoalCard
   gains weekly consistency next to time elapsed (still labelled "not a
   measure of completion"). Local-midnight and Monday rollover already handled
   by the injected-clock `useLocalToday`; week range derives from it.
5. Offline read-only: `navigator.onLine` + query error state renders a banner
   and disables logging buttons; cached data stays visible.
6. Tests: vitest for success counting, week aggregation, undo/clear state
   logic where pure. Run vitest, typecheck, lint.
7. Browser verification with an isolated test goal + routine: log, correct,
   undo, clear, reload persistence, week strip, rollover-safe dates. Remove
   all test records afterward.
8. Update `docs/architecture.md`, `docs/acceptance-checklist.md`, `roadmap.md`.

## Not in this stage

Weekly reviews, history, export/restore, imports.
