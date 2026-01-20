"use client";

import { Sparkles } from "lucide-react";
import { useCommandCenter } from "@/components/command-palette";
import { Button } from "@/components/ui/button";

export function CommandKButton() {
  const { setOpen } = useCommandCenter();

  return (
    <Button
      type="button"
      variant="secondary"
      className="w-full justify-between rounded-2xl bg-white/90 text-slate-900 hover:bg-white"
      onClick={() => setOpen(true)}
    >
      <span className="flex items-center gap-2">
        <Sparkles className="h-4 w-4" />
        Command palette
      </span>
      <kbd className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">⌘K</kbd>
    </Button>
  );
}
