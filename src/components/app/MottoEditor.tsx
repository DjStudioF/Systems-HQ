import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { profileKeys, updateProfile } from "@/lib/services/profile";
import { MOTTO_MAX } from "@/lib/validation/profile";

export function MottoEditor({ userId, motto }: { userId: string; motto: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(motto);
  const save = useMutation({
    mutationFn: () => updateProfile(userId, { motto: value }),
    onSuccess: (p) => {
      qc.setQueryData(profileKeys.detail(userId), p);
      setEditing(false);
    },
  });

  if (!editing)
    return (
      <div className="flex items-center gap-1">
        <p className="text-muted-foreground">“{motto}”</p>
        <Button variant="ghost" size="icon" aria-label="Edit motto" onClick={() => { setValue(motto); setEditing(true); }}>
          <Pencil />
        </Button>
      </div>
    );

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:items-start"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <div className="flex-1">
        <label htmlFor="motto" className="sr-only">Motto</label>
        <Input id="motto" value={value} maxLength={MOTTO_MAX} onChange={(e) => setValue(e.target.value)} className="h-11" aria-invalid={save.isError} aria-describedby={save.isError ? "motto-err" : undefined} autoFocus />
        {save.isError && <p id="motto-err" role="alert" className="mt-1 text-sm text-destructive">{save.error.message}</p>}
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
        <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
      </div>
    </form>
  );
}
