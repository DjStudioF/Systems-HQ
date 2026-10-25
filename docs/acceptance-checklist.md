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
| Owner A cannot read/mutate Owner B rows (RLS) | see Stage 1 report | SQL run as two simulated users |
| Anonymous cannot read/write private tables | see Stage 1 report | no anon grants |
| Foreign-owned goal/module relationship rejected | see Stage 1 report | composite FK |
| Signed-out redirect to /login | see Stage 1 report | browser |
| Login with real account, timezone confirm, settings persist on refresh | NOT RUN | needs the owner account created manually |
| Password reset email delivery | NOT RUN | needs a real inbox |
| No privileged secrets in client bundle | see Stage 1 report | |

## Later stages
All calculation, mutation, review, backup and browser tests in spec §17: NOT RUN (not yet built).
