# Architecture

## Stack
- TanStack Start v1 (React 19, Vite 7), running server-side on an edge worker.
- TanStack Router with file routes in `src/routes`.
- TanStack Query for the cache. Zod for validation. Tailwind v4 with shadcn/Radix primitives.
- Backend: Lovable Cloud (managed Postgres, auth and row-level security).
- Migrations live in `drizzle/migrations/` and are applied through the Lovable migration tool. The first one is `0000_migration.sql`.

## Layout
- `src/lib/date/`: pure calendar helpers with an injected clock (`localToday(tz, now)`). Dates are `YYYY-MM-DD` strings and are never parsed as UTC instants for display.
- `src/lib/validation/`: shared Zod schemas.
- `src/lib/services/`: data access. Query keys always start with `["account", userId, ...]`.
- `src/lib/auth/`: sign-out teardown and redirect sanitising.
- `src/components/app/`: app components. `src/components/ui/` holds the primitives, including the logging button variants.
- `src/routes/_authenticated/`: protected pages (`/`, `/settings`, `/history`). These are client-only (`ssr: false`).
- Public pages: `/login`, `/forgot-password` and `/reset-password`. `/dev/design` exists only in development (it returns not-found when `import.meta.env.DEV` is false).

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
  - `reviews_guard`: snapshot and state fields are writable only by server functions. A session flag will be set by the Stage 4 functions.
  - `validate_profile`: checks the IANA timezone against `pg_timezone_names`.
  - `set_updated_at`: maintains audit timestamps.
- Profile bootstrap: a security-definer trigger on `auth.users` inserts a profile row with timezone UTC and `timezone_confirmed = false`. The app then requires confirmation.
- Derived values (targets, ratios, consistency) are never stored as editable columns.

## Theme
- The preference is saved in `profiles.theme`. A pre-paint inline script reads the cached hint (`localStorage["shq-theme"]`) to avoid a flash on load. No user data is stored in localStorage.
