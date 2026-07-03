import { Link, useLocation } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { CalendarDays, Images, LayoutDashboard, Newspaper, ShoppingBag, Users } from "lucide-react";

interface ArtsAdminShellProps {
  children: React.ReactNode;
  role?: unknown;
}

interface NavItem {
  href:
    | "/admin"
    | "/admin/artmakers"
    | "/admin/articles"
    | "/admin/events"
    | "/admin/exhibitions"
    | "/admin/users";
  icon: LucideIcon;
  label: string;
  superAdminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/articles", icon: Newspaper, label: "Articles" },
  { href: "/admin/events", icon: CalendarDays, label: "Events" },
  { href: "/admin/artmakers", icon: Users, label: "Artmakers" },
  { href: "/admin/exhibitions", icon: Images, label: "Exhibitions" },
  { href: "/admin/users", icon: ShoppingBag, label: "Staff", superAdminOnly: true },
];

function isActiveRoute(pathname: string, href: NavItem["href"]) {
  if (href === "/admin") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function formatRole(role: unknown) {
  if (role === "super_admin" || role === "admin") {
    return "Super Admin";
  }
  if (role === "arts_admin") {
    return "Arts Admin";
  }
  if (role === "arts_writer") {
    return "Arts Writer";
  }
  return "Staff";
}

export function ArtsAdminShell({ children, role }: ArtsAdminShellProps) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const isSuperAdmin = role === "super_admin" || role === "admin";
  const visibleNavItems = NAV_ITEMS.filter((item) => !item.superAdminOnly || isSuperAdmin);

  return (
    <main className="px-5 pt-[calc(var(--navbar-offset)+1.5rem)] pb-10">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-[calc(var(--navbar-offset)+1.5rem)] lg:self-start">
          <div className="rounded-lg border border-gray-800 bg-[#111111]">
            <div className="border-gray-800 border-b p-4">
              <p className="font-black text-2xl text-[#7CFC00] leading-none">Admin</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-gray-400 text-xs uppercase tracking-[0.18em]">Arts desk</p>
                <span className="rounded border border-gray-700 px-2 py-1 text-[10px] text-gray-300 uppercase tracking-wider">
                  {formatRole(role)}
                </span>
              </div>
            </div>
            <nav className="grid gap-1 p-2">
              {visibleNavItems.map((item) => {
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
