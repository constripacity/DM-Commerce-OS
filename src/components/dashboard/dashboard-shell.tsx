"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronRight, Search, User } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

export interface DashboardTabDefinition {
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

interface DashboardShellProps {
  tabs: DashboardTabDefinition[];
  activeTab: string;
  onTabChange: (value: string) => void;
  searchRef: React.RefObject<HTMLInputElement>;
  onOpenCommand: () => void;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
}

export function DashboardShell({ tabs, activeTab, onTabChange, searchRef, onOpenCommand, children, headerAction }: DashboardShellProps) {
  const active = tabs.find((tab) => tab.value === activeTab);

  return (
    <div className="grid min-h-[calc(100vh-2rem)] gap-6 pb-10 md:grid-cols-[260px_1fr] xl:grid-cols-[280px_1fr]">
      <aside className="glass-panel hidden rounded-2xl border p-4 md:flex md:flex-col md:gap-3">
        <div className="flex items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2">
          <div>
            <p className="text-sm font-semibold">DM Commerce OS</p>
            <p className="text-xs text-muted-foreground">Sandboxed creator suite</p>
          </div>
          <div className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">Demo</div>
        </div>
        <nav className="mt-4 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = tab.value === activeTab;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onTabChange(tab.value)}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition",
                  selected
                    ? "bg-primary text-primary-foreground shadow-subtle"
                    : "hover:bg-muted"
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg border",
                    selected ? "border-primary-foreground/40 bg-primary-foreground/20" : "border-transparent bg-muted/60"
                  )}
                >
                  <Icon className={cn("h-4 w-4", selected ? "text-primary-foreground" : "text-muted-foreground")} />
                </span>
                <div className="flex flex-1 flex-col">
                  <span className="text-sm font-semibold">{tab.label}</span>
                  <span className="text-xs text-muted-foreground">{tab.description}</span>
                </div>
                <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-opacity", selected ? "opacity-100" : "opacity-0 group-hover:opacity-50")} />
              </button>
            );
          })}
        </nav>
        <div className="mt-auto space-y-2 rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Need a reset?</p>
          <p>Run <code className="font-mono text-[11px] text-primary">npm run demo:reset</code> to restore demo data.</p>
        </div>
      </aside>
      <section className="flex flex-col gap-6">
        <header className="sticky top-4 z-20 glass-panel rounded-2xl border px-6 py-4 shadow-subtle">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Dashboard</span>
              <ChevronRight className="h-4 w-4" />
              <span className="font-medium text-foreground">{active?.label ?? ""}</span>
            </div>
            <div className="flex flex-1 flex-wrap items-center gap-3 md:justify-end">
              <div className="relative flex-1 min-w-[200px] md:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  ref={searchRef}
                  type="search"
                  placeholder="Search workflows, orders, assets..."
                  className="focus-ring w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm"
                />
              </div>
              <Button variant="outline" className="gap-2" onClick={onOpenCommand}>
                Command
                <Kbd>⌘K</Kbd>
              </Button>
              <ThemeToggle />
              <Button variant="ghost" size="icon" className="rounded-full border border-border">
                <User className="h-4 w-4" />
                <span className="sr-only">Demo account</span>
              </Button>
            </div>
          </div>
          {headerAction ? <div className="mt-4">{headerAction}</div> : null}
        </header>
        <div className="space-y-6">{children}</div>
      </section>
    </div>
  );
}
