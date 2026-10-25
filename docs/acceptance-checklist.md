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

## Later stages
All calculation, mutation, review, backup and browser tests in spec §17: NOT RUN (not yet built).
