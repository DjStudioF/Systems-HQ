import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { dailyMessage, dueReminders } from "@/lib/calc/reminders";
import { isoWeekday } from "@/lib/date/local-date";

export const Route = createFileRoute("/api/public/jobs/send-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;

        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        const { sendPush } = await import("@/lib/push/send");
        const now = new Date();

        const { data: rows, error } = await db
          .from("notification_settings")
          .select("*, profiles!inner(timezone)")
          .or("daily_enabled.eq.true,review_enabled.eq.true");
        if (error) return Response.json({ error: "load failed" }, { status: 500 });

        let sent = 0;
        for (const row of rows ?? []) {
          const tz = (row.profiles as { timezone: string }).timezone;
          for (const due of dueReminders(row, tz, now)) {
            // Claim the slot first so retries never double-send.
            const { error: claimErr } = await db
              .from("notification_sends")
              .insert({ user_id: row.user_id, slot_key: due.slotKey });
            if (claimErr) continue;

            let msg: { title: string; body: string; url: string; tag: string } | null = null;
            if (due.kind === "daily") {
              const { data: mods } = await db
                .from("modules")
                .select("id, days, goals!inner(lifecycle)")
                .eq("user_id", row.user_id)
                .is("archived_at", null)
                .eq("goals.lifecycle", "active");
              const wd = isoWeekday(due.date);
              const today = (mods ?? []).filter((m) => (m.days as number[]).includes(wd));
              const { data: logs } = await db
                .from("logs")
                .select("module_id")
                .eq("user_id", row.user_id)
                .eq("log_date", due.date);
              const logged = new Set((logs ?? []).map((l) => l.module_id));
              const open = today.filter((m) => !logged.has(m.id)).length;
              const text = dailyMessage(open, today.length);
              if (text) msg = { title: "Today's check-in", body: text, url: "/", tag: "daily" };
              else if (!row.daily_only_if_open && today.length)
                msg = { title: "Today's check-in", body: "All routines checked in. Nice.", url: "/", tag: "daily" };
            } else {
              const { data: rev } = await db
                .from("weekly_reviews")
                .select("state")
                .eq("user_id", row.user_id)
                .eq("week_start", due.weekStart)
                .maybeSingle();
              if (rev?.state !== "submitted" || !row.review_only_if_open)
                msg = {
                  title: "Weekly review",
                  body: "Take five minutes to look back on this week.",
                  url: "/review",
                  tag: "review",
                };
            }
            if (!msg) continue;

            const { data: subs } = await db
              .from("push_subscriptions")
              .select("id, endpoint, p256dh, auth")
              .eq("user_id", row.user_id);
            for (const s of subs ?? []) {
              const r = await sendPush(s, msg).catch(() => "error" as const);
              if (r === "ok") sent++;
              if (r === "gone") await db.from("push_subscriptions").delete().eq("id", s.id);
            }
          }
        }
        return Response.json({ success: true, sent });
      },
    },
  },
});
