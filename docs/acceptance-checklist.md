# Acceptance checklist

Status values: PASS / FAIL / NOT RUN. Updated at the end of each stage.

## Stage 1
| Check | Status | Notes |
|---|---|---|
| Unit: localToday in two timezones | PASS | vitest |
| Unit: open tab crosses local midnight | PASS | vitest (helper level) |
| Unit: Sunday/Monday, month/year, DST day counts | PASS | vitest |
| Unit: timezone validator, profile schema, theme resolution, text bar | PASS | vitest |
| Typecheck (tsgo) | PASS | |
| Lint (eslint) | PASS | |
| Owner A cannot read/mutate Owner B rows (RLS) | NOT RUN (live) | Policies verified in the catalogue: every table has row-level security scoped to auth.uid(). Simulating users is blocked in the sandbox |
| Anonymous cannot read/write private tables | PASS | Anonymous requests get 42501 on goals, profiles and logs; anon has no privileges |
| Foreign-owned goal/module relationship rejected | NOT RUN (live) | Enforced by composite FKs; needs two real accounts |
| Signed-out redirect to /login | PASS | /settings goes to /login?redirect=%2Fsettings |
| Public sign-up disabled | PASS | Auth API returns signup_disabled |
| Design preview light/dark, mobile login layout | PASS | screenshots |
| Login with real account, timezone confirm, settings persist on refresh | NOT RUN | needs the owner account created manually |
| Password reset email delivery | NOT RUN | needs a real inbox |
| No privileged secrets in client bundle | PASS | No service-role use in app code; security scan clean |

## Stage 2
| Check | Status | Notes |
|---|---|---|
| Unit: full-week target, ratio cap, no-schedule => null, unweighted consistency, unrounded 0.8 threshold, clamped time elapsed | PASS | vitest, 10 new tests in src/lib/calc/consistency.test.ts |
| Typecheck (tsgo) | PASS | |
| Lint (eslint) | PASS | 0 errors; 7 pre-existing warnings in the shadcn ui kit |
| Browser: create goal + routine (onboarding prompt), edit, reload persistence | PASS | signed-in preview run; data intact after reload |
| Browser: archive/restore routine, archive/restore goal (routines follow the goal) | PASS | screenshots in the test run |
| Test records removed afterwards | PASS | account back to 0 goals / 0 routines |
| Validation: deadline before start rejected, blank names rejected, days unique+sorted 1–7 | PASS | Zod schemas + DB constraints (23514/23503 mapped to friendly errors) |

## Stage 3
| Check | Status | Notes |
|---|---|---|
| Unit: Done/Minimum count as successes, Skipped and no-log count zero | PASS | vitest, countSuccesses in src/lib/calc/consistency.test.ts (25 tests total) |
| Typecheck (tsgo) | PASS | |
| Lint (eslint) | PASS | 0 errors on new/changed files; 7 pre-existing ui-kit warnings |
| Browser: one-tap Done, correction to Minimum, Undo back to Done, Clear entry | PASS | signed-in preview run; Undo only appears after a correction, Clear entry when a log exists |
| Browser: log persists across reload; week strip shows the day; goal consistency and time elapsed render | PASS | screenshots in the test run |
| Atomic unique daily writes | PASS | single upsert on UNIQUE(user_id, module_id, log_date); revision bumped by logs_guard trigger |
| Offline read-only state | PASS (code path) | navigator.onLine banner + disabled check-ins; not exercised with a real network drop |
| Local midnight / Monday rollover | PASS (code path) | useLocalToday re-reads the clock on focus/visibility/60s interval; week range and log query key derive from it |
| Test records removed afterwards | PASS | test goal/routine archived, all test check-ins deleted; 0 logs remain for the test date |

## Stage 4
| Check | Status | Notes |
|---|---|---|
| Migration: start/submit weekly review functions with server-computed frozen snapshot | PASS | drizzle/migrations/0002_weekly_review_functions.sql; snapshot write gated by app.snapshot_write session flag |
| Typecheck (tsgo), lint, vitest | PASS | 25 tests; 0 lint errors on new files |
| Browser: draft text survives reload | PASS | saved draft reloaded intact |
| Browser: reopening the week creates no duplicate | PASS | three separate visits returned the same row (UNIQUE + get-or-create) |
| Browser: submitted snapshot unchanged after schedule edit | PASS | routine schedule changed to Mondays-only after submit; snapshot still shows the frozen 7-day target |
| Browser: past week without snapshot shows honest limitation | PASS | "No metrics snapshot was captured… can't be reconstructed" |
| Browser: save failure keeps entered text + Retry | PASS | network blocked during save; error shown, textarea text intact, retry succeeded |
| Browser: unsaved-change protection | PASS | navigation blocked with "Leave without saving?" dialog; beforeunload armed |
| Browser: history pagination, filters, per-row correction and clear | PASS | filters in URL search params; corrections bump revision, "edited N×" shown |
| Test records removed afterwards | PASS | test logs/reviews deleted; test goals/routines archived; 0 logs, 0 reviews remain |

## Stage 5
| Check | Status | Notes |
|---|---|---|
| Unit: CSV escaping and formula-injection protection | PASS | vitest, src/lib/backup/backup.test.ts |
| Unit: backup validation rejects bad JSON, wrong version, bad enums/dates; preview counts + account match | PASS | vitest |
| Typecheck (tsgo), lint, vitest | PASS | 31 tests; 0 lint errors on new files |
| Export includes archived goals/modules, review snapshots, all rows; no auth secrets or email | PASS | inspected downloaded backup.json |
| Browser: JSON + CSV downloads deliver real files | PASS | Playwright expect_download; non-zero, well-formed |
| Round-trip: export → wipe test records → restore → identical data (archived module, log revision 1, review snapshot) | PASS | isolated TEST-S5 records; verified in the database |
| Idempotency: second import of the same file writes nothing | PASS | UI reported "0 goals, 0 routines, 0 check-ins and 0 reviews" |
| Foreign-account backup rejected; malformed file rejected before sending | PASS | crafted foreign user_id file; invalid JSON file |
| Explicit confirmation required before restore | PASS | restore button disabled until the checkbox is checked |
| Zero partial writes on failure | PASS (by construction) | single transactional SQL function; any invalid row rolls back |
| Cross-account restore with two live accounts | NOT RUN | only one account exists in this workspace; rejection verified with a crafted foreign-id file |
| Test records removed afterwards | PASS | TEST-S5 rows deleted; review draft removed |

## Later stages
Remaining browser tests in spec §17: NOT RUN (Stage 6).

## Stage 6 (audit)
| Check | Status | Notes |
|---|---|---|
| Typecheck, lint (whole repo), vitest 31 tests | PASS | generated files excluded from lint |
| Anonymous access to all tables refused | PASS | 42501 on every table |
| Owner A/B isolation | PASS (catalogue) | RLS + composite FKs inspected; only one live account exists |
| Desktop/mobile, light/dark, keyboard, reduced motion, offline, signed-out redirect, reload | PASS | Playwright |
| Dev-only route removed; TEST- records purged | PASS | 1 goal / 1 routine remain (user's own) |
