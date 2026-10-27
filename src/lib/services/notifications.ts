import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";

export type NotificationSettings = Tables<"notification_settings">;
export const VAPID_PUBLIC_KEY =
  "BM2mmm1inkE1cBV8URtqOzf4GT8cCqBNtttlDHPgGGQnih65eWMaVrOmN4MeiFygDzLZZrhPetT2mZ5B8bXQqvo";
const SW_URL = "/push-sw.js";
const SW_SCOPE = "/push/";

export const notificationKeys = {
  settings: (userId: string) => ["account", userId, "notification-settings"] as const,
  devices: (userId: string) => ["account", userId, "push-devices"] as const,
};

export const DEFAULT_SETTINGS = {
  daily_enabled: false,
  daily_times: ["20:00"],
  daily_days: [1, 2, 3, 4, 5, 6, 7],
  daily_only_if_open: true,
  review_enabled: false,
  review_day: 7,
  review_time: "18:00",
  review_only_if_open: true,
};

export const notificationSettingsQuery = (userId: string) =>
  queryOptions({
    queryKey: notificationKeys.settings(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data ?? { ...DEFAULT_SETTINGS, user_id: userId, updated_at: "" };
    },
  });

export const devicesQuery = (userId: string) =>
  queryOptions({
    queryKey: notificationKeys.devices(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("id, endpoint, device_label, created_at")
        .eq("user_id", userId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

export async function saveNotificationSettings(
  userId: string,
  patch: Omit<TablesUpdate<"notification_settings">, "user_id" | "updated_at">,
) {
  const { data, error } = await supabase
    .from("notification_settings")
    .upsert({ ...patch, user_id: userId }, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) throw new Error("Couldn't save notification settings.");
  return data;
}

export type PushSupport = "supported" | "unsupported" | "ios-needs-install";

export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (ok) return "supported";
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return ios ? "ios-needs-install" : "unsupported";
}

function keyBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration() {
  return (
    (await navigator.serviceWorker.getRegistration(SW_SCOPE)) ??
    (await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE }))
  );
}

function deviceLabel() {
  const ua = navigator.userAgent;
  const os = /android/i.test(ua) ? "Android" : /iphone|ipad/i.test(ua) ? "iOS" : /mac/i.test(ua) ? "Mac" : /windows/i.test(ua) ? "Windows" : "Device";
  const br = /edg\//i.test(ua) ? "Edge" : /chrome/i.test(ua) ? "Chrome" : /firefox/i.test(ua) ? "Firefox" : /safari/i.test(ua) ? "Safari" : "Browser";
  return `${os} · ${br}`;
}

/** Asks permission, subscribes this device, and stores it. */
export async function enableThisDevice(userId: string): Promise<string> {
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Notifications are blocked for this site in your browser settings.");
  const reg = await registration();
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }));
  const j = sub.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert(
    { user_id: userId, endpoint: sub.endpoint, p256dh: j.keys?.['p256dh'] ?? "", auth: j.keys?.['auth'] ?? "", device_label: deviceLabel() },
    { onConflict: "endpoint" },
  );
  if (error) throw new Error("Couldn't register this device.");
  return sub.endpoint;
}

export async function currentEndpoint(): Promise<string | null> {
  if (pushSupport() !== "supported") return null;
  const reg = await navigator.serviceWorker.getRegistration(SW_SCOPE);
  const sub = await reg?.pushManager.getSubscription();
  return sub?.endpoint ?? null;
}

export async function removeDevice(id: string, endpoint: string) {
  const { error } = await supabase.from("push_subscriptions").delete().eq("id", id);
  if (error) throw new Error("Couldn't remove the device.");
  if ((await currentEndpoint()) === endpoint) {
    const reg = await navigator.serviceWorker.getRegistration(SW_SCOPE);
    await (await reg?.pushManager.getSubscription())?.unsubscribe();
  }
}
