import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { CommandProvider } from "@/components/command-palette";
import { Toaster } from "@/components/ui/toaster";
import { PWAProvider } from "@/components/pwa-provider";
import type { Viewport } from "next";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const jetBrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "DM Commerce OS",
  description: "Offline DM-to-checkout simulator for creators",
  manifest: "/manifest.webmanifest",
  themeColor: "#0f172a",
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
      <body className={cn("min-h-screen bg-background text-foreground antialiased font-sans", inter.variable, jetBrains.variable)}>
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
