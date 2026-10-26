# Visual polish pass (no behavior or data changes)

One build round, one screenshot check at the end (desktop + phone, light + dark). Nothing about saving, rules, or the database changes.

## 1. Alignment and spacing
- One page rhythm everywhere: page title, then 24px gap, then content; sections separated by 32px.
- Page headers (Today, This week, Goals, History, Review, Settings) share one header layout: title left, meta or action right, aligned on the same baseline, wrapping cleanly on phone.
- Card padding: Today cards 20px, This week table rows tight (8–12px), Goal cards 24px — kept deliberately different per the redesign, but consistent within each page.
- Align the summary strip, table and trend chart on This week to the same left edge and corner radius.

## 2. Consistent control heights
- Three sizes only: 32px (compact, tables), 40px (forms, header actions), 48px (Today check-in buttons).
- Inputs, selects and buttons on History filters and Settings use the 40px size so they line up in a row.
- Icon-only buttons (help, dismiss, menu) become a uniform 44px tap square.

## 3. Readable routine cards (Today)
- Clear order: routine name, then goal tag + "After:" line, then the 7-day dots with a tiny "Last 7 days" caption, then the buttons.
- Trigger text limited to two lines with a soft fade, full text on hover/long-press.
- Done takes most of the width; Min and Skip stay quieter but show their label and icon at a readable size.

## 4. Selected / saving / error states
- Saving: the pressed button shows a small spinner and the card dims slightly until the save confirms; other buttons on that card are disabled meanwhile.
- Saved: the existing settled chip ("Done · 9:14") with the state-colored border, plus a short fade-in.
- Error: the card gets a rose border and an inline "Not saved — Retry" line on that specific card (in addition to the existing message), so it is obvious which routine failed.
- Focus: one consistent focus ring (teal, 2px, offset) on every interactive element, including cards and table rows.

## 5. Goal-card hierarchy
- Top row: small status label (Active / Maintain / Completed) and the consistency ring with a "this week" caption under it.
- Name as the dominant line, why as one muted line beneath.
- Divider, then a single meta line (routines, deadline, time elapsed) and the heatmap with a "12 weeks" caption.
- Equal card heights in the two-column grid; archived cards visibly muted.

## 6. Mobile usability
- Header: date shortens to "Mon, Oct 26"; ring and help stay thumb-reachable.
- Bottom bar respects the phone's safe area (no overlap with the home indicator); content gets matching bottom space.
- This week: on phones the table becomes stacked rows (name + status chip on top, day squares + count below) instead of sideways scrolling.
- History filters stack full-width; goal detail action buttons wrap into a tidy row.

## 7. Light/dark consistency
- Audit every page in both themes; replace any remaining one-off colors with the shared tokens.
- Check the state colors (green/amber/rose/grey) and muted text meet contrast in both themes; adjust token values only.
- Chart lines, heatmap squares, borders and popovers use the same surface levels in both themes.

## Technical details
- Files touched: `src/styles.css` (tokens, safe-area utility), `components/ui/button.tsx` (size scale), `TodaySection.tsx`, `GoalCard.tsx`, `week.tsx`, `history.tsx`, `settings.tsx`, `AppShell.tsx`, `charts.tsx`, `viz.tsx`.
- Per-card saving/error state uses the existing mutation's pending action and failed action — no new logic, only display.
- Existing tests must still pass; no new tests needed since rules are unchanged.
