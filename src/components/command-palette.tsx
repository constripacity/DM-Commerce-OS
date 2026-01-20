"use client";

import * as React from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useHotkeys } from "@/hooks/use-hotkeys";

export interface CommandAction {
  id: string;
  label: string;
  section?: string;
  subtitle?: string;
  shortcut?: string[];
  keywords?: string[];
  icon?: React.ReactNode;
  run: () => void;
}

interface CommandContextValue {
  register: (actions: CommandAction[]) => () => void;
  setOpen: (open: boolean) => void;
  open: boolean;
  actions: CommandAction[];
}

const CommandContext = React.createContext<CommandContextValue | undefined>(undefined);

function groupBySection(actions: CommandAction[]) {
  const map = new Map<string, CommandAction[]>();
  for (const action of actions) {
    const key = action.section ?? "Quick actions";
    const list = map.get(key) ?? [];
    list.push(action);
    map.set(key, list);
  }
  return Array.from(map.entries()).map(([section, items]) => ({ section, items }));
}

export function CommandProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const actionsRef = React.useRef(new Map<string, CommandAction>());
  const [version, forceRender] = React.useReducer((state) => state + 1, 0);

  const register = React.useCallback((actions: CommandAction[]) => {
    actions.forEach((action) => {
      actionsRef.current.set(action.id, action);
    });
    forceRender();
    return () => {
      actions.forEach((action) => {
        actionsRef.current.delete(action.id);
      });
      forceRender();
    };
  }, []);

  const actions = React.useMemo(() => Array.from(actionsRef.current.values()), [version]);

  useHotkeys(
    [
      {
        combo: "mod+k",
        handler: () => setOpen((prev) => !prev),
      },
    ],
    [setOpen]
  );

  const value = React.useMemo<CommandContextValue>(
    () => ({ register, setOpen, open, actions }),
    [register, setOpen, open, actions]
  );

  return (
    <CommandContext.Provider value={value}>
      {children}
      <CommandPalette />
    </CommandContext.Provider>
  );
}

function CommandPalette() {
  const context = React.useContext(CommandContext);
  if (!context) {
    throw new Error("CommandPalette must be used inside CommandProvider");
  }

  const { open, setOpen, actions } = context;

  const sections = React.useMemo(() => groupBySection(actions), [actions]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden border-none bg-transparent p-0 shadow-none">
        <Command className="shadow-elevated">
          <CommandInput placeholder="Search anything..." />
          <CommandList>
            <CommandEmpty>No actions found.</CommandEmpty>
            {sections.map(({ section, items }, index) => (
              <React.Fragment key={section}>
                {index > 0 ? <CommandSeparator className="my-1" /> : null}
                <CommandGroup heading={section} className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide">
                  {items.map((item) => (
                    <CommandItem
                      key={item.id}
                      keywords={item.keywords}
                      onSelect={() => {
                        setOpen(false);
                        item.run();
                      }}
                    >
                      <div className="flex w-full items-center gap-3">
                        {item.icon ? (
                          <span className="flex h-5 w-5 items-center justify-center text-muted-foreground">{item.icon}</span>
                        ) : null}
                        <div className="flex-1">
                          <p className="text-sm font-medium leading-none">{item.label}</p>
                          {item.subtitle ? (
                            <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                          ) : null}
                        </div>
                        {item.shortcut ? (
                          <div className="flex gap-1 text-[10px] uppercase text-muted-foreground">
                            {item.shortcut.map((key) => (
                              <span
                                key={key}
                                className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground"
                              >
                                {key}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </React.Fragment>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export function useCommandCenter() {
  const context = React.useContext(CommandContext);
  if (!context) {
    throw new Error("useCommandCenter must be used within CommandProvider");
  }
  return context;
}

export function useCommandActions(actions: CommandAction[] | undefined) {
  const { register } = useCommandCenter();
  React.useEffect(() => {
    if (!actions || actions.length === 0) return;
    return register(actions);
  }, [actions, register]);
}
