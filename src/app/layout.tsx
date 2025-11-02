import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { LayoutContainer } from "@/components/layout-container";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DM Commerce OS",
  description: "Offline DM-to-checkout simulator for creators",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <div className="min-h-screen bg-background text-foreground">
            <header className="border-b">
              <LayoutContainer className="flex items-center justify-between py-4">
                <div className="flex flex-col">
                  <span className="text-lg font-semibold">DM Commerce OS</span>
                  <span className="text-sm text-muted-foreground">
                    Local DM-to-checkout simulator
                  </span>
                </div>
                <ThemeToggle />
              </LayoutContainer>
            </header>
            <main className="py-10">
              <LayoutContainer>{children}</LayoutContainer>
            </main>
            <footer className="border-t py-6 text-sm text-muted-foreground">
              <LayoutContainer>
                Built for a sandboxed creator commerce demo.
              </LayoutContainer>
            </footer>
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
