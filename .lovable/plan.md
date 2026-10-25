# Systems HQ — Staged Plan (Stage 1 detailed)

## Environment (inspected)
- Fresh TanStack Start v1 + React 19 + Vite 7 + Tailwind v4 project, targeting an edge runtime. Placeholder home page, no backend yet, Vitest already set up.
- Router stays TanStack Router (file routes). Data layer: TanStack Query (already installed). Validation: Zod.
- Backend: **Lovable Cloud** (managed Postgres, auth, row-level security). Nothing is connected yet.

## Assumptions and conflicts to confirm
1. **Region**: I can't choose the Cloud region from here. It's set when the backend is created, and you'll get an approval prompt when I turn it on. After that I'll report the region it shows. It can't be moved later.
2. **First owner**: public sign-up is off. You'll create your account yourself in the Cloud Users panel ("Add user" / invite), and I'll give you exact steps in docs/manual-setup.md. The app itself never offers registration.
3. **Satoshi font**: loaded from Fontshare with a system-font fallback.
4. **Server-side rules**: date checks, log upserts, undo with revision checks, snapshots and restore will run as Postgres functions (SECURITY INVOKER, row-level security still applies) plus authenticated server functions. A browser-only check is never the only check.
5. **Design preview** at `/dev/design` is only reachable in development and is left out of production builds.
6. The spec suggests `/goals/:id` etc. These will live under a protected layout. `/login`, `/forgot-password` and `/reset-password` stay public.

## Stages
1. **Foundation** (detailed below)
2. Goals and modules: create/edit, archive/restore, onboarding steps 2–3, shared date and calculation helpers with tests.
3. Daily logging: Today, This week, goal consistency and time-elapsed views, optimistic saves with rollback, undo by revision, offline banner, midnight/Monday rollover.
4. History with filters, weekly reviews, server-side snapshots, unsaved-changes protection.
5. JSON/CSV export and validated, transactional same-account JSON restore.
6. Security, accessibility and performance audit, browser tests, cleanup, launch docs, publish approval.

You review each stage before the next one starts.

## Stage 1 — Scope

### A. Docs
- docs/product-spec.md: condensed spec covering rules, non-goals and definitions.
- docs/architecture.md: stack, folder layout, data and auth flow, cache isolation, decisions taken.
- docs/acceptance-checklist.md: every spec test, marked PASS / FAIL / NOT RUN.
- docs/manual-setup.md: creating the owner account, setting reset-redirect URLs, region note.
- AGENTS.md: architecture rules.

### B. Design system
- Warm-neutral light and dark tokens in oklch, based on the suggested hex values and checked for contrast.
- Teal accent, 8–12px radii, Satoshi type scale, 44px touch targets, visible focus rings, reduced-motion support.
- Theme handling: System / Light / Dark. A small inline script in the page head avoids a flash on load. The choice is saved to the profile and also kept in a local cache before sign-in.
- Small geometric SVG brand mark that works in monochrome.
- `/dev/design` preview (development only): type samples, surfaces, buttons including Done/Minimum/Skipped states, a sample routine row, goal card, form field with error, skeleton/empty/error states, and a theme toggle.

### C. Database (one versioned migration)
- Tables: `profiles`, `goals`, `modules`, `logs`, `weekly_reviews`, with every field and enum from the spec.
- Constraints:
  - nonblank checks on required text, plus length limits
  - deadline on or after start_date
  - days must be unique, sorted and within 1–7 (checked by an immutable function)
  - week_start must be a Monday
  - threshold between 0 and 1
  - timezone must be a valid IANA zone (checked against pg_timezone_names in a trigger)
- Ownership-safe relationships: composite foreign keys `(goal_id, user_id) → goals(id, user_id)` and `(module_id, user_id) → modules(id, user_id)`. A child row can't point at another account's parent, even in a direct request.
- Uniqueness: logs on `(user_id, module_id, log_date)`; weekly_reviews on `(user_id, week_start)`.
- Indexes on owner/date and owner/module/date.
- Triggers:
  - keep `updated_at` current
  - keep `revision` server-maintained (client values ignored)
  - stop a module's goal_id changing once it has logs
  - protect audit fields from client input
- Profile bootstrap: a trigger on new auth users creates the profile with timezone `UTC` and an `onboarded=false` flag. The user then confirms their timezone in the app.
- Grants for authenticated users only (no anon access). Row-level security on every table, with select/insert/update/delete policies scoped to `auth.uid() = user_id`. There's no delete policy on goals and modules, because archiving is the removal method.
- Log write, snapshot and restore functions are deferred to the stages that use them.

### D. Auth
- Email/password sign-in, forgot password, and a `/reset-password` page (recovery flow), plus sign out.
- Public sign-up is disabled in the auth settings, and the app has no sign-up screen.
- A managed protected layout redirects to `/login`. Sessions are restored on reload. An expired session sends you to login with a message.
- One root auth listener. On sign-out or account change, all cached data is cleared, query keys are scoped by user id, and history is replaced.
- Protected pages aren't server-rendered, so no private data enters server responses.

### E. Profile and timezone
- First-run step 1: a timezone confirmation screen that suggests the browser's timezone, with a searchable list of valid zones.
- `/settings`: display name, timezone (with a note that changes apply going forward only), theme, threshold, motto, sign out.

### F. Empty dashboard shell
- Header: brand mark, local date in the profile timezone with a timezone tooltip, editable motto, settings link.
- Sections in the spec's order: Today, This week, Goals, Weekly review, How this works. The first four show empty states ("Create your first goal and routine" leads to the Stage 2 placeholder, clearly labelled "coming in Stage 2", with no fake controls). The fifth is the five-item accordion, fully written.
- Desktop: narrow sidebar with section anchors and links to History and Settings. Mobile: top bar plus bottom navigation, with padding so nothing is covered.
- Every content page gets its own unique title and meta tags.

### G. Checks run at the end of Stage 1
- Unit tests for the timezone validator, local-today helper (two zones and the midnight boundary), theme resolution, and Zod profile schema.
- Security check with SQL under two test users: A can't read or write B's rows, anonymous access is denied, and cross-owner foreign keys are rejected. Test users are removed afterwards.
- Browser pass: login, reset request, redirect when signed out, timezone confirmation, settings save survives a refresh, theme switch, mobile layout, keyboard focus.
- Security scan, and a check that no secrets end up in the client bundle.
- Report every check as PASS / FAIL / NOT RUN, and stop for your review.

## Technical notes
- Folders:
  - `src/lib/date/` (pure functions with an injected clock)
  - `src/lib/validation/` (Zod)
  - `src/lib/services/` (data access)
  - `src/lib/auth/`
  - `src/components/{ui,app}/`
  - `src/routes/_authenticated/…`
  - tests alongside the code under `src/**/*.test.ts`
- No goals, logs or reviews are stored in localStorage. Only the theme hint and the auth session live there.
