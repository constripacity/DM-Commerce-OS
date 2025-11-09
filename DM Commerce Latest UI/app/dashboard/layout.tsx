'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  MessageSquare,
  TrendingUp,
  FileText,
  BarChart3,
  Settings,
  Menu,
  Search,
  Command,
  Moon,
  Sun,
  Zap,
} from 'lucide-react';
import { useTheme } from 'next-themes';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/products', label: 'Products', icon: Package },
  { href: '/dashboard/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/dashboard/dm-studio', label: 'DM Studio', icon: MessageSquare },
  { href: '/dashboard/campaigns', label: 'Campaigns', icon: TrendingUp },
  { href: '/dashboard/scripts', label: 'Scripts', icon: FileText },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={cn('flex flex-col h-full', mobile ? 'p-4' : 'p-6')}>
      <Link
        href="/"
        className="flex items-center gap-2 mb-8 group"
        onClick={() => mobile && setIsMobileMenuOpen(false)}
        prefetch={true}
      >
        <div className="rounded-xl bg-primary p-2 group-hover:scale-105 transition-transform duration-200">
          <Zap className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="font-bold text-lg">DM Commerce OS</span>
      </Link>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onClick={() => mobile && setIsMobileMenuOpen(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-150',
                'hover:bg-accent group',
                isActive ? 'bg-accent border-l-4 border-primary font-semibold text-foreground' : 'text-muted-foreground'
              )}
            >
              <item.icon
                className={cn(
                  'h-5 w-5 transition-colors duration-150',
                  isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                )}
              />
              <span className={cn('transition-colors duration-150', isActive ? 'text-foreground font-medium' : 'text-muted-foreground group-hover:text-foreground')}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="pt-4 border-t">
        <div className="flex items-center gap-3 px-4 py-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              DU
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Demo User</p>
            <p className="text-xs text-muted-foreground">demo@local.test</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden md:flex w-64 border-r bg-card/50 backdrop-blur-sm">
        <Sidebar />
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b bg-card/50 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 md:px-6 py-3">
            <div className="flex items-center gap-3">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <Sidebar mobile />
                </SheetContent>
              </Sheet>

              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 rounded-xl bg-accent/50 border-0 focus:ring-2 focus:ring-ring text-sm w-64"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
              <Button variant="ghost" size="icon" className="rounded-xl hidden sm:flex">
                <Command className="h-5 w-5" />
                <span className="sr-only">Command palette</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
