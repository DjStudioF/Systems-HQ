# Architecture

## Stack
- TanStack Start v1 (React 19, Vite 7), running server-side on an edge worker.
- TanStack Router with file routes in `src/routes`.
- TanStack Query for the cache. Zod for validation. Tailwind v4 with shadcn/Radix primitives.
- Backend: Lovable Cloud (managed Postgres, auth and row-level security).
- Migrations live in `drizzle/migrations/` and are applied through the Lovable migration tool. The first one is `0000_migration.sql`.

## Layout
- `src/lib/date/`: pure calendar helpers with an injected clock (`localToday(tz, now)`). Dates are `YYYY-MM-DD` strings and are never parsed as UTC instants for display.
- `src/lib/calc/`: pure derived-metric functions (module target/ratio, unweighted goal consistency, time elapsed). All take dates as arguments; none are stored in the database.
- `src/lib/validation/`: shared Zod schemas.
- `src/lib/services/`: data access. Query keys always start with `["account", userId, ...]`. `logs.ts` owns the only check-in write path: a single upsert keyed on `UNIQUE(user_id, module_id, log_date)` (atomic, retry-safe; corrections are the same upsert and the `logs_guard` trigger bumps revision server-side), plus delete for Clear entry. `useLogMutations` applies optimistic cache updates with rollback and keeps the failed action so the UI can offer a persistent Retry.
- `src/lib/auth/`: sign-out teardown and redirect sanitising.
- `src/components/app/`: app components. `src/components/ui/` holds the primitives, including the logging button variants.
- `src/routes/_authenticated/`: protected pages (`/`, `/goals` + `/goals/new` + `/goals/$goalId` + edit, `/settings`, `/history`). These are client-only (`ssr: false`). A route file that gains dot-nested children must either render `<Outlet />` or be renamed to `*.index.tsx` — `goals.index.tsx` is the list leaf for that reason.
- Public pages: `/login`, `/forgot-password` and `/reset-password`. There are no development-only routes.

## Auth and privacy
- Email/password sign-in only. Public sign-up is disabled at the auth server, and there's no sign-up screen. Anonymous sign-in is disabled. The leaked-password check is on.
- The protected layout calls `getUser()` (validated with the server) and redirects to `/login`, adding `reason=expired` when a stale session exists.
- A single root `onAuthStateChange` listener clears the whole query cache whenever the account id changes or the user signs out.
- Private pages aren't server-rendered, so no private data enters shared or server responses. The root sets `noindex`.

## Database decisions
- Every table has row-level security with policies scoped to `auth.uid() = user_id` (on profiles, `id`). The `anon` role has no grants at all.
- Goals and modules have no DELETE grant or policy, because archiving is the removal method. Logs allow delete, since clearing an entry is valid.
- Composite foreign keys `(goal_id, user_id)` and `(module_id, user_id)` mean a child row can never point at another account's parent.
- `UNIQUE(user_id, module_id, log_date)` and `UNIQUE(user_id, week_start)`.
- Triggers:
  - `logs_guard`: revision is server-maintained, starting at 1 and incrementing on every update. Date, module, owner and timezone_at_entry are immutable.
  - `modules_guard`: a module with logs can't change goal.
  - `reviews_guard`: snapshot and state fields are writable only when the `app.snapshot_write` session flag is on. The security-definer functions `start_weekly_review` (get-or-create a week's draft with a frozen, server-computed metrics snapshot) and `submit_weekly_review` set it via `set_config`; clients can only update the four reflection texts. Snapshots are never reconstructed from current schedules.
  - `validate_profile`: checks the IANA timezone against `pg_timezone_names`.
  - `set_updated_at`: maintains audit timestamps.
- Profile bootstrap: a security-definer trigger on `auth.users` inserts a profile row with timezone UTC and `timezone_confirmed = false`. The app then requires confirmation.
- Derived values (targets, ratios, consistency) are never stored as editable columns.
- Backup & recovery: `src/lib/backup/` builds a complete account export (JSON + per-entity CSV with formula-injection protection; paginated reads past the 1000-row default; archived rows and review snapshots included; no auth secrets). Restore is the security-definer `restore_account_backup(jsonb)`: same-account only (rejects foreign `user_id`), forces `user_id = auth.uid()`, merges by primary/natural keys with `IS DISTINCT FROM` guards (idempotent re-imports write nothing), sets `app.snapshot_write` for review snapshots, and rolls back entirely on any invalid row. No replace-all path exists.

## Theme
- The preference is saved in `profiles.theme`. A pre-paint inline script reads the cached hint (`localStorage["shq-theme"]`) to avoid a flash on load. No user data is stored in localStorage.

## Navigation (UI redesign Phase A)
Real routes: `/` Today, `/week` This week, `/goals`, `/review`, `/history`, `/settings`. The shell header carries the date, today's completion ring and the "How this works" slide-over; sidebar collapses to icons below `lg`, mobile uses a 4-tab bar with a "More" sheet. Shared visual primitives live in `src/components/app/viz.tsx`; surface/state tokens in `src/styles.css`.
Trend and heatmap data come from `rangeLogsQuery` (read-only, invalidated with every log write) and pure functions in `src/lib/calc/trends.ts`; past-week values use current schedules and are labelled as estimates.
