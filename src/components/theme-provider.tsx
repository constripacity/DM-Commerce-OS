"use client";

import * as React from "react";

export type ThemeId = "daybreak" | "twilight" | "midnight" | "evergreen" | "blush" | "noir";

export interface ThemePalette {
  id: ThemeId;
  label: string;
  description: string;
  isDark: boolean;
  swatches: [string, string, string];
}

const storageKey = "dm-commerce-theme";

export const palettes: ThemePalette[] = [
  { id: "daybreak", label: "Daybreak", description: "Warm sunrise gradients", isDark: false, swatches: ["#fb923c", "#facc15", "#38bdf8"] },
  { id: "twilight", label: "Twilight", description: "Neon dusk purples", isDark: true, swatches: ["#a855f7", "#6366f1", "#22d3ee"] },
  { id: "midnight", label: "Midnight", description: "Deep ocean blues", isDark: true, swatches: ["#60a5fa", "#38bdf8", "#f472b6"] },
  { id: "evergreen", label: "Evergreen", description: "Forest calm greens", isDark: false, swatches: ["#10b981", "#22c55e", "#facc15"] },
  { id: "blush", label: "Blush", description: "Rosy creative vibe", isDark: false, swatches: ["#f472b6", "#fb7185", "#818cf8"] },
  { id: "noir", label: "Noir", description: "High-contrast monochrome", isDark: true, swatches: ["#0f172a", "#f8fafc", "#facc15"] },
];

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  cycleTheme: () => void;
  palettes: ThemePalette[];
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

function setDocumentTheme(theme: ThemeId) {
  const element = document.documentElement;
  element.setAttribute("data-theme", theme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<ThemeId>(() => {
    if (typeof window === "undefined") {
      return "daybreak";
    }
    const stored = window.localStorage.getItem(storageKey) as ThemeId | null;
    return stored && palettes.some((palette) => palette.id === stored) ? stored : "daybreak";
  });
  const [isHydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setDocumentTheme(theme);
    window.localStorage.setItem(storageKey, theme);
    setHydrated(true);
  }, [theme]);

  React.useEffect(() => {
    if (!isHydrated) {
      setDocumentTheme(theme);
    }
  }, [isHydrated, theme]);

  const cycleTheme = React.useCallback(() => {
    const index = palettes.findIndex((palette) => palette.id === theme);
    const next = palettes[(index + 1) % palettes.length];
    setThemeState(next.id);
  }, [theme]);

  const setTheme = React.useCallback((value: ThemeId) => {
    setThemeState(value);
  }, []);

  const value = React.useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, cycleTheme, palettes }),
    [theme, setTheme, cycleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeController() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeController must be used within ThemeProvider");
  }
  return context;
}
