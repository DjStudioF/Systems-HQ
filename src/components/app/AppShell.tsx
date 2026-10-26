import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarCheck,
  CircleHelp,
  Ellipsis,
  History,
  LayoutGrid,
  LogOut,
  NotebookPen,
  Settings,
  Target,
} from "lucide-react";
import { Brand } from "@/components/app/BrandMark";
import { Ring } from "@/components/app/viz";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { signOutAndClear } from "@/lib/auth/session";
import type { Profile } from "@/lib/services/profile";
import { useLocalToday } from "@/lib/date/use-local-today";
import { formatIsoDate } from "@/lib/date/local-date";
import { useTodayProgress } from "@/lib/services/today-progress";

type NavTo = "/" | "/week" | "/goals" | "/review" | "/history" | "/settings";
const PRIMARY: { to: NavTo; label: string; icon: ReactNode }[] = [
  { to: "/", label: "Today", icon: <CalendarCheck /> },
  { to: "/week", label: "This week", icon: <LayoutGrid /> },
  { to: "/goals", label: "Goals", icon: <Target /> },
  { to: "/review", label: "Weekly review", icon: <NotebookPen /> },
  { to: "/history", label: "History", icon: <History /> },
];

export const HOW_IT_WORKS = [
  "Goals define the direction; modules define the repeatable actions.",
  "Each day, mark a routine Done, Minimum, or Skipped.",
  "Done and Minimum both count; each routine can earn one completion per day.",
  "Weekly consistency measures follow-through; time elapsed does not measure goal completion.",
  "Review weekly and keep, tweak, or drop what is not working.",
];

export function AppShell({
  children,
  profile,
  email,
  userId,
}: {
  children: ReactNode;
  profile: Profile;
  email: string;
  userId: string;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [help, setHelp] = useState(false);
  const [more, setMore] = useState(false);
  const today = useLocalToday(profile.timezone ?? "UTC");
  const { done, total } = useTodayProgress(userId, today);
  const signOut = async () => {
    await signOutAndClear(qc);
    navigate({ to: "/login", replace: true });
  };

  return (
    <div className="min-h-screen md:grid md:grid-cols-[64px_1fr] lg:grid-cols-[220px_1fr]">
      <aside
        className="sticky top-0 hidden h-screen flex-col border-r bg-surface-1 px-2 py-5 md:flex lg:px-3"
        aria-label="Primary"
      >
        <Link to="/" className="tap flex items-center justify-center rounded-lg lg:justify-start lg:px-2">
          <span className="lg:hidden" aria-label="Systems HQ">
            <Brand compact />
          </span>
          <span className="hidden lg:inline">
            <Brand />
          </span>
        </Link>
        <nav className="mt-8 flex flex-col gap-1 text-sm">
          {[...PRIMARY, { to: "/settings" as const, label: "Settings", icon: <Settings /> }].map(
            (n) => (
              <Link
                key={n.to}
                to={n.to}
                title={n.label}
                activeOptions={{ exact: n.to === "/" }}
                className="flex h-10 items-center justify-center gap-2.5 rounded-lg px-2 text-muted-foreground transition-colors duration-[var(--motion-fast)] hover:bg-surface-2 hover:text-foreground lg:justify-start [&_svg]:size-5 lg:[&_svg]:size-4"
                activeProps={{ className: "bg-surface-2 text-foreground" }}
              >
                {n.icon}
                <span className="sr-only lg:not-sr-only">{n.label}</span>
              </Link>
            ),
          )}
        </nav>
        <div className="mt-auto space-y-1 text-xs text-muted-foreground lg:px-2">
          <p className="hidden truncate lg:block" title={email}>
            {profile.display_name || email}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center lg:-ml-3 lg:w-auto lg:justify-start"
            onClick={signOut}
            aria-label="Sign out"
          >
            <LogOut /> <span className="hidden lg:inline">Sign out</span>
          </Button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <Link to="/" className="tap flex items-center md:hidden" aria-label="Systems HQ">
              <Brand compact />
            </Link>
            <p className="text-sm text-muted-foreground">
              {formatIsoDate(today, { weekday: "long", month: "short", day: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Link
              to="/"
              className="tap flex items-center gap-2 rounded-lg px-2 text-sm"
              aria-label={`${done} of ${total} check-ins done today`}
            >
              <Ring
                value={total ? done / total : null}
                size={30}
                label={`${done} of ${total} done today`}
              />
              <span className="num hidden text-muted-foreground sm:inline">
                {done}/{total}
              </span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="tap"
              aria-label="How this works"
              onClick={() => setHelp(true)}
            >
              <CircleHelp className="size-5" />
            </Button>
          </div>
        </header>

        <div className="pb-24 md:pb-0">{children}</div>
      </div>

      <nav
        aria-label="Mobile"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t bg-surface-1 md:hidden"
      >
        {PRIMARY.slice(0, 3).map((n) => (
          <Link
            key={n.to}
            to={n.to}
            activeOptions={{ exact: n.to === "/" }}
            className="flex h-16 flex-col items-center justify-center gap-1 text-xs text-muted-foreground [&_svg]:size-5"
            activeProps={{ className: "text-primary" }}
          >
            {n.icon}
            {n.label === "This week" ? "Week" : n.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setMore(true)}
          className="flex h-16 flex-col items-center justify-center gap-1 text-xs text-muted-foreground"
        >
          <Ellipsis className="size-5" aria-hidden="true" />
          More
        </button>
      </nav>

      <Sheet open={more} onOpenChange={setMore}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
            <SheetDescription className="sr-only">Other pages</SheetDescription>
          </SheetHeader>
          <div className="grid gap-1 px-4 pb-6">
            {[
              { to: "/review" as const, label: "Weekly review", icon: <NotebookPen /> },
              { to: "/history" as const, label: "History", icon: <History /> },
              { to: "/settings" as const, label: "Settings", icon: <Settings /> },
            ].map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setMore(false)}
                className="tap flex items-center gap-3 rounded-lg px-3 hover:bg-surface-2 [&_svg]:size-5"
              >
                {n.icon}
                {n.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={signOut}
              className="tap flex items-center gap-3 rounded-lg px-3 text-muted-foreground hover:bg-surface-2"
            >
              <LogOut className="size-5" /> Sign out
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={help} onOpenChange={setHelp}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>How this works</SheetTitle>
            <SheetDescription>Five ideas behind Systems HQ.</SheetDescription>
          </SheetHeader>
          <ol className="list-decimal space-y-3 px-4 pl-9 text-sm text-muted-foreground">
            {HOW_IT_WORKS.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ol>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function PageContainer({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 py-6 md:px-8 md:py-8">{children}</main>
  );
}
