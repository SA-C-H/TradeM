import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  Bot,
  CalendarDays,
  Image,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Menu,
  Moon,
  Plus,
  SquareArrowOutUpRight,
  Settings,
  Sun,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import AccountSwitcher from '@/components/AccountSwitcher';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/trades', icon: ListOrdered, label: 'Trades' },
  { to: '/trades/new', icon: Plus, label: 'New Trade' },
  { to: '/gallery', icon: Image, label: 'Gallery' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
  { to: '/playbook', icon: BookOpen, label: 'Playbook' },
  { to: '/fx-replay', icon: SquareArrowOutUpRight, label: 'FX Replay' },
  { to: '/ai', icon: Bot, label: 'AI Assistant' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

function NavLinks({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <nav className={cn('flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3', className)}>
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors sm:min-h-10 sm:py-2',
              isActive
                ? 'bg-sidebar-accent font-medium text-primary'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )
          }
        >
          <item.icon className="h-5 w-5 shrink-0 sm:h-4 sm:w-4" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarFooter({
  onNavigate,
  showEmail,
}: {
  onNavigate?: () => void;
  showEmail: boolean;
}) {
  const { signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="shrink-0 space-y-1 border-t border-sidebar-border p-2">
      {showEmail && (
        <div className="truncate px-3 py-1 text-xs text-muted-foreground">{user?.email}</div>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => toggleTheme()}
        className="h-11 w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent sm:h-9"
        aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
      >
        {theme === 'dark' ? <Sun className="h-5 w-5 sm:h-4 sm:w-4" /> : <Moon className="h-5 w-5 sm:h-4 sm:w-4" />}
        <span>{theme === 'dark' ? 'Mode clair' : 'Mode sombre'}</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          onNavigate?.();
          void signOut();
        }}
        className="h-11 w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent sm:h-9"
      >
        <LogOut className="h-5 w-5 sm:h-4 sm:w-4" />
        <span>Déconnexion</span>
      </Button>
    </div>
  );
}

export default function AppLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-background pb-[env(safe-area-inset-bottom,0px)] sm:h-screen sm:max-h-none sm:flex-row sm:pb-0">
        {/* Desktop / tablette: barre latérale */}
        <aside className="hidden w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar sm:flex">
          <div className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-4">
            <TrendingUp className="h-8 w-8 shrink-0 text-primary" aria-hidden />
            <span className="text-sm font-semibold tracking-tight text-foreground">TradeLab</span>
          </div>
          <div className="border-b border-sidebar-border px-2 py-3">
            <AccountSwitcher />
          </div>
          <NavLinks />
          <SidebarFooter showEmail />
        </aside>

        {/* Zone principale + en-tête mobile */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-[env(safe-area-inset-top,0px)] sm:hidden">
            <SheetTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0" aria-label="Ouvrir le menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <TrendingUp className="h-8 w-8 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0 truncate text-sm font-semibold text-foreground">TradeLab</span>
          </header>
          <main className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable]">
            <Outlet />
          </main>
        </div>
      </div>

      <SheetContent
        side="left"
        className="flex w-[min(100%,20rem)] flex-col gap-0 border-sidebar-border bg-sidebar p-0 [&>button]:top-3.5"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Menu de navigation</SheetTitle>
        </SheetHeader>
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-4 pr-12">
          <TrendingUp className="h-8 w-8 shrink-0 text-primary" aria-hidden />
          <span className="text-sm font-semibold text-foreground">TradeLab</span>
        </div>
        <div className="border-b border-sidebar-border px-2 py-3">
          <AccountSwitcher />
        </div>
        <NavLinks onNavigate={() => setMobileOpen(false)} className="flex-1" />
        <SidebarFooter onNavigate={() => setMobileOpen(false)} showEmail />
      </SheetContent>
    </Sheet>
  );
}
