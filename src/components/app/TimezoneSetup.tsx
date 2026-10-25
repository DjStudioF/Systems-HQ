import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/app/BrandMark";
import { TimezonePicker } from "@/components/app/TimezonePicker";
import { browserTimeZone } from "@/lib/date/timezones";
import { profileKeys, updateProfile } from "@/lib/services/profile";
import { localToday, formatIsoDate } from "@/lib/date/local-date";

/** First-run step 1: confirm the timezone that defines "today". */
export function TimezoneSetup({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [tz, setTz] = useState("UTC");
  const [detected, setDetected] = useState<string | null>(null);

  useEffect(() => {
    const b = browserTimeZone();
    setDetected(b);
    if (b) setTz(b);
  }, []);

  const save = useMutation({
    mutationFn: () => updateProfile(userId, { timezone: tz, timezone_confirmed: true }),
    onSuccess: (p) => qc.setQueryData(profileKeys.detail(userId), p),
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
      <Brand />
      <p className="mt-8 text-sm text-muted-foreground">Setup · Step 1 of 3</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Confirm your timezone</h1>
      <p className="mt-2 text-muted-foreground">
        Your timezone decides what counts as "today" for check-ins.
        {detected ? ` Your browser reports ${detected.replace(/_/g, " ")}.` : " We couldn't detect it, so please pick one."}
      </p>
      <form
        className="surface mt-6 space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <TimezonePicker id="tz-setup" value={tz} onChange={setTz} />
        <p className="text-sm text-muted-foreground">
          Today there is <span className="font-medium text-foreground">{formatIsoDate(localToday(tz, new Date()))}</span>.
        </p>
        {save.isError && (
          <p role="alert" className="text-sm text-destructive">
            {save.error.message}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={save.isPending}>
          {save.isPending ? "Saving…" : `Use ${tz.replace(/_/g, " ")}`}
        </Button>
      </form>
      <p className="mt-4 text-sm text-muted-foreground">Steps 2–3 (first goal and routine) arrive in the next build stage.</p>
    </main>
  );
}
