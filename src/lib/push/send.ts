/**
 * Server-only Web Push sender. Import dynamically inside server handlers.
 */
import { buildPushPayload } from "@block65/webcrypto-web-push";

export type PushTarget = { id: string; endpoint: string; p256dh: string; auth: string };
export type PushBody = { title: string; body: string; url: string; tag: string };

/** Sends to one subscription. Returns "gone" when the device unsubscribed. */
export async function sendPush(sub: PushTarget, msg: PushBody): Promise<"ok" | "gone" | "error"> {
  const publicKey = process.env["VAPID_PUBLIC_KEY"];
  const privateKey = process.env["VAPID_PRIVATE_KEY"];
  if (!publicKey || !privateKey) throw new Error("Push keys are not configured");
  const payload = await buildPushPayload(
    { data: JSON.stringify(msg), options: { ttl: 60 * 60, topic: msg.tag.slice(0, 32) } },
    { endpoint: sub.endpoint, expirationTime: null, keys: { p256dh: sub.p256dh, auth: sub.auth } },
    { subject: "mailto:notifications@systemshq.app", publicKey, privateKey },
  );
  const res = await fetch(sub.endpoint, payload as RequestInit);
  if (res.status === 404 || res.status === 410) return "gone";
  return res.ok ? "ok" : "error";
}
