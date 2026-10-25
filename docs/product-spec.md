# Systems HQ — Product spec (condensed)

The core loop is **Goal → Modules → Daily check-in → Weekly review → Adjust**.

## Definitions
- **Goal**: something important to achieve or sustain. It has a mode (focus or maintain) and a lifecycle (active, completed or archived).
- **Module**: a repeatable behaviour for one goal. It has a trigger, an action, a minimum, and ISO weekdays (Monday = 1 through Sunday = 7).
- **Log**: one status (done, minimum or skipped) per module per local calendar date.
- **Weekly review**: reflection plus a server-captured metrics snapshot.

## Core principle
Daily logging takes one tap per module and no typing. The only daily inputs are Done, Minimum and Skipped.

## Key rules (implemented in later stages)
- Weekly target is the number of selected days. It's never prorated.
- Done and Minimum each earn 1. Skipped earns 0. A day with no log is not the same as Skipped.
- A module's week ratio is `min(successes / target, 1)`. When the target is 0, the ratio is null and shows "No schedule".
- Goal consistency is the unweighted mean of eligible module ratios. It's compared against the threshold (default 0.8) using unrounded values.
- The time-elapsed bar is calendar-day based and clamped to 0–1. It is labelled "Time elapsed", never "completion".
- "Today" follows the profile timezone. Weeks run Monday to Sunday and are identified by Monday's date.

## Non-goals (v1)
AI coaching, payments, teams or social features, streak penalties, badges, notifications, calendar or Notion integration, timers, offline sync, analytics dashboards, and a marketing site.

## Stage status
- [x] Stage 1: foundation (schema, row-level security, auth, profile and timezone, theme, empty dashboard shell, design preview)
- [x] Stage 2: goals and modules, archive, calculation helpers
- [ ] Stage 3: daily logging, This week, goal metrics
- [ ] Stage 4: history, weekly reviews, snapshots
- [ ] Stage 5: export and restore
- [ ] Stage 6: audit, browser tests, launch
