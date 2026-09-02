import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { CommandProvider } from "@/components/command-palette";
import { Toaster } from "@/components/ui/toaster";
import { PWAProvider } from "@/components/pwa-provider";
import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0f172a",
};

export const metadata: Metadata = {
  title: "DM Commerce OS",
  description: "Offline DM-to-checkout simulator for creators",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DM Commerce OS",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background text-foreground antialiased font-sans")}>
        <PWAProvider>
          <ThemeProvider>
            <CommandProvider>
              <div className="relative flex min-h-screen flex-col bg-background">
                {children}
              </div>
              <Toaster />
            </CommandProvider>
          </ThemeProvider>
        </PWAProvider>
      </body>
    </html>
  );
}
