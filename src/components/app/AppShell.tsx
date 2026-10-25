import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { History, LayoutDashboard, LogOut, Settings } from "lucide-react";
import { Brand } from "@/components/app/BrandMark";
import { Button } from "@/components/ui/button";
import { signOutAndClear } from "@/lib/auth/session";
import type { Profile } from "@/lib/services/profile";

const SECTIONS = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "goals", label: "Goals" },
  { id: "review", label: "Weekly review" },
  { id: "how", label: "How this works" },
];

export function AppShell({
  children,
  profile,
  email,
}: {
  children: ReactNode;
  profile: Profile;
  email: string;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const signOut = async () => {
    await signOutAndClear(qc);
    navigate({ to: "/login", replace: true });
  };

  return (
    <div className="min-h-screen md:grid md:grid-cols-[220px_1fr]">
      <aside
        className="sticky top-0 hidden h-screen flex-col border-r px-4 py-6 md:flex"
        aria-label="Primary"
      >
        <Link to="/" className="tap flex items-center rounded-lg px-2">
          <Brand />
        </Link>
        <nav className="mt-8 flex flex-col gap-1 text-sm">
          <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Dashboard
          </p>
          {SECTIONS.map((s) => (
            <Link
              key={s.id}
              to="/"
              hash={s.id}
              className="flex h-10 items-center rounded-lg px-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              {s.label}
            </Link>
          ))}
          <p className="px-2 pb-1 pt-5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            More
          </p>
          <NavLink to="/history" icon={<History />} label="History" />
          <NavLink to="/settings" icon={<Settings />} label="Settings" />
        </nav>
        <div className="mt-auto space-y-2 px-2 text-xs text-muted-foreground">
          <p className="truncate" title={email}>
            {profile.display_name || email}
          </p>
          <Button variant="ghost" size="sm" className="-ml-3" onClick={signOut}>
            <LogOut /> Sign out
          </Button>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:hidden">
        <Link to="/" className="tap flex items-center">
          <Brand />
        </Link>
        <Link
          to="/settings"
          aria-label="Settings"
          className="tap flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary"
        >
          <Settings className="size-5" />
        </Link>
      </header>

      <div className="min-w-0 pb-24 md:pb-0">{children}</div>

      <nav
        aria-label="Mobile"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t bg-background md:hidden"
      >
        <MobileTab to="/" icon={<LayoutDashboard />} label="Dashboard" />
        <MobileTab to="/history" icon={<History />} label="History" />
        <MobileTab to="/settings" icon={<Settings />} label="Settings" />
      </nav>
    </div>
  );
}

function NavLink({
  to,
  icon,
  label,
}: {
  to: "/history" | "/settings";
  icon: ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex h-10 items-center gap-2 rounded-lg px-2 text-muted-foreground hover:bg-secondary hover:text-foreground [&_svg]:size-4"
      activeProps={{ className: "bg-secondary text-foreground" }}
    >
      {icon}
      {label}
    </Link>
  );
}

function MobileTab({
  to,
  icon,
  label,
}: {
  to: "/" | "/history" | "/settings";
  icon: ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: true, includeHash: false }}
      className="flex h-16 flex-col items-center justify-center gap-1 text-xs text-muted-foreground [&_svg]:size-5"
      activeProps={{ className: "text-primary" }}
    >
      {icon}
      {label}
    </Link>
  );
}

export function PageContainer({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 py-6 md:px-8 md:py-8">{children}</main>
  );
}
