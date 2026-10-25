import { createFileRoute } from "@tanstack/react-router";
import { PageContainer } from "@/components/app/AppShell";
import { EmptyState } from "@/components/app/States";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "History · Systems HQ" },
      { name: "description", content: "Your recorded check-ins, newest first." },
      { property: "og:title", content: "History · Systems HQ" },
      { property: "og:description", content: "Your recorded check-ins, newest first." },
    ],
  }),
  component: () => (
    <PageContainer>
      <h1 className="text-3xl font-semibold tracking-tight">History</h1>
      <div className="mt-6">
        <EmptyState title="No check-ins recorded yet.">
          Filters and corrections arrive in a later build stage.
        </EmptyState>
      </div>
    </PageContainer>
  ),
});
