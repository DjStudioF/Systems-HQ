import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/app/States";
import { backupCsv, buildBackup, deliverFile } from "@/lib/backup/export";
import {
  parseBackupFile,
  summarizeBackup,
  type BackupPreview,
  type ParsedBackup,
} from "@/lib/backup/restore";
import { restoreBackupFn } from "@/lib/backup.functions";

/**
 * Backup & recovery. Export downloads the complete account (JSON or CSV).
 * Restore validates the file, previews what it contains, and only merges
 * after explicit confirmation — same account only, never replace-all.
 */
export function BackupSection({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ backup: ParsedBackup; preview: BackupPreview } | null>(
    null,
  );
  const [parseError, setParseError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const restoreFn = useServerFn(restoreBackupFn);
  const restore = useMutation({
    mutationFn: (backup: ParsedBackup) => restoreFn({ data: { backup } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["account", userId] });
      setPending(null);
      setConfirmed(false);
    },
  });

  const doExport = async (kind: "json" | "goals" | "modules" | "logs" | "weekly_reviews") => {
    setExporting(kind);
    setExportError(null);
    try {
      const backup = await buildBackup(userId);
      const stamp = new Date().toISOString().slice(0, 10);
      if (kind === "json") {
        await deliverFile(
          new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }),
          `systems-hq-backup-${stamp}.json`,
        );
      } else {
        await deliverFile(
          new Blob([backupCsv(backup, kind)], { type: "text/csv;charset=utf-8" }),
          `systems-hq-${kind}-${stamp}.csv`,
        );
      }
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Couldn't export your data.");
    } finally {
      setExporting(null);
    }
  };

  const onFile = async (file: File) => {
    setParseError(null);
    setConfirmed(false);
    restore.reset();
    const parsed = parseBackupFile(await file.text());
    if (!parsed.ok) {
      setPending(null);
      setParseError(parsed.message);
      return;
    }
    setPending({ backup: parsed.backup, preview: summarizeBackup(parsed.backup, userId) });
  };

  return (
    <section aria-labelledby="backup-h" className="mt-10 max-w-xl border-t pt-6">
      <h2 id="backup-h" className="text-xl font-semibold tracking-tight">
        Backup & recovery
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Export everything — including archived goals and review snapshots — or restore a JSON
        backup into this account. Restore merges; it never deletes anything.
      </p>

      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={exporting !== null}
            onClick={() => doExport("json")}
          >
            {exporting === "json" ? "Preparing…" : "Download JSON backup"}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">CSV:</span>
          {(
            [
              ["goals", "Goals"],
              ["modules", "Routines"],
              ["logs", "Check-ins"],
              ["weekly_reviews", "Reviews"],
            ] as const
          ).map(([kind, label]) => (
            <Button
              key={kind}
              variant="ghost"
              size="sm"
              disabled={exporting !== null}
              onClick={() => doExport(kind)}
            >
              {exporting === kind ? "Preparing…" : label}
            </Button>
          ))}
        </div>
        {exportError && <ErrorState message={exportError} />}
      </div>

      <div className="mt-8 space-y-3">
        <h3 className="text-sm font-medium">Restore from a JSON backup</h3>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            e.target.value = "";
          }}
        />
        <Button variant="outline" onClick={() => fileInput.current?.click()}>
          Choose backup file
        </Button>
        {parseError && <ErrorState message={parseError} />}

        {pending && (
          <div className="surface space-y-4 p-4">
            <p className="text-sm font-medium text-foreground">This backup contains:</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>
                {pending.preview.goals} goals
                {pending.preview.archivedGoals > 0 &&
                  ` (${pending.preview.archivedGoals} archived)`}
              </li>
              <li>
                {pending.preview.modules} routines
                {pending.preview.archivedModules > 0 &&
                  ` (${pending.preview.archivedModules} archived)`}
              </li>
              <li>{pending.preview.logs} check-ins</li>
              <li>
                {pending.preview.reviews} weekly reviews
                {pending.preview.submittedReviews > 0 &&
                  ` (${pending.preview.submittedReviews} submitted)`}
              </li>
            </ul>
            {!pending.preview.sameAccount ? (
              <ErrorState message="This backup belongs to a different account. Restore is same-account only." />
            ) : (
              <>
                <label className="flex items-start gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  I understand this merges the backup into my account. Existing records are
                  updated where they differ; nothing is deleted.
                </label>
                <div className="flex gap-2">
                  <Button
                    disabled={!confirmed || restore.isPending}
                    onClick={() => restore.mutate(pending.backup)}
                  >
                    {restore.isPending ? "Restoring…" : "Restore this backup"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setPending(null);
                      setConfirmed(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {restore.isError && (
          <ErrorState
            message={restore.error.message}
            onRetry={pending ? () => restore.mutate(pending.backup) : undefined}
          />
        )}
        {restore.isSuccess && (
          <p role="status" className="rounded-xl border border-primary/40 bg-primary-soft p-4 text-sm text-foreground">
            Restore complete — {restore.data.goals} goals, {restore.data.modules} routines,{" "}
            {restore.data.logs} check-ins and {restore.data.reviews} reviews added or updated.
          </p>
        )}
      </div>
    </section>
  );
}
