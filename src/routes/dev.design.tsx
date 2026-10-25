import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Brand } from "@/components/app/BrandMark";
import { ProgressBar, textBar } from "@/components/app/ProgressBar";
import { EmptyState, ErrorState, LoadingRows } from "@/components/app/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { applyTheme, type ThemePref } from "@/lib/theme";

// Development-only design-system preview. Unreachable in production builds.
export const Route = createFileRoute("/dev/design")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  head: () => ({ meta: [{ title: "Design system · Systems HQ (dev)" }, { name: "robots", content: "noindex" }] }),
  component: DesignPreview,
});

type Status = "done" | "minimum" | "skipped" | null;

function DesignPreview() {
  const [theme, setTheme] = useState<ThemePref>("system");
  const [status, setStatus] = useState<Status>("minimum");
  useEffect(() => applyTheme(theme), [theme]);

  return (
    <main className="mx-auto max-w-[1100px] space-y-12 px-4 py-8 md:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Brand />
        <div className="flex gap-1 rounded-lg border bg-card p-1">
          {(["system", "light", "dark"] as const).map((t) => (
            <Button key={t} size="sm" variant={theme === t ? "default" : "ghost"} aria-pressed={theme === t} onClick={() => setTheme(t)} className="capitalize">{t}</Button>
          ))}
        </div>
      </header>

      <Block title="Type">
        <p className="text-3xl font-semibold tracking-tight">Page title · 30px</p>
        <p className="text-xl font-semibold">Section heading · 20px</p>
        <p>Body copy at 16px. Build the system. Keep the promise small.</p>
        <p className="text-sm text-muted-foreground">Control / secondary · 14px</p>
        <p className="text-xs text-muted-foreground">Metadata · 12px</p>
      </Block>

      <Block title="Surfaces">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border bg-background p-4 text-sm">Background</div>
          <div className="surface p-4 text-sm">Surface</div>
          <div className="rounded-xl bg-secondary p-4 text-sm">Secondary surface</div>
        </div>
      </Block>

      <Block title="Buttons">
        <div className="flex flex-wrap gap-2">
          <Button>Primary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Block>

      <Block title="Routine row">
        <div className="surface p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="font-medium">Evening reading <span className="text-sm font-normal text-muted-foreground">· Sample goal</span></p>
              <p className="text-sm text-muted-foreground">After dinner… Read for 20 minutes.</p>
              <p className="text-sm"><span className="text-muted-foreground">Minimum:</span> Read one page.</p>
              <ProgressBar ratio={2 / 3} label="Week progress" className="max-w-xs pt-1" />
            </div>
            <div className="flex shrink-0 gap-2" role="group" aria-label="Log today">
              {(["done", "minimum", "skipped"] as const).map((s) => (
                <Button key={s} variant={s} aria-pressed={status === s} onClick={() => setStatus(status === s ? s : s)} className="capitalize">
                  {status === s && <Check />}
                  {s}
                </Button>
              ))}
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground" role="status">Saved · {status ?? "Not logged"}</p>
        </div>
      </Block>

      <Block title="Goal card">
        <article className="surface max-w-sm space-y-3 p-4">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold">Sample goal</h3>
            <span className="rounded-md bg-secondary px-2 py-0.5 text-xs">Focus</span>
          </div>
          <p className="line-clamp-2 text-sm text-muted-foreground">A sample "why" shown only in this preview, truncated gracefully when long.</p>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Weekly consistency: <span className="font-medium text-foreground">On track</span></p>
            <ProgressBar ratio={0.625} label="Weekly consistency" />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Time elapsed · Deadline Dec 31</p>
            <ProgressBar ratio={0.4} label="Time elapsed" />
          </div>
          <p className="font-mono text-xs text-muted-foreground" aria-hidden="true">{textBar(0.6)} 60%</p>
          <ProgressBar ratio={null} label="Time elapsed" nullText="No deadline" />
        </article>
      </Block>

      <Block title="Form field / error">
        <div className="max-w-sm space-y-2">
          <Label htmlFor="demo-name">Goal name</Label>
          <Input id="demo-name" aria-invalid="true" aria-describedby="demo-err" defaultValue="   " className="h-11 aria-invalid:border-destructive" />
          <p id="demo-err" className="text-sm text-destructive">Name is required.</p>
        </div>
      </Block>

      <Block title="Loading, empty, error">
        <div className="grid gap-4 md:grid-cols-3">
          <LoadingRows rows={2} />
          <EmptyState title="Nothing scheduled today." />
          <ErrorState message="Couldn't save. Your change was undone." onRetry={() => {}} />
        </div>
      </Block>
    </main>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}
