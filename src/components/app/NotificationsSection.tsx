import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WeekdaySelector } from "@/components/app/WeekdaySelector";
import { sendTestNotificationFn } from "@/lib/notifications.functions";
import {
  currentEndpoint,
  devicesQuery,
  enableThisDevice,
  notificationKeys,
  notificationSettingsQuery,
  pushSupport,
  removeDevice,
  saveNotificationSettings,
  type NotificationSettings,
  type PushSupport,
} from "@/lib/services/notifications";

const TIMES = Array.from({ length: 96 }, (_, i) => {
  const h = String(Math.floor(i / 4)).padStart(2, "0");
  return `${h}:${String((i % 4) * 15).padStart(2, "0")}`;
});
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MAX_TIMES = 4;

export function NotificationsSection({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const settings = useQuery(notificationSettingsQuery(userId));
  const devices = useQuery(devicesQuery(userId));
  const [support, setSupport] = useState<PushSupport>("unsupported");
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [thisEndpoint, setThisEndpoint] = useState<string | null>(null);

  useEffect(() => {
    const s = pushSupport();
    setSupport(s);
    if (s === "supported") {
      setPermission(Notification.permission);
      void currentEndpoint().then(setThisEndpoint);
    }
  }, []);

  const save = useMutation({
    mutationFn: (patch: Partial<NotificationSettings>) => saveNotificationSettings(userId, patch),
    onMutate: async (patch) => {
      const key = notificationKeys.settings(userId);
      const prev = qc.getQueryData<NotificationSettings>(key);
      if (prev) qc.setQueryData(key, { ...prev, ...patch });
      return { prev };
    },
    onError: (e: Error, _p, ctx) => {
      if (ctx?.prev) qc.setQueryData(notificationKeys.settings(userId), ctx.prev);
      toast.error(e.message);
    },
    onSuccess: (data) => qc.setQueryData(notificationKeys.settings(userId), data),
  });

  const enable = useMutation({
    mutationFn: () => enableThisDevice(userId),
    onSuccess: (ep) => {
      setThisEndpoint(ep);
      setPermission("granted");
      void qc.invalidateQueries({ queryKey: notificationKeys.devices(userId) });
      toast.success("Notifications are on for this device");
    },
    onError: (e: Error) => {
      if (support === "supported") setPermission(Notification.permission);
      toast.error(e.message);
    },
  });

  const remove = useMutation({
    mutationFn: (d: { id: string; endpoint: string }) => removeDevice(d.id, d.endpoint),
    onSuccess: (_r, d) => {
      if (d.endpoint === thisEndpoint) setThisEndpoint(null);
      void qc.invalidateQueries({ queryKey: notificationKeys.devices(userId) });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const testFn = useServerFn(sendTestNotificationFn);
  const test = useMutation({
    mutationFn: () => testFn(),
    onSuccess: (r) => toast.success(`Test sent to ${r.sent} device${r.sent === 1 ? "" : "s"}`),
    onError: (e: Error) => toast.error(e.message),
  });

  const s = settings.data;
  const thisRegistered = !!thisEndpoint && !!devices.data?.some((d) => d.endpoint === thisEndpoint);
  const hasDevices = (devices.data?.length ?? 0) > 0;

  return (
    <section className="mt-10 max-w-xl border-t pt-6" aria-labelledby="notif-h">
      <h2 id="notif-h" className="flex items-center gap-2 text-lg font-semibold">
        <Bell className="h-5 w-5" aria-hidden /> Notifications
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Quiet, opt-in reminders. Nothing is sent until you turn a reminder on and allow this device.
      </p>

      {/* Device */}
      <div className="surface mt-4 space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">This device</p>
            <p className="text-sm text-muted-foreground">
              {support === "ios-needs-install"
                ? "On iPhone, add Systems HQ to your Home Screen first, then open it from there."
                : support === "unsupported"
                  ? "This browser can't receive notifications."
                  : permission === "denied"
                    ? "Blocked. Allow notifications for this site in your browser settings."
                    : thisRegistered
                      ? "Receiving notifications."
                      : "Not receiving notifications."}
            </p>
          </div>
          {support === "supported" && permission !== "denied" && !thisRegistered && (
            <Button onClick={() => enable.mutate()} disabled={enable.isPending}>
              {enable.isPending ? "Allowing…" : "Allow on this device"}
            </Button>
          )}
          {thisRegistered && (
            <Button variant="outline" onClick={() => test.mutate()} disabled={test.isPending}>
              {test.isPending ? "Sending…" : "Send test"}
            </Button>
          )}
        </div>
        {hasDevices && (
          <ul className="divide-y rounded-md border">
            {devices.data!.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span>
                  {d.device_label || "Device"}
                  {d.endpoint === thisEndpoint && (
                    <span className="ml-2 text-muted-foreground">(this device)</span>
                  )}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove ${d.device_label || "device"}`}
                  disabled={remove.isPending}
                  onClick={() => remove.mutate({ id: d.id, endpoint: d.endpoint })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {s && (
        <div className="mt-4 space-y-4">
          {/* Daily */}
          <div className="surface space-y-4 p-4">
            <ToggleRow
              id="daily"
              title="Daily check-in reminder"
              hint="A nudge to check in on today's routines."
              checked={s.daily_enabled}
              onChange={(v) => save.mutate({ daily_enabled: v })}
            />
            {s.daily_enabled && (
              <>
                <div className="space-y-2">
                  <Label>At</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    {s.daily_times.map((t, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <TimeSelect
                          label={`Reminder time ${i + 1}`}
                          value={t}
                          onChange={(v) => {
                            const next = [...s.daily_times];
                            next[i] = v;
                            save.mutate({ daily_times: [...new Set(next)].sort() });
                          }}
                        />
                        {s.daily_times.length > 1 && (
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Remove ${t}`}
                            onClick={() =>
                              save.mutate({ daily_times: s.daily_times.filter((_, j) => j !== i) })
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {s.daily_times.length < MAX_TIMES && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const free = ["12:00", "08:00", "17:00", "21:00"].find(
                            (x) => !s.daily_times.includes(x),
                          )!;
                          save.mutate({ daily_times: [...s.daily_times, free].sort() });
                        }}
                      >
                        <Plus className="mr-1 h-4 w-4" /> Add time
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Up to {MAX_TIMES} a day, in your timezone.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>On</Label>
                  <WeekdaySelector
                    value={s.daily_days}
                    onChange={(days) => days.length && save.mutate({ daily_days: days })}
                  />
                </div>
                <ToggleRow
                  id="daily-open"
                  title="Only if something is still open"
                  hint="Skip the reminder once every routine for today is checked in."
                  checked={s.daily_only_if_open}
                  onChange={(v) => save.mutate({ daily_only_if_open: v })}
                />
              </>
            )}
          </div>

          {/* Weekly review */}
          <div className="surface space-y-4 p-4">
            <ToggleRow
              id="review"
              title="Weekly review reminder"
              hint="Once a week, a nudge to write your review."
              checked={s.review_enabled}
              onChange={(v) => save.mutate({ review_enabled: v })}
            />
            {s.review_enabled && (
              <>
                <div className="flex flex-wrap gap-3">
                  <div className="space-y-2">
                    <Label>Day</Label>
                    <Select
                      value={String(s.review_day)}
                      onValueChange={(v) => save.mutate({ review_day: Number(v) })}
                    >
                      <SelectTrigger className="w-40" aria-label="Review reminder day">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS.map((d, i) => (
                          <SelectItem key={d} value={String(i + 1)}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <TimeSelect
                      label="Review reminder time"
                      value={s.review_time}
                      onChange={(v) => save.mutate({ review_time: v })}
                    />
                  </div>
                </div>
                <ToggleRow
                  id="review-open"
                  title="Only if not yet submitted"
                  hint="Skip it when this week's review is already in."
                  checked={s.review_only_if_open}
                  onChange={(v) => save.mutate({ review_only_if_open: v })}
                />
              </>
            )}
          </div>

          {(s.daily_enabled || s.review_enabled) && !hasDevices && (
            <p className="text-sm text-warning">
              Reminders are on, but no device is allowed yet — allow this device above to receive them.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Reminders arrive within a minute or so of the chosen time.
          </p>
        </div>
      )}
    </section>
  );
}

function ToggleRow({
  id,
  title,
  hint,
  checked,
  onChange,
}: {
  id: string;
  title: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <Label htmlFor={id} className="text-sm font-medium">
          {title}
        </Label>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function TimeSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="num w-28" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {TIMES.map((t) => (
          <SelectItem key={t} value={t}>
            {t}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
