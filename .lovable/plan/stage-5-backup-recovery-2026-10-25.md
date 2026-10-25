# Stage 5 — Backup & recovery

## Export (complete, account-scoped)

- **JSON export**: profile (display name, timezone, theme, threshold, motto —
  no auth secrets, no email), all goals, modules, logs, and weekly reviews
  **including archived records and frozen review snapshots**. Fetched with
  paginated reads past the 1000-row default, so nothing is truncated.
- **CSV exports**: one file per entity (goals, modules, logs, reviews). A pure
  `toCsv` helper handles quoting/escaping and prefixes formula-injection
  characters (`=`, `+`, `-`, `@`, tab, CR) with `'`. Unit-tested.
- Delivery: browser-generated Blob downloads (iOS-safe share/download helper).

## Restore (validated, same-account, JSON only)

- **Client-side validation + preview**: Zod schema parses the file; the
  preview shows per-entity counts (incl. archived) and confirms the backup
  belongs to this account before anything is sent.
- **Explicit confirmation**: a checkbox plus a confirm button; no restore on
  file select alone.
- **Transactional merge in one Postgres function**
  `restore_account_backup(jsonb)` (security definer, single transaction):
  - Rejects backups whose `user_id` differs from the caller (same-account
    only; no cross-account migration).
  - Forces `user_id = auth.uid()` on every row; composite FKs keep
    parent/child ownership consistent.
  - Upserts by primary/natural keys with `WHERE ... IS DISTINCT FROM` guards,
    so re-importing the same file changes nothing (idempotent) and identical
    logs don't bump revisions.
  - Invalid enum/date/shape anywhere aborts the whole transaction — zero
    partial writes.
  - Sets the `app.snapshot_write` flag so review snapshots restore intact.
- No destructive replace-all: restore only ever merges.

## Build

1. Migration: `restore_account_backup(jsonb)` + grants.
2. `src/lib/backup/export.ts` — paginated fetch-all, JSON builder, `toCsv`
   (+ formula protection), blob download helper.
3. `src/lib/backup/restore.ts` — Zod schema, preview summariser (pure,
   tested), and `src/lib/backup.functions.ts` server fn wrapping the RPC.
4. Settings page: "Backup & recovery" section — export buttons, restore file
   picker, validation errors, preview, confirmation, result summary.
5. Tests: vitest for `toCsv` (escaping, injection) and the preview/validation
   logic; typecheck + lint.
6. Verification: round-trip with isolated TEST-S5 records in the preview —
   export, wipe the test records, restore, verify identical data incl.
   archived module + review snapshot; re-import proves idempotency; a
   foreign-account backup is rejected; a malformed file is rejected before
   sending. Test records removed afterward. (A second real account isn't
   available in this workspace, so cross-account rejection is verified with a
   crafted foreign-id file rather than two live accounts.)
7. Update docs/architecture.md, acceptance-checklist.md, roadmap.md.

## Not in this stage

Replace-all restore, cross-account migration (explicitly out of scope),
audit (Stage 6).
