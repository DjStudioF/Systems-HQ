# Stage 4 — History + weekly reviews

## Snapshot strategy (agreed approach)

- The `reviews_guard` trigger already blocks clients from writing
  `metrics_snapshot`, `state`, and `submitted_at` unless the database session
  flag `app.snapshot_write` is on. Stage 4 adds two security-definer SQL
  functions that set that flag and do the privileged work inside the database:
  - `start_weekly_review(week_start, timezone)` — get-or-create: returns the
    existing row for the week (no duplicates; `UNIQUE(user_id, week_start)`
    enforces this), or creates a draft with a **frozen metrics snapshot
    computed server-side at that moment** (goals, routines, schedules,
    successes, ratios, consistency, threshold, timezone).
  - `submit_weekly_review(week_start)` — sets state `submitted` and
    `submitted_at`.
- Snapshots are never reconstructed from current schedules. A week with no
  snapshot shows an honest "no snapshot was captured" note.
- The four reflection texts stay client-writable via existing RLS; the
  trigger keeps snapshot/state immutable on those updates.

## Build

1. Migration: the two SQL functions + `GRANT EXECUTE` to authenticated.
2. `src/lib/reviews.functions.ts` — server functions (`requireSupabaseAuth`)
   wrapping the two RPCs; `src/lib/services/reviews.ts` — review queries and
   draft-text save (update of the four text fields only).
3. `/review` route: current week's review — snapshot summary, four reflection
   prompts (wins / skipped & why / keep-tweak-drop / next week's focus),
   Save draft, Submit. Past weeks listed with their frozen snapshots or the
   honest no-snapshot note. Unsaved-change protection via router blocker +
   `beforeunload`; save failures keep the typed text and show a persistent
   Retry.
4. `/history` route: paginated check-in list (newest first) with goal /
   routine / status filters in URL search params; per-row status correction
   and Clear entry reusing the atomic upsert/delete path (revision bumps,
   original entry timezone preserved).
5. Dashboard "Weekly review" section links to `/review` and shows this week's
   draft/submitted state. The five-line "How this works" accordion already
   exists and stays as-is.
6. Tests: vitest for pure helpers; migration applied; typecheck + lint.
7. Browser verification: draft text survives reload; reopening the week
   creates no duplicate; snapshot unchanged after editing a routine's
   schedule; past week without snapshot shows the honest note; save failure
   (network blocked) keeps entered text. Test records removed afterward.
8. Update docs/architecture.md, acceptance-checklist.md, roadmap.md.

## Not in this stage

Export/restore (Stage 5), audit (Stage 6).
