"use client";

import * as React from "react";
import type { Script } from "@prisma/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertTriangle,
  BookOpen,
  History,
  Plus,
  Sparkles,
  Type,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { DataTable } from "@/components/data-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VariableChip } from "@/components/chat/variable-chip";
import { scriptSchema } from "@/lib/validators";
import { fillTemplate } from "@/lib/stateMachines/dmFlow";
import type { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";

const categories = [
  { value: "pitch", label: "Pitch" },
  { value: "qualify", label: "Qualify" },
  { value: "checkout", label: "Checkout" },
  { value: "delivery", label: "Delivery" },
  { value: "objections", label: "Objections" },
] as const;

const variables = ["{{product}}", "{{price}}", "{{keyword}}", "{{name}}"];

type CategoryValue = (typeof categories)[number]["value"];
type ScriptFormValues = z.infer<typeof scriptSchema>;

interface ScriptRevision {
  body: string;
  updatedAt: string;
  name: string;
}

const historyStorageKey = "dm-commerce-script-history";

export function ScriptsTab() {
  const { toast } = useToast();
  const [scripts, setScripts] = React.useState<Script[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editingScript, setEditingScript] = React.useState<Script | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [filterCategory, setFilterCategory] = React.useState<string>("all");
  const [monospace, setMonospace] = React.useState(false);
  const [historyMap, setHistoryMap] = React.useState<Record<string, ScriptRevision[]>>({});

  const form = useForm<ScriptFormValues>({
    resolver: zodResolver(scriptSchema),
    defaultValues: {
      name: "",
      body: "",
      category: "pitch",
    },
  });

  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(historyStorageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Record<string, ScriptRevision[]>;
        setHistoryMap(parsed);
      } catch (error) {
        console.warn("Failed to parse script history", error);
      }
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(historyStorageKey, JSON.stringify(historyMap));
  }, [historyMap]);

  React.useEffect(() => {
    async function loadScripts() {
      try {
        setLoading(true);
        const res = await fetch("/api/scripts");
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as Script[];
        setScripts(data);
      } catch (error) {
        toast({
          title: "Unable to load scripts",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    loadScripts();
  }, [toast]);

  const openCreateDrawer = React.useCallback(() => {
    setEditingScript(null);
    setMonospace(false);
    form.reset({ name: "", body: "", category: "pitch" });
    setDrawerOpen(true);
  }, [form]);

  const openEditDrawer = React.useCallback(
    (script: Script) => {
      setEditingScript(script);
      setMonospace(false);
      form.reset({ name: script.name, body: script.body, category: script.category as CategoryValue });
      setDrawerOpen(true);
    },
    [form]
  );

  const filteredScripts = React.useMemo(() => {
    if (filterCategory === "all") return scripts;
    return scripts.filter((script) => script.category === filterCategory);
  }, [scripts, filterCategory]);

  const watchedBody = form.watch("body");
  const watchedCategory = form.watch("category");

  const dedupeMatch = React.useMemo(() => {
    const normalized = normalizeCopy(watchedBody);
    if (!normalized) return null;
    return scripts
      .filter((script) => script.id !== editingScript?.id)
      .map((script) => ({ script, score: similarity(normalizeCopy(script.body), normalized) }))
      .filter((entry) => entry.score >= 0.75)
      .sort((a, b) => b.score - a.score)[0] ?? null;
  }, [scripts, watchedBody, editingScript?.id]);

  const samplePreview = React.useMemo(() => {
    return watchedBody
      ? fillTemplate(watchedBody, { product: "Creator Guide", price: "$29", keyword: "GUIDE", name: "Taylor" })
      : "";
  }, [watchedBody]);

  const pushHistory = React.useCallback((script: Script) => {
    setHistoryMap((prev) => {
      const existing = prev[script.id] ?? [];
      const nextEntry: ScriptRevision = {
        body: script.body,
        updatedAt: new Date().toISOString(),
        name: script.name,
      };
      const next = [nextEntry, ...existing].slice(0, 3);
      return { ...prev, [script.id]: next };
    });
  }, []);

  const handleInsertVariable = React.useCallback((token: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const value = form.getValues("body") ?? "";
    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? start;
    const next = value.slice(0, start) + token + value.slice(end);
    form.setValue("body", next, { shouldDirty: true });
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + token.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  }, [form]);

  const submitScript = React.useCallback(
    async (values: ScriptFormValues) => {
      setSubmitting(true);
      try {
        if (editingScript) {
          pushHistory(editingScript);
          const res = await fetch(`/api/scripts/${editingScript.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
          });
          if (!res.ok) throw new Error(await res.text());
          const updated = (await res.json()) as Script;
          setScripts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
          toast({ title: "Script updated", description: `${updated.name} saved.` });
        } else {
          const res = await fetch("/api/scripts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
          });
          if (!res.ok) throw new Error(await res.text());
          const created = (await res.json()) as Script;
          setScripts((prev) => [created, ...prev]);
          toast({ title: "Script created", description: `${created.name} added.` });
        }
        setDrawerOpen(false);
      } catch (error) {
        toast({
          title: "Unable to save script",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [editingScript, pushHistory, setDrawerOpen, setScripts, toast]
  );

  const handleDelete = React.useCallback(
    async (script: Script) => {
      const confirmed = window.confirm(`Delete ${script.name}?`);
      if (!confirmed) return;
      try {
        const res = await fetch(`/api/scripts/${script.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error(await res.text());
        setScripts((prev) => prev.filter((item) => item.id !== script.id));
        toast({ title: "Script removed", description: `${script.name} deleted.` });
      } catch (error) {
        toast({
          title: "Unable to delete script",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      }
    },
    [setScripts, toast]
  );

  const restoreRevision = React.useCallback(
    (scriptId: string, revision: ScriptRevision) => {
      if (!editingScript || editingScript.id !== scriptId) return;
      form.setValue("body", revision.body, { shouldDirty: true });
      toast({ title: "Revision restored", description: `Reverted to edit saved ${timeAgo(revision.updatedAt)} ago.` });
    },
    [editingScript, form, toast]
  );

  const renderPreviewTokens = (body: string) => {
    return body.split(/(\{\{[^}]+\}\})/g).map((segment, index) => {
      if (/^\{\{[^}]+\}\}$/.test(segment)) {
        return <VariableChip key={index} label={segment} />;
      }
      return (
        <span key={index} className="whitespace-pre-wrap">
          {segment}
        </span>
      );
    });
  };

  const columns = React.useMemo<ColumnDef<Script>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Script",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.name}</div>
            <Badge variant="outline" className="mt-1 capitalize text-xs">
              {row.original.category}
            </Badge>
          </div>
        ),
      },
      {
        accessorKey: "body",
        header: "Snippet",
        cell: ({ row }) => (
          <p className="line-clamp-2 text-sm text-muted-foreground">{row.original.body}</p>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => openEditDrawer(row.original)}>
              Edit
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(row.original)}>
              Delete
            </Button>
          </div>
        ),
        meta: { className: "w-[160px]" },
      },
    ],
    [handleDelete, openEditDrawer]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Script Library</h2>
          <p className="text-sm text-muted-foreground">
            Craft reusable DM copy, flag duplicates, and keep revisions handy for each stage of the flow.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All scripts</SelectItem>
              {categories.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openCreateDrawer} className="gap-2">
            <Plus className="h-4 w-4" /> New script
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Script catalogue</CardTitle>
          <CardDescription>Use filters or the command palette to jump to a specific stage.</CardDescription>
        </CardHeader>
        <CardContent>
          {scripts.length ? (
            <DataTable columns={columns} data={filteredScripts} isLoading={loading} emptyMessage="No scripts yet" />
          ) : (
            <EmptyState
              icon={BookOpen}
              title="No scripts yet"
              description="Seed your pitch, qualify, checkout, and delivery messages to unlock automation."
              action={
                <Button onClick={openCreateDrawer} className="mt-3">
                  Add script
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{editingScript ? "Edit script" : "Create script"}</DrawerTitle>
            <DrawerDescription>
              Use variables like {{product}} and {{price}} for quick personalisation. Toggle monospace for technical edits.
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto px-6">
            <Form {...form}>
              <form className="grid gap-6 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]" onSubmit={form.handleSubmit(submitScript)}>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Warm DM Pitch" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-semibold uppercase">Variables</span>
                      {variables.map((variable) => (
                        <button
                          key={variable}
                          type="button"
                          onClick={() => handleInsertVariable(variable)}
                          className="rounded-full border border-dashed border-primary/40 px-2 py-0.5 text-[11px] text-primary transition hover:bg-primary/10"
                        >
                          {variable}
                        </button>
                      ))}
                      <button
                        type="button"
                        className={cn(
                          "ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
                          monospace ? "border-primary text-primary" : "border-border text-muted-foreground"
                        )}
                        onClick={() => setMonospace((value) => !value)}
                      >
                        <Type className="h-3 w-3" /> {monospace ? "Sans" : "Mono"}
                      </button>
                    </div>
                    <FormField
                      control={form.control}
                      name="body"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              {...field}
                              ref={(element) => {
                                field.ref(element);
                                textareaRef.current = element;
                              }}
                              rows={10}
                              className={cn("resize-none", monospace && "font-mono")}
                              placeholder="Hey {{name}}!"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {dedupeMatch ? (
                      <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                        <AlertTriangle className="mt-0.5 h-4 w-4" />
                        <div>
                          <p className="font-semibold">Potential duplicate detected</p>
                          <p>
                            Similar to <strong>{dedupeMatch.script.name}</strong> ({(dedupeMatch.score * 100).toFixed(0)}% match). Consider
                            differentiating the hook or CTA.
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <Button type="submit" disabled={submitting} className="gap-2">
                    <Sparkles className="h-4 w-4" /> {submitting ? "Saving…" : editingScript ? "Save changes" : "Create script"}
                  </Button>
                </div>

                <aside className="space-y-4 rounded-xl border bg-muted/30 p-4 text-sm">
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase text-muted-foreground">Live preview</h3>
                    <div className="rounded-lg border bg-background p-3 shadow-subtle">
                      <p className="text-xs uppercase text-muted-foreground">Tokens</p>
                      <div className="mt-1 flex flex-wrap gap-1 text-sm">
                        {watchedBody ? renderPreviewTokens(watchedBody) : <span className="text-muted-foreground">No content yet</span>}
                      </div>
                    </div>
                    <div className="rounded-lg border bg-background p-3 shadow-subtle">
                      <p className="text-xs uppercase text-muted-foreground">Sample output</p>
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} className="prose prose-sm dark:prose-invert">
                        {samplePreview || "Add copy to see the formatted preview."}
                      </ReactMarkdown>
                    </div>
                  </div>
                  {editingScript ? (
                    <div className="space-y-2">
                      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                        <History className="h-3.5 w-3.5" /> Recent revisions
                      </h3>
                      <div className="space-y-2">
                        {(historyMap[editingScript.id] ?? []).length ? (
                          historyMap[editingScript.id]!.map((revision) => (
                            <div key={revision.updatedAt} className="rounded-lg border bg-background p-3">
                              <p className="text-xs text-muted-foreground">Saved {timeAgo(revision.updatedAt)} ago</p>
                              <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{revision.body}</p>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                onClick={() => restoreRevision(editingScript.id, revision)}
                              >
                                Restore
                              </Button>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground">No prior revisions saved yet.</p>
                        )}
                      </div>
                    </div>
                  ) : null}
                  <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground">Stage guidance</p>
                    <p className="mt-1">
                      {categories.find((item) => item.value === watchedCategory)?.label ?? "Pitch"} scripts should end with a single clear CTA.
                      Keep them between 120–160 characters for best results.
                    </p>
                  </div>
                </aside>
              </form>
            </Form>
          </div>
          <DrawerFooter>
            <p className="text-xs text-muted-foreground">
              Tip: after saving, use slash commands in the DM Studio (/pitch, /qualify, /checkout) to insert your updates instantly.
            </p>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function normalizeCopy(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function similarity(a: string, b: string) {
  if (!a || !b) return 0;
  const setA = new Set(a.split(" ").filter(Boolean));
  const setB = new Set(b.split(" ").filter(Boolean));
  const intersection = Array.from(setA).filter((token) => setB.has(token));
  return intersection.length / Math.max(setA.size, setB.size, 1);
}

function timeAgo(iso: string) {
  const delta = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(delta / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}
