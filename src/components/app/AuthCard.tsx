import type { ReactNode } from "react";
import { Brand } from "@/components/app/BrandMark";

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Brand />
        <h1 className="mt-8 text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
        <div className="surface mt-6 p-5">{children}</div>
      </div>
    </main>
  );
}
