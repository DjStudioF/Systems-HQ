import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery } from "@/lib/services/profile";
import { applyTheme, isThemePref } from "@/lib/theme";
import { AppShell } from "@/components/app/AppShell";
import { TimezoneSetup } from "@/components/app/TimezoneSetup";
import { ErrorState, FullPageLoading } from "@/components/app/States";

// Private pages render client-only: the session lives in browser storage and
// private data must never enter server-rendered/shared responses.
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      const { data: s } = await supabase.auth.getSession();
      throw redirect({
        to: "/login",
        search: { redirect: location.href, ...(s.session ? { reason: "expired" as const } : {}) },
      });
    }
    return { user: { id: data.user.id, email: data.user.email ?? "" } };
  },
  pendingComponent: FullPageLoading,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext();
  const profile = useQuery(profileQuery(user.id));

  useEffect(() => {
    if (profile.data && isThemePref(profile.data.theme)) applyTheme(profile.data.theme);
  }, [profile.data]);

  if (profile.isPending) return <FullPageLoading />;
  if (profile.isError)
    return (
      <div className="mx-auto max-w-md p-6">
        <ErrorState message={profile.error.message} onRetry={() => profile.refetch()} />
      </div>
    );
  if (!profile.data.timezone_confirmed) return <TimezoneSetup userId={user.id} />;

  return (
    <AppShell profile={profile.data} email={user.email}>
      <Outlet />
    </AppShell>
  );
}
