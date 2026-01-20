"use client";

import * as React from "react";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export interface SlashCommand {
  id: string;
  label: string;
  description: string;
  insert: () => void;
}

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  commands: SlashCommand[];
  isSending?: boolean;
}

export function ChatInput({ value, onChange, onSubmit, commands, isSending }: ChatInputProps) {
  const [showCommands, setShowCommands] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (value.endsWith("/") || value.includes("/")) {
      setShowCommands(true);
    } else {
      setShowCommands(false);
    }
  }, [value]);

  return (
    <div className="relative space-y-3">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSubmit();
          }
        }}
        className="focus-ring min-h-[120px] resize-none rounded-2xl border bg-background px-4 py-3 text-sm shadow-inner"
        placeholder="Type a reply… Use / to insert scripts."
      />
      {showCommands && commands.length ? (
        <div className="absolute inset-x-0 bottom-[90px] z-10 rounded-xl border bg-background p-3 shadow-subtle">
          <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Slash commands</p>
          <div className="grid gap-2">
            {commands.map((command) => (
              <button
                key={command.id}
                type="button"
                className="flex w-full items-center justify-between rounded-lg border border-transparent px-3 py-2 text-left transition hover:border-border hover:bg-muted/60"
                onClick={() => {
                  command.insert();
                  setShowCommands(false);
                  textareaRef.current?.focus();
                }}
              >
                <div>
                  <p className="text-sm font-medium">/{command.label}</p>
                  <p className="text-xs text-muted-foreground">{command.description}</p>
                </div>
                <Sparkles className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Shift + Enter for a new line</span>
        <Button onClick={onSubmit} disabled={isSending} className="gap-2">
          <Send className="h-4 w-4" /> {isSending ? "Sending" : "Send"}
        </Button>
      </div>
    </div>
  );
}
