<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Systems HQ engineering rules
- Read docs/architecture.md before changing structure; keep it current.
- Build in stages; implement only the approved stage (see roadmap.md).
- Calendar dates are `YYYY-MM-DD` strings handled by `src/lib/date/`; never derive "today" from a UTC ISO slice or `new Date()` scattered in components — inject the clock.
- Derived metrics (targets, ratios, consistency, time elapsed) live in `src/lib/calc/` as pure functions with injected dates — never stored, never read the clock directly.
- Query keys start with `["account", userId, ...]`; the root auth listener clears cache on account change.
- Private routes live under `src/routes/_authenticated/` (client-only) — private data must never be server-rendered.
- Every public table: GRANT to authenticated only, RLS by `auth.uid()`, ownership via composite FKs `(parent_id, user_id)`.
- Goals/modules are archived, never hard-deleted; derived metrics are never stored as editable columns.
- Server-maintained fields (revision, audit timestamps, review snapshots) are enforced by triggers, not client code.
- Colors only via semantic tokens in src/styles.css; logging buttons use Button variants done/minimum/skipped with aria-pressed.
- Push reminders: `/push-sw.js` is a push-only worker (scope /push/, never caches); a 15-min managed cron hits /api/public/jobs/send-reminders, which dedupes via notification_sends — keeps reminders exactly-once without an app-shell service worker.
