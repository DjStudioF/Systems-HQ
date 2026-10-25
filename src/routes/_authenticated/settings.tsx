import { createFileRoute, useBlocker, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/components/app/AppShell";
import { TimezonePicker } from "@/components/app/TimezonePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { profileKeys, profileQuery, updateProfile, type Profile } from "@/lib/services/profile";
import { signOutAndClear } from "@/lib/auth/session";
import { applyTheme, type ThemePref } from "@/lib/theme";
import { DISPLAY_NAME_MAX, MOTTO_MAX } from "@/lib/validation/profile";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings · Systems HQ" },
      { name: "description", content: "Timezone, theme, consistency threshold and motto." },
      { property: "og:title", content: "Settings · Systems HQ" },
      { property: "og:description", content: "Timezone, theme, consistency threshold and motto." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = Route.useRouteContext();
  const { data } = useQuery(profileQuery(user.id));
  if (!data) return null;
  return <SettingsForm profile={data} userId={user.id} email={user.email} />;
}

function SettingsForm({ profile, userId, email }: { profile: Profile; userId: string; email: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const initial = {
    display_name: profile.display_name ?? "",
    timezone: profile.timezone,
    theme: profile.theme as ThemePref,
    threshold: String(Math.round(Number(profile.consistency_threshold) * 100)),
    motto: profile.motto,
  };
  const [f, setF] = useState(initial);
  const dirty = JSON.stringify(f) !== JSON.stringify(initial);
  const [error, setError] = useState<string | null>(null);

  useBlocker({ shouldBlockFn: () => dirty && !window.confirm("Discard unsaved settings?"), enableBeforeUnload: () => dirty });

  // Preview theme immediately; revert if left unsaved.
  useEffect(() => {
    applyTheme(f.theme);
  }, [f.theme]);
  useEffect(() => () => applyTheme((qc.getQueryData<Profile>(profileKeys.detail(userId))?.theme as ThemePref) ?? "system"), [qc, userId]);

  const save = useMutation({
    mutationFn: () => {
      const pct = Number(f.threshold);
      if (!Number.isFinite(pct) || pct <= 0 || pct > 100) throw new Error("Threshold must be between 1 and 100%.");
      return updateProfile(userId, {
        display_name: f.display_name,
        timezone: f.timezone,
        theme: f.theme,
        consistency_threshold: pct / 100,
        motto: f.motto,
      });
    },
    onMutate: () => setError(null),
    onSuccess: (p) => {
      qc.setQueryData(profileKeys.detail(userId), p);
      toast.success("Settings saved");
    },
    onError: (e: Error) => setError(e.message),
  });

  const tzChanged = f.timezone !== profile.timezone;

  return (
    <PageContainer>
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Signed in as {email}</p>
      <form
        className="mt-6 max-w-xl space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Field id="name" label="Display name (optional)">
          <Input id="name" className="h-11" maxLength={DISPLAY_NAME_MAX} value={f.display_name} onChange={(e) => setF({ ...f, display_name: e.target.value })} />
        </Field>

        <fieldset className="surface space-y-3 p-4">
          <legend className="px-1 text-sm font-medium">Timezone</legend>
          <TimezonePicker id="tz" value={f.timezone} onChange={(timezone) => setF({ ...f, timezone })} />
          <p className={tzChanged ? "text-sm text-warning" : "text-sm text-muted-foreground"}>
            Changing timezone affects what counts as "today" from now on. Already-recorded dates are never moved.
          </p>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Theme</legend>
          <div role="radiogroup" className="inline-flex rounded-lg border bg-card p-1">
            {(["system", "light", "dark"] as const).map((t) => (
              <label key={t} className="tap flex cursor-pointer items-center rounded-md px-4 text-sm capitalize has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
                <input type="radio" name="theme" value={t} checked={f.theme === t} onChange={() => setF({ ...f, theme: t })} className="sr-only" />
                {t}
              </label>
            ))}
          </div>
        </fieldset>

        <Field id="threshold" label="On-track threshold (%)" hint="A goal is On track when its weekly consistency is at or above this value.">
          <Input id="threshold" type="number" inputMode="numeric" min={1} max={100} className="h-11 w-32" value={f.threshold} onChange={(e) => setF({ ...f, threshold: e.target.value })} />
        </Field>

        <Field id="motto-s" label="Motto">
          <Input id="motto-s" className="h-11" maxLength={MOTTO_MAX} value={f.motto} onChange={(e) => setF({ ...f, motto: e.target.value })} />
        </Field>

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={!dirty || save.isPending}>{save.isPending ? "Saving…" : "Save settings"}</Button>
          <Button type="button" variant="ghost" disabled={!dirty} onClick={() => setF(initial)}>Reset</Button>
        </div>
      </form>

      <div className="mt-10 max-w-xl border-t pt-6">
        <Button
          variant="outline"
          onClick={async () => {
            await signOutAndClear(qc);
            navigate({ to: "/login", replace: true });
          }}
        >
          Sign out
        </Button>
      </div>
    </PageContainer>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}
