# Systems HQ UI redesign — Phase 0 plan

Front-end and navigation only. No changes to the database, sign-in, or calculation rules. If any step turns out to need a data change, I stop and ask.

## Conflicts with your earlier rules (please confirm)

Your original spec (saved as project rules) said: no streaks, no badges, no notifications, warm neutrals + one teal accent, no gradients. The brief asks for some of these. Proposed resolution:

| Brief asks | Earlier rule | Proposal |
|---|---|---|
| Streak dots / current + longest streak numbers | No streaks | Keep the 7-day dots (they show history, not a streak). Drop streak counters and streak-milestone confetti. |
| Confetti on milestones | No badges/gamification | Ring-fill animation only when a system hits its weekly target; no confetti. |
| Toasts, review-due banner | No notifications | Allowed: they are in-app feedback, not push notifications. |
| Dark theme as default | Theme follows saved preference (system) | Keep "system" default; deepen dark with 3 surface levels. |
| Geist / General Sans / Satoshi | Satoshi | Keep Satoshi, add tabular numbers. |
| Accent color | Teal #01696F / #65B7BD | Keep teal. Green/amber/rose reserved for state only. |

Approving this plan approves this table. Tell me if you want any row changed.

## Merged phases (fewer review rounds, fewer credits)

Your 8 phases become 4 build phases. I stop after each one for review.

**Phase A — Foundation (your 1 + 2)**
- Design tokens: 3 surface levels per theme, state colors, radius scale, motion speeds, tabular numbers, reduced-motion handling.
- Shared pieces: state chip, ring, 7-cell strip, mini heatmap, chart wrapper, empty state, skeletons.
- Real pages: `/` Today, `/week`, `/goals`, `/goals/:id`, `/review`, `/history`, `/settings`.
- Sidebar: single "Weekly review" entry, collapses to icons on tablet; mobile bottom tabs Today / Week / Goals / More.
- Persistent header: date, today's completion ring, `?` button opening a "How this works" side panel; small info popovers for "minimum" and "below target".

**Phase B — Today (your 3)**
- Responsive grid of check-in cards (min ~320px): name, goal chip, trigger, 7-day dots.
- Big Done button; smaller Minimum and Skipped beside it.
- After check-in: collapses to "Done · 9:14" chip, state-colored border, card recedes and moves below unfinished ones; click chip or toast to undo.
- All-done state: filled ring, short line of copy, day summary.
- Review-due banner from Sunday; toasts bottom-right (~4s, Undo); error toasts with Retry.
- Keyboard: 1/2/3 to mark, J/K or arrows to move, hint shown.

**Phase C — This week + Goals (your 4 + 5)**
- Week: summary strip (range, check-ins vs target, consistency % with change vs last week), dense table with crisp Mon–Sun cells (filled / half / hollow / dimmed, today outlined, future faint), count, micro bar, status chip; expandable rows with that system's trend; quiet "standard may be too high" hint after 2+ weeks below target; 8–12 week trend line with dashed target.
- Goals index: typographic cards, why line, small ring, routine count + deadline, 12-week mini heatmap, status chip, deliberate "Time elapsed — not a measure of completion" note.
- Goal detail: why as pull quote, its systems, full heatmap, trend chart, pace vs deadline. No milestone list (no data for it).

**Phase D — History + polish (your 6 + 7)**
- History: full heatmap with day tooltips, stacked weekly done/minimum/skipped bars, existing filters kept.
- Empty states for every chart and page, skeletons matching layouts, accessibility pass (focus, labels, contrast, shape not just color), mobile pass at 390px.

## Technical details

- Libraries already installed: Recharts (via existing `chart.tsx`), sonner, lucide. No new dependencies.
- Trend/heatmap data: new read-only queries over existing `logs` and `modules`, and pure functions in `src/lib/calc/` (weekly series, heatmap buckets, week delta, pace) with tests. Historic targets use submitted review snapshots where present; weeks without a snapshot are marked as estimates rather than silently reconstructed.
- Existing dashboard sections split into route files; hash anchors removed. `docs/architecture.md`, roadmap and AGENTS.md updated per phase.
- Credit-saving: one browser screenshot pass per phase (desktop + mobile, light + dark), no repeated full audits.
