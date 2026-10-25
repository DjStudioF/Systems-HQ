import { createFileRoute, useBlocker } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { PageContainer } from "@/components/app/AppShell";
import { ErrorState, FullPageLoading } from "@/components/app/States";
import { SnapshotSummary } from "@/components/app/SnapshotSummary";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { profileQuery } from "@/lib/services/profile";
import {
  readSnapshot,
  reviewsQuery,
  reviewKeys,
  saveReviewText,
  type Review,
  type ReviewTextFields,
} from "@/lib/services/reviews";
import { startWeeklyReviewFn, submitWeeklyReviewFn } from "@/lib/reviews.functions";
import { addDays, formatIsoDate, weekStart } from "@/lib/date/local-date";
import { useLocalToday } from "@/lib/date/use-local-today";

export const Route = createFileRoute("/_authenticated/review")({
  head: () => ({
    meta: [
      { title: "Weekly review · Systems HQ" },
      { name: "description", content: "Reflect on the week and adjust your systems." },
      { property: "og:title", content: "Weekly review · Systems HQ" },
      { property: "og:description", content: "Reflect on the week and adjust your systems." },
    ],
  }),
  component: ReviewPage,
});

const PROMPTS: { key: keyof ReviewTextFields; label: string; hint: string }[] = [
  { key: "wins", label: "What worked this week?", hint: "Wins worth repeating, big or small." },
  {
    key: "skipped_and_why",
    label: "What did you skip, and why?",
    hint: "Honest reasons beat perfect records.",
  },
  {
    key: "keep_tweak_drop",
    label: "What will you keep, tweak, or drop?",
    hint: "Adjust the system, not yourself.",
  },
  { key: "next_week_focus", label: "Next week's focus", hint: "One clear intention." },
];

function fieldsOf(review: Review): ReviewTextFields {
  return {
    wins: review.wins,
    skipped_and_why: review.skipped_and_why,
    keep_tweak_drop: review.keep_tweak_drop,
    next_week_focus: review.next_week_focus,
  };
}

function ReviewPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const { data: profile } = useQuery(profileQuery(user.id));
  const tz = profile?.timezone ?? "UTC";
  const today = useLocalToday(tz);
  const mon = weekStart(today);
  const sun = addDays(mon, 6);

  // Get-or-create this week's review: reopening the week returns the same row.
  const startReview = useServerFn(startWeeklyReviewFn);
  const weekKey = ["account", user.id, "reviews", mon] as const;
  const {
    data: review,
    isPending,
    error,
  } = useQuery({
    queryKey: weekKey,
    queryFn: () => startReview({ data: { weekStart: mon, timezone: tz } }),
    enabled: !!profile,
  });
  const { data: allReviews } = useQuery(reviewsQuery(user.id));

  const [fields, setFields] = useState<ReviewTextFields | null>(null);
  useEffect(() => {
    if (review && fields === null) setFields(fieldsOf(review));
  }, [review, fields]);

  const submitted = review?.state === "submitted";
  const dirty =
    !!fields && !!review && PROMPTS.some((p) => fields[p.key] !== review[p.key]);

  const blocker = useBlocker({
    shouldBlockFn: () => dirty,
    enableBeforeUnload: dirty,
    withResolver: true,
  });

  const save = useMutation({
    mutationFn: (f: ReviewTextFields) => saveReviewText(user.id, review!.id, f),
    onSuccess: (saved) => {
      qc.setQueryData(weekKey, saved);
      qc.invalidateQueries({ queryKey: reviewKeys.list(user.id) });
    },
  });

  const submitFn = useServerFn(submitWeeklyReviewFn);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const submit = useMutation({
    mutationFn: () => submitFn({ data: { weekStart: mon } }),
    onSuccess: (updated) => {
      qc.setQueryData(weekKey, updated);
      qc.invalidateQueries({ queryKey: reviewKeys.list(user.id) });
    },
  });

  if (!profile || isPending) return <FullPageLoading />;
  if (error || !review) {
    return (
      <PageContainer>
        <ErrorState message="Couldn't load this week's review." />
      </PageContainer>
    );
  }

  const pastReviews = (allReviews ?? []).filter((r) => r.week_start !== mon);

  return (
    <PageContainer>
      <header className="border-b pb-6">
        <p className="text-sm text-muted-foreground">
          {formatIsoDate(mon, { month: "short", day: "numeric" })} –{" "}
          {formatIsoDate(sun, { month: "short", day: "numeric" })}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Weekly review</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {submitted
            ? `Submitted ${formatIsoDate(review.submitted_at!.slice(0, 10))}.`
            : "Draft — your metrics snapshot is frozen as of the moment you opened this review."}
        </p>
      </header>

      <div className="mt-8 space-y-10">
        <section aria-labelledby="snapshot-h">
          <h2 id="snapshot-h" className="mb-3 text-xl font-semibold tracking-tight">
            The week in numbers
          </h2>
          <SnapshotSummary snapshot={readSnapshot(review)} />
        </section>

        <section aria-labelledby="reflect-h">
          <h2 id="reflect-h" className="mb-3 text-xl font-semibold tracking-tight">
            Reflect
          </h2>
          {save.isError && (
            <div className="mb-4">
              <ErrorState
                message="Couldn't save your draft. Your text is still here — retry when ready."
                onRetry={() => fields && save.mutate(fields)}
              />
            </div>
          )}
          {submit.isError && (
            <div className="mb-4">
              <ErrorState message="Couldn't submit the review. Your draft is saved — retry." />
            </div>
          )}
          <div className="space-y-5">
            {PROMPTS.map((p) => (
              <div key={p.key} className="space-y-2">
                <Label htmlFor={`prompt-${p.key}`}>{p.label}</Label>
                <Textarea
                  id={`prompt-${p.key}`}
                  rows={3}
                  placeholder={p.hint}
                  value={fields?.[p.key] ?? ""}
                  disabled={submitted}
                  onChange={(e) =>
                    setFields((f) => (f ? { ...f, [p.key]: e.target.value } : f))
                  }
                />
              </div>
            ))}
          </div>
          {!submitted && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                disabled={!dirty || save.isPending}
                onClick={() => fields && save.mutate(fields)}
              >
                {save.isPending ? "Saving…" : "Save draft"}
              </Button>
              <Button
                disabled={dirty || save.isPending || submit.isPending}
                onClick={() => setConfirmSubmit(true)}
              >
                {submit.isPending ? "Submitting…" : "Submit review"}
              </Button>
              {dirty && (
                <p className="text-sm text-muted-foreground">
                  Unsaved changes — save your draft before submitting.
                </p>
              )}
            </div>
          )}
        </section>

        <section aria-labelledby="past-h">
          <h2 id="past-h" className="mb-3 text-xl font-semibold tracking-tight">
            Past weeks
          </h2>
          {pastReviews.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No past reviews yet.
            </p>
          ) : (
            <ul className="space-y-6">
              {pastReviews.map((r) => (
                <li key={r.id} className="space-y-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-medium text-foreground">
                      {formatIsoDate(r.week_start, { month: "short", day: "numeric" })} –{" "}
                      {formatIsoDate(addDays(r.week_start, 6), {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <span className="text-xs capitalize text-muted-foreground">{r.state}</span>
                  </div>
                  <SnapshotSummary snapshot={readSnapshot(r)} />
                  {r.wins && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Wins: </span>
                      {r.wins}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <AlertDialog open={blocker.status === "blocked"} onOpenChange={(open) => !open && blocker.reset?.()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
            <AlertDialogDescription>
              Your reflection text hasn't been saved yet. Leaving now discards it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => blocker.reset?.()}>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={() => blocker.proceed?.()}>Leave anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit this week's review?</AlertDialogTitle>
            <AlertDialogDescription>
              Submitting locks the review. The metrics snapshot stays frozen either way.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmSubmit(false);
                submit.mutate();
              }}
            >
              Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
