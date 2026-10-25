import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard } from "@/components/app/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signOutAndClear } from "@/lib/auth/session";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password · Systems HQ" },
      { name: "description", content: "Set a new password for your account." },
      { property: "og:title", content: "Choose a new password · Systems HQ" },
      { property: "og:description", content: "Set a new password for your account." },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [ready, setReady] = useState<"checking" | "ok" | "invalid">("checking");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery");
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady("ok");
    });
    supabase.auth.getSession().then(({ data: s }) => {
      if (s.session && isRecovery) setReady("ok");
      else if (!isRecovery)
        setTimeout(() => setReady((r) => (r === "checking" ? "invalid" : r)), 1500);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pw.length < 8) return setError("Use at least 8 characters.");
    if (pw !== pw2) return setError("Passwords don't match.");
    setPending(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setPending(false);
    if (error)
      return setError(
        error.message.includes("weak") || error.message.includes("pwned")
          ? "That password is too common. Choose another."
          : "Couldn't update the password. Request a new link.",
      );
    await signOutAndClear(qc);
    navigate({ to: "/login", search: { reason: "reset" }, replace: true });
  }

  return (
    <AuthCard title="Choose a new password">
      {ready === "checking" && <p className="text-sm text-muted-foreground">Checking your link…</p>}
      {ready === "invalid" && (
        <div className="space-y-3 text-sm">
          <p role="alert">This reset link is invalid or expired.</p>
          <Link
            to="/forgot-password"
            className="inline-flex h-11 items-center text-primary hover:underline"
          >
            Request a new link
          </Link>
        </div>
      )}
      {ready === "ok" && (
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pw">New password</Label>
            <Input
              id="pw"
              type="password"
              autoComplete="new-password"
              required
              className="h-11"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw2">Confirm password</Label>
            <Input
              id="pw2"
              type="password"
              autoComplete="new-password"
              required
              className="h-11"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Saving…" : "Update password"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
