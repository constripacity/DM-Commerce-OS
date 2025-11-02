"use client";

import * as React from "react";
import type { Script } from "@prisma/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { scriptSchema } from "@/lib/validators";
import type { ColumnDef } from "@tanstack/react-table";
import { fillTemplate } from "@/lib/stateMachines/dmFlow";

const categories = [
  { value: "pitch", label: "Pitch" },
  { value: "qualify", label: "Qualify" },
  { value: "checkout", label: "Checkout" },
  { value: "delivery", label: "Delivery" },
  { value: "objections", label: "Objections" },
] as const;

const variables = ["{{product}}", "{{price}}", "{{keyword}}"];

type CategoryValue = (typeof categories)[number]["value"];

type ScriptFormValues = z.infer<typeof scriptSchema>;

export function ScriptsTab() {
  const { toast } = useToast();
  const [scripts, setScripts] = React.useState<Script[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingScript, setEditingScript] = React.useState<Script | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [filterCategory, setFilterCategory] = React.useState<string>("all");
  const bodyRef = React.useRef<HTMLTextAreaElement | null>(null);

  const form = useForm<ScriptFormValues>({
    resolver: zodResolver(scriptSchema),
    defaultValues: {
      name: "",
      body: "",
      category: "pitch",
    },
  });

  React.useEffect(() => {
    async function loadScripts() {
      try {
        setLoading(true);
        const res = await fetch("/api/scripts");
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
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

  const openCreateDialog = () => {
    setEditingScript(null);
    form.reset({ name: "", body: "", category: "pitch" });
    setDialogOpen(true);
  };

  const openEditDialog = React.useCallback(
    (script: Script) => {
      setEditingScript(script);
      form.reset({ name: script.name, body: script.body, category: script.category as CategoryValue });
      setDialogOpen(true);
    },
    [form]
  );

  const submitScript = async (values: ScriptFormValues) => {
    setSubmitting(true);
    try {
      if (editingScript) {
        const res = await fetch(`/api/scripts/${editingScript.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        if (!res.ok) throw new Error(await res.text());
        const updated: Script = await res.json();
        setScripts((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
        );
        toast({ title: "Script updated", description: `${updated.name} saved.` });
      } else {
        const res = await fetch("/api/scripts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        if (!res.ok) throw new Error(await res.text());
        const created: Script = await res.json();
        setScripts((prev) => [created, ...prev]);
        toast({ title: "Script created", description: `${created.name} added.` });
      }
      setDialogOpen(false);
    } catch (error) {
      toast({
        title: "Unable to save script",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

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
    [toast]
  );

  const insertVariable = (token: string) => {
    const textarea = bodyRef.current;
    if (!textarea) return;
    const value = form.getValues("body") ?? "";
    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? start;
    const next = value.slice(0, start) + token + value.slice(end);
    form.setValue("body", next);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + token.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const watchedBody = form.watch("body");
  const watchedCategory = form.watch("category");
  const preview = watchedBody ? fillTemplate(watchedBody, { product: "Creator Guide", price: "$29", keyword: "GUIDE" }) : "";

  const filteredScripts = React.useMemo(() => {
    if (filterCategory === "all") return scripts;
    return scripts.filter((script) => script.category === filterCategory);
  }, [scripts, filterCategory]);

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
            <Button variant="ghost" size="sm" onClick={() => openEditDialog(row.original)}>
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
    [handleDelete, openEditDialog]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">Script Library</h2>
          <p className="text-sm text-muted-foreground">
            Tune the DM language by stage and reuse variables in one click.
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
          <Button onClick={openCreateDialog}>New script</Button>
        </div>
      </div>
      <DataTable columns={columns} data={filteredScripts} isLoading={loading} emptyMessage="No scripts yet" />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingScript ? "Edit script" : "Create script"}</DialogTitle>
            <DialogDescription>
              Use variables like {{product}}, {{price}}, and {{keyword}} to keep copy reusable.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
            <Form {...form}>
              <form className="space-y-4" onSubmit={form.handleSubmit(submitScript)}>
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
                <div className="space-y-2">
                  <FormLabel>Message template</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {variables.map((variable) => (
                      <Button
                        key={variable}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => insertVariable(variable)}
                      >
                        {variable}
                      </Button>
                    ))}
                  </div>
                  <FormField
                    control={form.control}
                    name="body"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            rows={6}
                            {...field}
                            ref={(element) => {
                              field.ref(element);
                              bodyRef.current = element;
                            }}
                            placeholder="Hey {{name}}!"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Saving..." : editingScript ? "Save changes" : "Create script"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
            <aside className="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground">Preview</h3>
              <p className="text-xs text-muted-foreground">
                Category: {categories.find((c) => c.value === watchedCategory)?.label ?? ""}
              </p>
              <p className="whitespace-pre-line leading-relaxed text-foreground">{preview}</p>
            </aside>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
