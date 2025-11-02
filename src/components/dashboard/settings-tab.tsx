"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Setting } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { settingSchema } from "@/lib/validators";

const formSchema = settingSchema.extend({
  logoPath: settingSchema.shape.logoPath.default(null),
});

type SettingsFormValues = z.infer<typeof formSchema>;

const fetchSettings = async () => {
  const response = await fetch("/api/settings");
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return (await response.json()) as Setting;
};

export function SettingsTab() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = React.useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      brandName: "",
      primaryHex: "#6366F1",
      logoPath: null,
    },
  });

  const watchedBrand = form.watch("brandName");
  const watchedColor = form.watch("primaryHex");
  const watchedLogoPath = form.watch("logoPath");

  React.useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const data = await fetchSettings();
        form.reset({
          brandName: data.brandName,
          primaryHex: data.primaryHex,
          logoPath: data.logoPath ?? null,
        });
        setPreviewUrl(data.logoPath ?? null);
        setRemoveLogo(false);
      } catch (error) {
        toast({
          title: "Unable to load settings",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [form, toast]);

  React.useEffect(() => {
    if (!logoFile) {
      return;
    }
    const objectUrl = URL.createObjectURL(logoFile);
    setPreviewUrl(objectUrl);
    setRemoveLogo(false);
    return () => URL.revokeObjectURL(objectUrl);
  }, [logoFile]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setLogoFile(file);
    if (!file) {
      setPreviewUrl(watchedLogoPath ?? null);
    }
  };

  const handleClearLogo = () => {
    setLogoFile(null);
    setPreviewUrl(null);
    setRemoveLogo(true);
    form.setValue("logoPath", null);
  };

  const onSubmit = async (values: SettingsFormValues) => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("brandName", values.brandName);
      formData.append("primaryHex", values.primaryHex);

      if (removeLogo) {
        formData.append("removeLogo", "true");
      } else if (values.logoPath) {
        formData.append("logoPath", values.logoPath);
      }

      if (logoFile) {
        formData.append("logoFile", logoFile);
      }

      const response = await fetch("/api/settings", {
        method: "PUT",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const updated = (await response.json()) as Setting;
      form.reset({
        brandName: updated.brandName,
        primaryHex: updated.primaryHex,
        logoPath: updated.logoPath ?? null,
      });
      setPreviewUrl(updated.logoPath ?? null);
      setLogoFile(null);
      setRemoveLogo(!updated.logoPath);
      toast({ title: "Settings saved", description: "Brand preferences updated." });
    } catch (error) {
      toast({
        title: "Unable to save settings",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Brand settings</CardTitle>
          <CardDescription>Loading your preferences…</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Brand settings</CardTitle>
          <CardDescription>
            Customize the dashboard brand name, highlight color, and optional logo for exported assets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="brandName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand name</FormLabel>
                    <FormControl>
                      <Input placeholder="DM Commerce OS" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="primaryHex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary color</FormLabel>
                    <div className="flex items-center gap-3">
                      <FormControl>
                        <Input type="color" className="h-10 w-16 p-1" {...field} />
                      </FormControl>
                      <Input value={field.value} onChange={field.onChange} className="max-w-[140px]" />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <FormLabel>Logo</FormLabel>
                <p className="text-sm text-muted-foreground">
                  Upload a square PNG or SVG. Files are stored locally under <code>/public/uploads</code>.
                </p>
                <Input type="file" accept="image/*" onChange={handleFileChange} />
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" disabled={!previewUrl} onClick={handleClearLogo}>
                    Remove logo
                  </Button>
                  {watchedLogoPath && !logoFile && !removeLogo ? (
                    <span className="text-sm text-muted-foreground">Current: {watchedLogoPath}</span>
                  ) : null}
                </div>
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Save preferences"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>Your dashboard shell reflects these values.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg border bg-white p-2 shadow-sm dark:bg-background">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt="Brand logo preview"
                  src={previewUrl}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                  Logo
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold">{watchedBrand || "Your brand"}</p>
              <p className="text-xs text-muted-foreground">Primary color {watchedColor}</p>
            </div>
          </div>
          <div className="space-y-2 rounded-lg border p-4">
            <p className="text-xs uppercase text-muted-foreground">CTA preview</p>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">DM keyword</p>
                <p className="text-xs text-muted-foreground">Your funnels will highlight this accent color.</p>
              </div>
              <div
                className="rounded-full px-3 py-1 text-xs font-semibold text-white"
                style={{ backgroundColor: watchedColor || "#6366F1" }}
              >
                Try it now
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
