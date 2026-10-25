import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard } from "@/components/app/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isSafeRedirect } from "@/lib/auth/session";

const search = z.object({
  redirect: z.string().optional(),
  reason: z.enum(["expired", "reset"]).optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Sign in · Systems HQ" },
      { name: "description", content: "Sign in to your private Systems HQ." },
      { property: "og:title", content: "Sign in · Systems HQ" },
      { property: "og:description", content: "Sign in to your private Systems HQ." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect, reason } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setPending(false);
    if (error) {
      setError(
        error.message === "Email not confirmed"
          ? "Confirm your email first, using the link you were sent."
          : "Email or password is incorrect.",
      );
      return;
    }
    if (isSafeRedirect(redirect)) navigate({ href: redirect, replace: true });
    else navigate({ to: "/", replace: true });
  }

  return (
    <AuthCard title="Sign in" subtitle="Private workspace. Accounts are created by the owner.">
      {reason === "expired" && (
        <p role="status" className="mb-4 text-sm text-warning">
          Your session expired. Please sign in again.
        </p>
      )}
      {reason === "reset" && (
        <p role="status" className="mb-4 text-sm text-primary">
          Password updated. Sign in with your new password.
        </p>
      )}
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            className="h-11"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            className="h-11"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby={error ? "login-err" : undefined}
          />
        </div>
        {error && (
          <p id="login-err" role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <Link
        to="/forgot-password"
        className="mt-4 inline-flex h-11 items-center text-sm text-primary hover:underline"
      >
        Forgot password?
      </Link>
    </AuthCard>
  );
}
