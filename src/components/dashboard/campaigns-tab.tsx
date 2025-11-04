"use client";

import * as React from "react";
import type { Campaign } from "@prisma/client";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isToday, startOfMonth, startOfWeek } from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Copy,
  Download,
  Plus,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { DataTable } from "@/components/data-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { campaignPlanToText, generateCampaignPlan, type CampaignPlanEntry } from "@/lib/campaigns";
import { formatDate, toDateInputValue } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";

const platformOptions = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "generic", label: "Generic" },
] as const;

type PlatformValue = (typeof platformOptions)[number]["value"];

const campaignFormSchema = z.object({
  name: z.string().min(2).max(80),
  keyword: z.string().min(2).max(20),
  platform: z.enum(["instagram", "tiktok", "generic"]),
  startsOn: z.string().min(1),
  endsOn: z.string().min(1),
});

type CampaignFormValues = z.infer<typeof campaignFormSchema>;

interface PlannerOptions {
  posts: number;
  stories: number;
  includeHashtags: boolean;
}

export function CampaignsTab() {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<"create" | "edit">("create");
  const [editingCampaign, setEditingCampaign] = React.useState<Campaign | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [plannerOptions, setPlannerOptions] = React.useState<PlannerOptions>({ posts: 10, stories: 10, includeHashtags: true });
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false);
  const [exportTarget, setExportTarget] = React.useState<Campaign | null>(null);
  const [copying, setCopying] = React.useState(false);
  const [viewDate, setViewDate] = React.useState(() => new Date());
  const [activeCampaignId, setActiveCampaignId] = React.useState<string | null>(null);

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: "",
      keyword: "GUIDE",
      platform: "instagram",
      startsOn: "",
      endsOn: "",
    },
  });

  React.useEffect(() => {
    async function loadCampaigns() {
      try {
        setLoading(true);
        const res = await fetch("/api/campaigns", { credentials: "include", cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as Campaign[];
        setCampaigns(data);
        setActiveCampaignId((current) => current ?? data[0]?.id ?? null);
        if (data[0]) {
          setViewDate(new Date(data[0].startsOn));
        }
      } catch (error) {
        toast({
          title: "Unable to load campaigns",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    loadCampaigns();
  }, [toast]);

  const activeCampaign = campaigns.find((item) => item.id === activeCampaignId) ?? null;

  React.useEffect(() => {
    if (activeCampaign) {
      setViewDate(new Date(activeCampaign.startsOn));
    }
  }, [activeCampaign]);

  const plan = React.useMemo(() => {
    if (!activeCampaign) return [] as CampaignPlanEntry[];
    return generateCampaignPlan({
      keyword: activeCampaign.keyword,
      startDate: new Date(activeCampaign.startsOn),
      posts: plannerOptions.posts,
      stories: plannerOptions.stories,
      includeHashtags: plannerOptions.includeHashtags,
    });
  }, [activeCampaign, plannerOptions]);

  const previewPlan = React.useMemo(() => {
    if (!exportTarget) return plan;
    return generateCampaignPlan({
      keyword: exportTarget.keyword,
      startDate: new Date(exportTarget.startsOn),
      posts: plannerOptions.posts,
      stories: plannerOptions.stories,
      includeHashtags: plannerOptions.includeHashtags,
    });
  }, [exportTarget, plannerOptions, plan]);

  const planByDate = React.useMemo(() => {
    const map = new Map<string, CampaignPlanEntry[]>();
    for (const entry of plan) {
      const existing = map.get(entry.schedule) ?? [];
      existing.push(entry);
      map.set(entry.schedule, existing);
    }
    return map;
  }, [plan]);

  const calendarDays = React.useMemo(() => {
    const currentMonth = viewDate;
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [viewDate]);

  const handleOpenCreate = React.useCallback(() => {
    setDialogMode("create");
    setEditingCampaign(null);
    setDrawerOpen(true);
    form.reset({
      name: "",
      keyword: "GUIDE",
      platform: "instagram",
      startsOn: "",
      endsOn: "",
    });
  }, [form]);

  const handleOpenEdit = React.useCallback(
    (campaign: Campaign) => {
      setDialogMode("edit");
      setEditingCampaign(campaign);
      setDrawerOpen(true);
      form.reset({
        name: campaign.name,
        keyword: campaign.keyword,
        platform: campaign.platform as PlatformValue,
        startsOn: toDateInputValue(campaign.startsOn),
        endsOn: toDateInputValue(campaign.endsOn),
      });
    },
    [form]
  );

  const submitCampaign = React.useCallback(
    async (values: CampaignFormValues) => {
      setSubmitting(true);
      const body = {
        ...values,
        keyword: values.keyword.toUpperCase(),
      };

      try {
        if (dialogMode === "edit" && editingCampaign) {
          const res = await fetch(`/api/campaigns/${editingCampaign.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            credentials: "include",
          });
          if (!res.ok) throw new Error(await res.text());
          const updated = (await res.json()) as Campaign;
          setCampaigns((prev) =>
            prev
              .map((item) => (item.id === updated.id ? updated : item))
              .sort((a, b) => new Date(a.startsOn).getTime() - new Date(b.startsOn).getTime())
          );
          setActiveCampaignId(updated.id);
          toast({ title: "Campaign updated", description: `${updated.name} refreshed.` });
        } else {
          const res = await fetch("/api/campaigns", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            credentials: "include",
          });
          if (!res.ok) throw new Error(await res.text());
          const created = (await res.json()) as Campaign;
          setCampaigns((prev) =>
            [...prev, created].sort((a, b) => new Date(a.startsOn).getTime() - new Date(b.startsOn).getTime())
          );
          setActiveCampaignId(created.id);
          toast({ title: "Campaign created", description: `${created.name} added.` });
        }
        setDrawerOpen(false);
      } catch (error) {
        toast({
          title: "Unable to save campaign",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [dialogMode, editingCampaign, setActiveCampaignId, setCampaigns, toast]
  );

  const handleDelete = React.useCallback(
    async (campaign: Campaign) => {
      const confirmed = window.confirm(`Delete ${campaign.name}?`);
      if (!confirmed) return;
      try {
        const res = await fetch(`/api/campaigns/${campaign.id}`, { method: "DELETE", credentials: "include" });
        if (!res.ok) throw new Error(await res.text());
        setCampaigns((prev) => prev.filter((item) => item.id !== campaign.id));
        if (activeCampaignId === campaign.id) {
          setActiveCampaignId(null);
        }
        toast({ title: "Campaign removed", description: `${campaign.name} deleted.` });
      } catch (error) {
        toast({
          title: "Unable to delete campaign",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      }
    },
    [activeCampaignId, setActiveCampaignId, setCampaigns, toast]
  );

  const openExport = React.useCallback(
    (campaign: Campaign) => {
      setExportTarget(campaign);
      setExportDialogOpen(true);
    },
    [setExportDialogOpen]
  );

  const downloadCsv = React.useCallback(
    async (campaign: Campaign, options: PlannerOptions) => {
      try {
        const params = new URLSearchParams({
          posts: String(options.posts),
          stories: String(options.stories),
          hashtags: options.includeHashtags ? "1" : "0",
        });
        const res = await fetch(`/api/campaigns/${campaign.id}/export?${params.toString()}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) throw new Error(await res.text());
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `campaign-${campaign.keyword}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast({ title: "CSV ready", description: `Exported hooks for ${campaign.keyword}.` });
      } catch (error) {
        toast({
          title: "Export failed",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const copyPlan = React.useCallback(
    async (entries: CampaignPlanEntry[] = plan) => {
      if (!entries.length) return;
      try {
        setCopying(true);
        await navigator.clipboard.writeText(campaignPlanToText(entries));
        toast({ title: "Plan copied", description: "Calendar schedule sent to clipboard." });
      } catch (error) {
        toast({
          title: "Copy failed",
          description: error instanceof Error ? error.message : "Clipboard not available.",
          variant: "destructive",
        });
      } finally {
        setCopying(false);
      }
    },
    [plan, setCopying, toast]
  );

  const handlePlannerChange = React.useCallback((field: keyof PlannerOptions, value: number | boolean) => {
    setPlannerOptions((prev) => ({ ...prev, [field]: value }));
  }, []);

  const columns = React.useMemo<ColumnDef<Campaign>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Campaign",
        cell: ({ row }) => {
          const campaign = row.original;
          return (
            <button
              type="button"
              onClick={() => setActiveCampaignId(campaign.id)}
              className={cn(
                "w-full text-left",
                activeCampaignId === campaign.id ? "text-primary" : ""
              )}
            >
              <div className="font-medium">{campaign.name}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">DM {campaign.keyword}</Badge>
                <span className="capitalize">{campaign.platform}</span>
              </div>
            </button>
          );
        },
      },
      {
        accessorKey: "schedule",
        header: "Schedule",
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">
            {formatDate(row.original.startsOn)} → {formatDate(row.original.endsOn)}
          </div>
        ),
        meta: { className: "w-48" },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => openExport(row.original)}>
              <Download className="mr-1 h-3.5 w-3.5" /> CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(row.original)}>
              Edit
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(row.original)}>
              Delete
            </Button>
          </div>
        ),
        meta: { className: "w-[220px]" },
      },
    ],
    [activeCampaignId, handleDelete, openExport, handleOpenEdit]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Campaigns</h2>
          <p className="text-sm text-muted-foreground">
            Map your DM keyword calendar, tailor CSV exports, and keep promo windows tight.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="h-4 w-4" /> New campaign
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Card className="h-full">
          <CardHeader className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Campaign roster</CardTitle>
                <CardDescription>Pick a campaign to preview its content cadence.</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setViewDate(new Date())}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {campaigns.length ? (
              <DataTable columns={columns} data={campaigns} isLoading={loading} emptyMessage="No campaigns yet" />
            ) : (
              <EmptyState
                icon={CalendarDays}
                title="No campaigns yet"
                description="Spin up your first campaign to generate DM prompts and schedule cadence."
                action={
                  <Button onClick={handleOpenCreate} className="mt-3">
                    Create campaign
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Content calendar</CardTitle>
                <CardDescription>
                  {activeCampaign
                    ? `${activeCampaign.name} · DM ${activeCampaign.keyword}`
                    : "Select a campaign to populate the grid."}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setViewDate((date) => addMonths(date, -1))}
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-[120px] text-center text-sm font-medium">{format(viewDate, "MMMM yyyy")}</div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setViewDate((date) => addMonths(date, 1))}
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <label className="font-medium">Posts</label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={plannerOptions.posts}
                  onChange={(event) => handlePlannerChange("posts", Number(event.target.value) || 1)}
                  className="h-8 w-16"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="font-medium">Stories</label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={plannerOptions.stories}
                  onChange={(event) => handlePlannerChange("stories", Number(event.target.value) || 1)}
                  className="h-8 w-16"
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={plannerOptions.includeHashtags}
                  onChange={(event) => handlePlannerChange("includeHashtags", event.target.checked)}
                />
                Hashtags
              </label>
              <Button variant="outline" size="sm" onClick={copyPlan} disabled={!plan.length || copying} className="ml-auto">
                {copying ? (
                  <ClipboardCheck className="mr-2 h-3.5 w-3.5 animate-pulse" />
                ) : (
                  <Copy className="mr-2 h-3.5 w-3.5" />
                )}
                Copy plan
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2 text-xs font-medium uppercase text-muted-foreground">
              {"Mon Tue Wed Thu Fri Sat Sun".split(" ").map((day) => (
                <div key={day} className="text-center">
                  {day}
                </div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-2">
              {calendarDays.map((day) => {
                const iso = format(day, "yyyy-MM-dd");
                const entries = planByDate.get(iso) ?? [];
                const isCurrentMonth = isSameMonth(day, viewDate);
                return (
                  <div
                    key={iso}
                    className={cn(
                      "min-h-[110px] rounded-xl border p-2 text-xs transition",
                      isCurrentMonth ? "bg-background" : "bg-muted text-muted-foreground",
                      isToday(day) ? "border-primary ring-2 ring-primary/30" : "border-border"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{format(day, "d")}</span>
                      {entries.length ? (
                        <Badge variant="outline" className="text-[10px]">
                          {entries.length}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-2 space-y-2">
                      {entries.map((entry) => (
                        <div
                          key={`${entry.type}-${entry.angle}-${entry.schedule}`}
                          className="rounded-lg bg-muted/60 p-2 text-[11px]"
                        >
                          <p className="font-medium text-foreground">
                            {entry.type} · {entry.angle}
                          </p>
                          <p className="mt-1 line-clamp-2 text-muted-foreground">{entry.hook}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{dialogMode === "edit" ? "Edit campaign" : "Create campaign"}</DrawerTitle>
            <DrawerDescription>
              Keep DM keywords uppercase and align start/end dates with your promo sprint.
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto px-6">
            <Form {...form}>
              <form className="space-y-4 py-4" onSubmit={form.handleSubmit(submitCampaign)}>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Creator Guide Launch" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="keyword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Keyword</FormLabel>
                        <FormControl>
                          <Input placeholder="GUIDE" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="platform"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Platform</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select platform" />
                          </SelectTrigger>
                          <SelectContent>
                            {platformOptions.map((option) => (
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
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="startsOn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Starts on</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endsOn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ends on</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? "Saving…" : dialogMode === "edit" ? "Save changes" : "Create campaign"}
                </Button>
              </form>
            </Form>
          </div>
          <DrawerFooter>
            <p className="text-xs text-muted-foreground">
              Tip: schedule stories on off-days to keep the keyword warm between posts.
            </p>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Export CSV</DialogTitle>
            <DialogDescription>
              Configure the volume of posts and stories before downloading your sandbox calendar.
            </DialogDescription>
          </DialogHeader>
          {exportTarget ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FormLabel className="text-xs uppercase text-muted-foreground">Posts</FormLabel>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={plannerOptions.posts}
                    onChange={(event) => handlePlannerChange("posts", Number(event.target.value) || 1)}
                  />
                </div>
                <div>
                  <FormLabel className="text-xs uppercase text-muted-foreground">Stories</FormLabel>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={plannerOptions.stories}
                    onChange={(event) => handlePlannerChange("stories", Number(event.target.value) || 1)}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={plannerOptions.includeHashtags}
                  onChange={(event) => handlePlannerChange("includeHashtags", event.target.checked)}
                />
                Include hashtag column
              </label>
              <div className="rounded-xl border bg-muted/40 p-4 text-sm">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Preview</p>
                <div className="mt-2 space-y-2">
                  {previewPlan.slice(0, 3).map((entry) => (
                    <div key={`${entry.schedule}-${entry.type}-${entry.angle}`} className="text-sm">
                      <p className="font-medium text-foreground">
                        {entry.schedule} • {entry.type} ({entry.angle})
                      </p>
                      <p className="text-muted-foreground">{entry.hook}</p>
                    </div>
                  ))}
                  {previewPlan.length > 3 ? (
                    <p className="text-xs text-muted-foreground">…plus {previewPlan.length - 3} more rows</p>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={() => copyPlan(previewPlan)}>
                  <Copy className="mr-2 h-3.5 w-3.5" /> Copy plan
                </Button>
                <Button onClick={() => exportTarget && downloadCsv(exportTarget, plannerOptions)}>
                  <Download className="mr-2 h-3.5 w-3.5" /> Download CSV
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
