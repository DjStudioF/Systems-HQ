import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listTimeZones } from "@/lib/date/timezones";

export function TimezonePicker({ id, value, onChange }: { id: string; value: string; onChange: (tz: string) => void }) {
  const all = useMemo(() => listTimeZones(), []);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s+/g, "_");
    return (q ? all.filter((z) => z.toLowerCase().includes(q)) : all).slice(0, 200);
  }, [all, query]);
  const options = filtered.includes(value) ? filtered : [value, ...filtered];

  return (
    <div className="space-y-2">
      <Label htmlFor={`${id}-search`}>Search timezones</Label>
      <Input id={`${id}-search`} placeholder="e.g. Berlin, New_York, Tokyo" value={query} onChange={(e) => setQuery(e.target.value)} className="h-11" />
      <Label htmlFor={id} className="sr-only">Timezone</Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        size={6}
        className="w-full rounded-lg border border-input bg-card p-1 text-sm text-foreground"
      >
        {options.map((z) => (
          <option key={z} value={z} className="rounded px-2 py-1.5">
            {z.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </div>
  );
}
