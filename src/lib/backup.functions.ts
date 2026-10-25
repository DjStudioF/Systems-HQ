import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Transactional same-account restore. The SQL function validates ownership,
 * merges by primary/natural keys (idempotent), and rolls back entirely on
 * any invalid row — zero partial writes.
 */
export const restoreBackupFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { backup: unknown }) => input)
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("restore_account_backup", {
      p_backup: data.backup,
    });
    if (error) {
      if (error.message.includes("different account")) {
        throw new Error("This backup belongs to a different account. Restore is same-account only.");
      }
      throw new Error("Restore failed — nothing was written. Check the file and retry.");
    }
    return result as { goals: number; modules: number; logs: number; reviews: number };
  });
