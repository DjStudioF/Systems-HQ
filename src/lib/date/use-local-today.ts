import { useEffect, useState } from "react";
import { localToday } from "./local-date";

/** Re-reads the local date on focus/visibility so an idle tab rolls over at midnight. */
export function useLocalToday(tz: string) {
  const [today, setToday] = useState(() => localToday(tz, new Date()));
  useEffect(() => {
    const check = () => setToday(localToday(tz, new Date()));
    check();
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    const t = window.setInterval(check, 60_000);
    return () => {
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
      window.clearInterval(t);
    };
  }, [tz]);
  return today;
}
