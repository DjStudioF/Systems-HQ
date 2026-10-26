import { useQuery } from "@tanstack/react-query";
import { goalsQuery } from "@/lib/services/goals";
import { weekLogsQuery } from "@/lib/services/logs";
import { isoWeekday, weekStart, type IsoDate } from "@/lib/date/local-date";

/** Today's scheduled check-ins vs logged ones, read from the shared caches. */
export function useTodayProgress(userId: string, today: IsoDate) {
  const { data: goals } = useQuery(goalsQuery(userId));
  const { data: logs } = useQuery(weekLogsQuery(userId, weekStart(today)));
  const wd = isoWeekday(today);
  const ids = (goals ?? [])
    .filter((g) => g.lifecycle !== "archived")
    .flatMap((g) =>
      g.modules.filter((m) => !m.archived_at && m.days.includes(wd)).map((m) => m.id),
    );
  const done = ids.filter((id) =>
    (logs ?? []).some((l) => l.module_id === id && l.log_date === today),
  ).length;
  return { done, total: ids.length };
}
