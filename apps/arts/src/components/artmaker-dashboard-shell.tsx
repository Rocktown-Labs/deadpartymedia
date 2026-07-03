import { Link, useLocation } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { BadgeCheck, CalendarDays, Images, LayoutDashboard, Settings } from "lucide-react";

interface ArtmakerDashboardShellProps {
  children: React.ReactNode;
}

interface NavItem {
  href: "/dashboard" | "/dashboard/artworks" | "/dashboard/profile" | "/dashboard/events";
  icon: LucideIcon;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/artworks", icon: Images, label: "Artworks" },
  { href: "/dashboard/profile", icon: Settings, label: "Profile" },
  { href: "/dashboard/events", icon: CalendarDays, label: "Events" },
];

function isActiveRoute(pathname: string, href: NavItem["href"]) {
  if (href === "/dashboard") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ArtmakerDashboardShell({ children }: ArtmakerDashboardShellProps) {
  const pathname = useLocation({ select: (location) => location.pathname });

  return (
    <main className="px-5 pt-[calc(var(--navbar-offset)+1.5rem)] pb-10">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-[calc(var(--navbar-offset)+1.5rem)] lg:self-start">
          <div className="rounded-lg border border-gray-800 bg-[#111111]">
            <div className="border-gray-800 border-b p-4">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-md border border-[#7CFC00]/40 text-[#7CFC00]">
                  <BadgeCheck className="size-5" />
                </div>
                <div>
                  <p className="font-black text-xl leading-none">Studio</p>
                  <p className="mt-1 text-gray-500 text-xs uppercase tracking-[0.18em]">
                    Artmaker tools
                  </p>
                </div>
              </div>
            </div>
            <nav className="grid gap-1 p-2">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActiveRoute(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`flex items-center gap-3 rounded-md border px-3 py-3 text-sm no-underline transition-colors ${
                      active
                        ? "border-[#7CFC00]/40 bg-[#7CFC00]/15 text-[#7CFC00]"
                        : "border-transparent text-gray-300 hover:bg-[#1A1A1A] hover:text-white"
                    }`}
                  >
                    <Icon className="size-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        <section className="min-w-0">{children}</section>
      </div>
    </main>
  );
}
