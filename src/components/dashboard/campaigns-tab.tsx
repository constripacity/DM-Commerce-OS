"use client";

import * as React from "react";
import type { Campaign } from "@prisma/client";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { formatDate, toDateInputValue } from "@/lib/format";
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

type CampaignRow = Campaign;

export function CampaignsTab() {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingCampaign, setEditingCampaign] = React.useState<Campaign | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
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
        const res = await fetch("/api/campaigns");
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setCampaigns(data);
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

  const openCreateDialog = React.useCallback(() => {
    setEditingCampaign(null);
    form.reset({
      name: "",
      keyword: "GUIDE",
      platform: "instagram",
      startsOn: "",
      endsOn: "",
    });
    setDialogOpen(true);
  }, [form]);

  const openEditDialog = React.useCallback((campaign: Campaign) => {
    setEditingCampaign(campaign);
    form.reset({
      name: campaign.name,
      keyword: campaign.keyword,
      platform: campaign.platform as PlatformValue,
      startsOn: toDateInputValue(campaign.startsOn),
      endsOn: toDateInputValue(campaign.endsOn),
    });
    setDialogOpen(true);
  }, [form]);

  const submitCampaign = React.useCallback(
    async (values: CampaignFormValues) => {
      setSubmitting(true);
      const body = {
        ...values,
        keyword: values.keyword.toUpperCase(),
      };

      try {
        if (editingCampaign) {
          const res = await fetch(`/api/campaigns/${editingCampaign.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!res.ok) throw new Error(await res.text());
          const updated: Campaign = await res.json();
          setCampaigns((prev) =>
            prev
              .map((item) => (item.id === updated.id ? updated : item))
              .sort((a, b) => new Date(a.startsOn).getTime() - new Date(b.startsOn).getTime())
          );
          toast({ title: "Campaign updated", description: `${updated.name} refreshed.` });
        } else {
          const res = await fetch("/api/campaigns", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!res.ok) throw new Error(await res.text());
          const created: Campaign = await res.json();
          setCampaigns((prev) =>
            [...prev, created].sort((a, b) => new Date(a.startsOn).getTime() - new Date(b.startsOn).getTime())
          );
          toast({ title: "Campaign created", description: `${created.name} added.` });
        }
        setDialogOpen(false);
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
    [editingCampaign, toast]
  );

  const handleDelete = React.useCallback(async (campaign: Campaign) => {
    const confirmed = window.confirm(`Delete ${campaign.name}?`);
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setCampaigns((prev) => prev.filter((item) => item.id !== campaign.id));
      toast({ title: "Campaign removed", description: `${campaign.name} deleted.` });
    } catch (error) {
      toast({
        title: "Unable to delete campaign",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleExport = React.useCallback(
    async (campaign: Campaign) => {
      try {
        const res = await fetch(`/api/campaigns/${campaign.id}/export`);
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

  const columns = React.useMemo<ColumnDef<CampaignRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Campaign",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.name}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">DM {row.original.keyword}</Badge>
              <span className="capitalize">{row.original.platform}</span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "schedule",
        header: "Schedule",
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">
            {formatDate(row.original.startsOn)} → {formatDate(row.original.endsOn)}
          </div>
        ),
        meta: { className: "w-64" },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport(row.original)}>
              Export CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={() => openEditDialog(row.original)}>
              Edit
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(row.original)}>
              Delete
            </Button>
          </div>
        ),
        meta: { className: "w-[260px]" },
      },
    ],
    [handleDelete, handleExport, openEditDialog]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">Campaigns</h2>
          <p className="text-sm text-muted-foreground">
            Plan content triggers and export a full DM keyword calendar.
          </p>
        </div>
        <Button onClick={openCreateDialog}>New campaign</Button>
      </div>
      <DataTable columns={columns} data={campaigns} isLoading={loading} emptyMessage="No campaigns yet" />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCampaign ? "Edit campaign" : "Create campaign"}</DialogTitle>
            <DialogDescription>
              Keep keywords uppercase and schedule a short focused promo window.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(submitCampaign)}>
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
              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : editingCampaign ? "Save changes" : "Create campaign"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
