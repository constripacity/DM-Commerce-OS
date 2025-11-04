"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Setting } from "@prisma/client";
import { Palette, RefreshCw, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { settingSchema } from "@/lib/validators";
import { ThemeId, palettes, useThemeController } from "@/components/dashboard/theme-provider";
import { cn } from "@/lib/utils";

const formSchema = settingSchema.extend({
  logoPath: settingSchema.shape.logoPath.default(null),
});

type SettingsFormValues = z.infer<typeof formSchema>;

const fetchSettings = async () => {
  const response = await fetch("/api/settings", { credentials: "include", cache: "no-store" });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return (await response.json()) as Setting;
};

export function SettingsTab() {
  const { toast } = useToast();
  const { theme, setTheme } = useThemeController();
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = React.useState(false);
  const [resetOpen, setResetOpen] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);

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

  const activePalette = React.useMemo(() => palettes.find((palette) => palette.id === theme), [theme]);
  const backgroundColor = activePalette?.isDark ? "#0f172a" : "#ffffff";
  const contrastRatio = getContrastRatio(watchedColor, backgroundColor);
  const passesContrast = contrastRatio >= 4.5;

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
        credentials: "include",
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

  const handleThemeSelect = (paletteId: ThemeId) => {
    setTheme(paletteId);
    toast({ title: "Palette applied", description: `Theme switched to ${paletteId}.` });
  };

  const handleResetDemo = async () => {
    setResetting(true);
    try {
      const res = await fetch("/api/demo-reset", { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: "Demo data reset", description: "Database reseeded with fresh sandbox content." });
    } catch (error) {
      toast({
        title: "Reset failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setResetting(false);
      setResetOpen(false);
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
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
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
                      <div className="flex flex-wrap items-center gap-3">
                        <FormControl>
                          <Input type="color" className="h-10 w-16 p-1" {...field} />
                        </FormControl>
                        <Input value={field.value} onChange={field.onChange} className="max-w-[140px]" />
                        <span className="text-xs text-muted-foreground">Contrast {contrastRatio.toFixed(2)}:1</span>
                        {!passesContrast ? (
                          <span className="rounded-full bg-destructive/10 px-2 py-1 text-xs text-destructive">
                            Low contrast – pick a darker shade
                          </span>
                        ) : null}
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
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Button type="submit" disabled={submitting} className="gap-2">
                    <Sparkles className="h-4 w-4" /> {submitting ? "Saving…" : "Save preferences"}
                  </Button>
                  <Button type="button" variant="ghost" className="gap-2" onClick={() => setResetOpen(true)}>
                    <RefreshCw className="h-4 w-4" /> Reset demo data
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Visual preview</CardTitle>
            <CardDescription>Your dashboard shell reflects these values.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border bg-white shadow-sm dark:bg-background">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="Brand logo preview" src={previewUrl} className="h-full w-full object-contain" />
                ) : (
                  <span className="text-sm font-semibold text-muted-foreground">{watchedBrand?.slice(0, 2) || "DM"}</span>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold">{watchedBrand || "Your brand"}</p>
                <p className="text-xs text-muted-foreground">Primary color {watchedColor}</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border p-4">
                <p className="text-xs uppercase text-muted-foreground">CTA preview</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">DM keyword</p>
                    <p className="text-xs text-muted-foreground">Your funnels will highlight this accent color.</p>
                  </div>
                  <div className="rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ backgroundColor: watchedColor || "#6366F1" }}>
                    Try it now
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border bg-muted/40 p-4">
                <p className="text-xs uppercase text-muted-foreground">Favicon & social</p>
                <div className="mt-3 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg" style={{ backgroundColor: watchedColor || "#6366F1" }}>
                    <span className="text-sm font-semibold text-white">{watchedBrand?.slice(0, 1) || "D"}</span>
                  </div>
                  <div className="flex-1 rounded-lg border bg-background p-3 text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground">{watchedBrand || "DM Commerce"}</p>
                    <p>Keyword campaigns auto-style hero sections and previews.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                <Palette className="h-3.5 w-3.5" /> Theme palette
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {palettes.map((palette) => (
                  <button
                    key={palette.id}
                    type="button"
                    onClick={() => handleThemeSelect(palette.id)}
                    className={cn(
                      "flex items-center justify-between rounded-xl border p-4 text-left transition hover:border-primary",
                      theme === palette.id ? "border-primary bg-primary/5" : "border-border"
                    )}
                  >
                    <div>
                      <p className="text-sm font-semibold">{palette.label}</p>
                      <p className="text-xs text-muted-foreground">{palette.description}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {palette.swatches.map((swatch) => (
                        <span key={swatch} className="h-6 w-6 rounded-full border" style={{ backgroundColor: swatch }} />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset demo data</DialogTitle>
            <DialogDescription>
              This wipes orders, products, scripts, and settings and then re-seeds the sandbox. Existing changes will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)} disabled={resetting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleResetDemo} disabled={resetting}>
              {resetting ? "Resetting…" : "Reset now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getContrastRatio(hex1: string, hex2: string) {
  const luminance1 = getLuminance(hex1);
  const luminance2 = getLuminance(hex2);
  const brightest = Math.max(luminance1, luminance2);
  const darkest = Math.min(luminance1, luminance2);
  return (brightest + 0.05) / (darkest + 0.05);
}

function getLuminance(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function hexToRgb(hex: string) {
  const sanitized = hex.replace("#", "");
  if (sanitized.length !== 6) return null;
  const bigint = Number.parseInt(sanitized, 16);
  return [
    (bigint >> 16) & 255,
    (bigint >> 8) & 255,
    bigint & 255,
  ];
}

