"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Setting } from "@prisma/client";
import { Palette, RefreshCw, Sparkles } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { settingSchema } from "@/lib/validators";
import { ThemeId, palettes, useThemeController } from "@/components/dashboard/theme-provider";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/useDashboardData";

const formSchema = settingSchema.extend({
  logoPath: settingSchema.shape.logoPath.default(null),
});

type SettingsFormValues = z.infer<typeof formSchema>;

interface SettingsTabProps {
  initialData?: Setting | null;
}

export function SettingsTab({ initialData }: SettingsTabProps) {
  const { toast } = useToast();
  const { theme, setTheme } = useThemeController();
  const { data: settingsData, error: settingsError, isLoading, mutate } = useSettings(true, initialData);
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

  const lastErrorToastRef = React.useRef(0);

  React.useEffect(() => {
    if (!settingsData) return;
    form.reset({
      brandName: settingsData.brandName,
      primaryHex: settingsData.primaryHex,
      logoPath: settingsData.logoPath ?? null,
    });
    setPreviewUrl(settingsData.logoPath ?? null);
    setRemoveLogo(false);
  }, [form, settingsData]);

  React.useEffect(() => {
    if (!settingsError) return;
    const now = Date.now();
    if (now - lastErrorToastRef.current < 10000) return;
    lastErrorToastRef.current = now;
    toast({
      title: "Unable to load settings",
      description: settingsError instanceof Error ? settingsError.message : "Please try again.",
      variant: "destructive",
    });
  }, [settingsError, toast]);

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
      await mutate(updated, { revalidate: false });
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

  if (!settingsData && isLoading) {
    return (
      <div className="max-w-3xl rounded-xl border border-border/50 bg-card/80 shadow-lg shadow-black/20 backdrop-blur-sm">
        <div className="border-b border-border/40 px-6 py-5">
          <h3 className="text-lg font-semibold">Brand settings</h3>
          <p className="text-xs text-muted-foreground/70">Loading your preferences...</p>
        </div>
        <div className="space-y-4 p-6">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        {/* Brand settings */}
        <div className="rounded-xl border border-border/50 bg-card/80 shadow-lg shadow-black/20 backdrop-blur-sm">
          <div className="border-b border-border/40 px-6 py-5">
            <h3 className="text-lg font-semibold">Brand settings</h3>
            <p className="text-xs text-muted-foreground/70">
              Customize the dashboard brand name, highlight color, and optional logo for exported assets.
            </p>
          </div>
          <div className="p-6">
            <Form {...form}>
              <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
                <FormField
                  control={form.control}
                  name="brandName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand name</FormLabel>
                      <FormControl>
                        <Input placeholder="DM Commerce OS" className="border-border/50 bg-background/50" {...field} />
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
                          <Input type="color" className="h-10 w-16 border-border/50 p-1" {...field} />
                        </FormControl>
                        <Input value={field.value} onChange={field.onChange} className="max-w-[140px] border-border/50 bg-background/50 font-mono" />
                        <span className="font-mono text-xs text-muted-foreground/70">Contrast {contrastRatio.toFixed(2)}:1</span>
                        {!passesContrast ? (
                          <span className="rounded-full bg-destructive/10 px-2 py-1 text-[10px] font-medium text-destructive">
                            Low contrast -- pick a darker shade
                          </span>
                        ) : null}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="logoPath"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logo</FormLabel>
                      <p className="text-xs text-muted-foreground/70">
                        Upload a square PNG or SVG. Files are stored locally under <code className="font-mono text-foreground">/public/uploads</code>.
                      </p>
                      <FormControl>
                        <Input type="file" accept="image/*" onChange={handleFileChange} className="border-border/50" />
                      </FormControl>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" disabled={!previewUrl} onClick={handleClearLogo} className="border-border/50">
                          Remove logo
                        </Button>
                        {watchedLogoPath && !logoFile && !removeLogo ? (
                          <span className="text-xs text-muted-foreground/70">Current: {watchedLogoPath}</span>
                        ) : null}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-6">
                  <Button type="submit" disabled={submitting} className="gap-2">
                    <Sparkles className="h-4 w-4" /> {submitting ? "Saving..." : "Save preferences"}
                  </Button>
                  <Button type="button" variant="ghost" className="gap-2 text-destructive" onClick={() => setResetOpen(true)}>
                    <RefreshCw className="h-4 w-4" /> Reset demo data
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>

        {/* Visual preview */}
        <div className="rounded-xl border border-border/50 bg-card/80 shadow-lg shadow-black/20 backdrop-blur-sm">
          <div className="border-b border-border/40 px-6 py-5">
            <h3 className="text-lg font-semibold">Visual preview</h3>
            <p className="text-xs text-muted-foreground/70">Your dashboard shell reflects these values.</p>
          </div>
          <div className="space-y-5 p-6">
            {/* Brand mark */}
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-border/40 bg-background/40 shadow-sm">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="Brand logo preview" src={previewUrl} className="h-full w-full object-contain" />
                ) : (
                  <span className="font-mono text-sm font-bold text-muted-foreground">{watchedBrand?.slice(0, 2) || "DM"}</span>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold">{watchedBrand || "Your brand"}</p>
                <p className="font-mono text-xs text-muted-foreground/70">Primary color {watchedColor}</p>
              </div>
            </div>

            {/* CTA + Favicon preview */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border/40 bg-background/40 p-4">
                <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/70">CTA preview</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">DM keyword</p>
                    <p className="text-xs text-muted-foreground/70">Your funnels will highlight this accent color.</p>
                  </div>
                  <div className="rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ backgroundColor: watchedColor || "#6366F1" }}>
                    Try it now
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-border/40 bg-background/40 p-4">
                <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/70">Favicon & social</p>
                <div className="mt-3 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg" style={{ backgroundColor: watchedColor || "#6366F1" }}>
                    <span className="font-mono text-sm font-bold text-white">{watchedBrand?.slice(0, 1) || "D"}</span>
                  </div>
                  <div className="flex-1 rounded-lg border border-border/40 bg-background/40 p-3 text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground">{watchedBrand || "DM Commerce"}</p>
                    <p className="text-muted-foreground/70">Keyword campaigns auto-style hero sections and previews.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Theme palette */}
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/70">
                <Palette className="h-3.5 w-3.5" /> Theme palette
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {palettes.map((palette) => (
                  <button
                    key={palette.id}
                    type="button"
                    onClick={() => handleThemeSelect(palette.id)}
                    className={cn(
                      "flex items-center justify-between gap-3 overflow-hidden rounded-xl border p-4 text-left transition-all",
                      theme === palette.id
                        ? "border-primary/80 bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.25)_inset]"
                        : "border-border/40 bg-background/40 hover:border-primary/60 hover:bg-background/60"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{palette.label}</p>
                      <p className="text-xs text-muted-foreground/70">{palette.description}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 rounded-full border border-border/40 bg-background/60 p-1.5">
                      {palette.swatches.map((swatch) => (
                        <span
                          key={swatch}
                          className="h-5 w-5 rounded-full border border-slate-900/40 shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset]"
                          style={{ backgroundColor: swatch }}
                        />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reset dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset demo data</DialogTitle>
            <DialogDescription>
              This wipes orders, products, scripts, and settings and then re-seeds the sandbox. Existing changes will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)} disabled={resetting} className="border-border/50">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleResetDemo} disabled={resetting}>
              {resetting ? "Resetting..." : "Reset now"}
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
