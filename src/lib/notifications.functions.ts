import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Sends a test notification to every device the signed-in owner registered. */
export const sendTestNotificationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: subs, error } = await context.supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth");
    if (error) throw new Error("Couldn't load your devices.");
    if (!subs?.length) throw new Error("No device is set up for notifications yet.");
    const { sendPush } = await import("@/lib/push/send");
    let sent = 0;
    for (const s of subs) {
      const r = await sendPush(s, {
        title: "Systems HQ",
        body: "Test notification — reminders will look like this.",
        url: "/",
        tag: "test",
      });
      if (r === "ok") sent++;
      if (r === "gone") await context.supabase.from("push_subscriptions").delete().eq("id", s.id);
    }
    if (sent === 0) throw new Error("The device didn't accept the notification. Try turning it off and on again.");
    return { sent };
  });
