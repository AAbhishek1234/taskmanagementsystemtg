"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Inbox,
  Calendar,
  Layers,
  Send,
  Users,
  UsersRound,
  Search,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { ROLE_LABELS, useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { NotificationBell } from "@/components/NotificationBell";
import { SidebarTree } from "@/components/SidebarTree";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/tasks", label: "Everything", icon: Layers },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/publishing", label: "Publishing", icon: Send },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/users", label: "Team", icon: UsersRound, adminOnly: true },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] text-sm text-navy-400">
        Loading...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || user.role === "admin");
  // Spaces / Folders / Lists are the internal team's workspace; freelancers and clients don't get the tree.
  const showTree = user.role === "admin" || user.role === "manager" || user.role === "team_member";

  return (
       <div className="flex min-h-screen w-full max-w-full overflow-x-clip bg-[#eef1fb]">
      {/* SIDEBAR — desktop */}
      {/* SIDEBAR — desktop */}
      <aside className="relative sticky top-0 hidden h-screen w-64 flex-col overflow-y-auto bg-navy-900 px-4 py-6 text-white sm:flex">
 <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 overflow-hidden opacity-20">
          <svg viewBox="0 0 200 200" className="h-full w-full">
            <g stroke="white" strokeWidth="0.5" fill="none">
              <circle cx="20" cy="180" r="2" fill="white" />
              <circle cx="60" cy="150" r="2" fill="white" />
              <circle cx="100" cy="190" r="2" fill="white" />
              <circle cx="140" cy="160" r="2" fill="white" />
              <line x1="20" y1="180" x2="60" y2="150" />
              <line x1="60" y1="150" x2="100" y2="190" />
              <line x1="100" y1="190" x2="140" y2="160" />
              <line x1="60" y1="150" x2="140" y2="160" />
            </g>
          </svg>
        </div>

        <Link href="/dashboard" className="relative z-10 flex items-center gap-2 px-2">
          <Logo size={28} inverted />
        </Link>

        <nav className="relative z-10 mt-8 flex flex-col gap-1">
          {visibleItems.map((item) => {
            const active = pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="relative z-10 flex-1">{showTree && <SidebarTree />}</div>

        <div className="relative z-10 mt-auto px-2 pt-6 text-xs text-white/60">
          <p>Build Today.</p>
          <p>Grow Tomorrow.</p>
          <span className="mt-3 block h-0.5 w-8 bg-orange" />
        </div>
      </aside>

      {/* SIDEBAR — mobile drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 sm:hidden">
          <div
            className="absolute inset-0 bg-navy-900/50"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative flex h-full w-64 flex-col overflow-y-auto bg-navy-900 px-4 py-6 text-white">
            <div className="flex items-center justify-between px-2">
              <Link href="/dashboard" className="flex items-center gap-2">
                <Logo size={26} inverted />
                {/* <span className="text-sm font-semibold">
                  Thunder<span className="text-orange">Gits</span>
                </span> */}
              </Link>
              <button onClick={() => setMobileNavOpen(false)} className="p-1 text-white/70">
                <X size={20} />
              </button>
            </div>

            <nav className="mt-8 flex flex-col gap-1">
              {visibleItems.map((item) => {
                const active = pathname?.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex-1 overflow-y-auto">{showTree && <SidebarTree />}</div>

            <div className="mt-auto px-2 pt-6 text-xs text-white/60">
              <p>Build Today.</p>
              <p>Grow Tomorrow.</p>
              <span className="mt-3 block h-0.5 w-8 bg-orange" />
            </div>
          </aside>
        </div>
      )}

      {/* MAIN COLUMN */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* TOP BAR — desktop */}
        <header className="sticky top-0 z-20 hidden items-center justify-between border-b border-navy-100 bg-white px-6 py-3 sm:flex">
          <div className="relative w-full max-w-sm">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
            <input
              type="text"
              placeholder="Search anything..."
              className="input w-full bg-[#eef1fb] pl-9"
            />
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="h-6 w-px bg-navy-100" />
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange text-xs font-semibold text-white">
                {initials}
              </div>
              <div className="text-sm leading-tight">
                <p className="font-medium text-navy-900">{user.name}</p>
                <p className="text-xs text-navy-400">{ROLE_LABELS[user.role]}</p>
              </div>
            </div>
            <div className="h-6 w-px bg-navy-100" />
            <button
              onClick={logout}
              className="rounded-lg border border-navy-200 px-2.5 py-1.5 text-xs font-medium text-navy-600 hover:bg-navy-50"
            >
              Log out
            </button>
          </div>
        </header>

        {/* TOP BAR — mobile */}
               {/* TOP BAR — mobile */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-navy-100 bg-white px-3 py-2.5 sm:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <button onClick={() => setMobileNavOpen(true)} className="shrink-0 p-1 text-navy-600">
              <Menu size={22} />
            </button>
            <Link href="/dashboard" className="flex min-w-0 items-center gap-1.5">
              <Logo size={22} />
              {/* <span className="truncate text-sm font-semibold text-navy-900">
                Thunder<span className="text-orange">Gits</span>
              </span> */}
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <NotificationBell />
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange text-xs font-semibold text-white">
              {initials}
            </div>
            <button
              onClick={logout}
              aria-label="Log out"
              className="rounded-lg border border-navy-200 p-1.5 text-navy-600 hover:bg-navy-50"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

                <main className="min-w-0 flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}