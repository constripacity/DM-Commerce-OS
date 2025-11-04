"use client";

import * as React from "react";
import { Palette, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useThemeController, palettes } from "@/components/dashboard/theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme, cycleTheme } = useThemeController();
  const [open, setOpen] = React.useState(false);

  const selected = palettes.find((palette) => palette.id === theme) ?? palettes[0];

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden md:inline">{selected.label}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="end">
          <Command>
            <CommandInput placeholder="Search theme..." />
            <CommandList>
              <CommandEmpty>No theme found.</CommandEmpty>
              <CommandGroup>
                {palettes.map((palette) => (
                  <CommandItem
                    key={palette.id}
                    value={palette.label}
                    keywords={[palette.label, palette.description]}
                    onSelect={() => {
                      setTheme(palette.id);
                      setOpen(false);
                    }}
                  >
                    <div className="flex w-full items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium leading-none">{palette.label}</p>
                        <p className="text-xs text-muted-foreground">{palette.description}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {palette.swatches.map((swatch) => (
                          <span
                            key={swatch}
                            className={cn("h-4 w-4 rounded-full border", palette.id === theme && "ring-2 ring-offset-2")}
                            style={{ backgroundColor: swatch }}
                          />
                        ))}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Button variant="ghost" size="icon" onClick={cycleTheme} className="hidden sm:inline-flex" title="Cycle theme">
        <Sparkles className="h-4 w-4" />
      </Button>
    </div>
  );
}