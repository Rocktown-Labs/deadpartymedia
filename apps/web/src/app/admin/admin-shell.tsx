"use client";

import Image from "next/image";
import { useLayoutEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { CalendarDays, Disc, LayoutDashboard, Mic2, Newspaper, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";

interface AdminShellProps {
  children: React.ReactNode;
  isSuperAdmin: boolean;
  userRole: "super_admin" | "writer";
}

interface NavItem {
  href: Route;
  label: string;
  icon: LucideIcon;
  superAdminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/posts", icon: Newspaper, label: "Articles" },
  { href: "/admin/music" as Route, icon: Disc, label: "Music Releases" },
  { href: "/admin/events", icon: CalendarDays, label: "Events" },
  { href: "/admin/artists", icon: Mic2, label: "Artists" },
  { href: "/admin/users", icon: Users, label: "Users", superAdminOnly: true },
];

function getNavbarHeight() {
  const header = document.querySelector("header");
  if (!header) {
    return 0;
  }
  return Math.ceil(header.getBoundingClientRect().height);
}

function isActiveRoute(pathname: string, href: Route) {
  if (href === "/admin") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children, isSuperAdmin, userRole }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [navbarHeight, setNavbarHeight] = useState<number>(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useLayoutEffect(() => {
    function measure() {
      setNavbarHeight(getNavbarHeight());
    }

    measure();

    const header = document.querySelector("header");
    if (!header) {
      return;
    }

    const ro = new ResizeObserver(measure);
    ro.observe(header);
    window.addEventListener("resize", measure);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const visibleNavItems = useMemo(
    () =>
      NAV_ITEMS.filter((item) => {
        if (item.superAdminOnly && !isSuperAdmin) {
          return false;
        }
        return true;
      }),
    [isSuperAdmin],
  );

  const shellVariables = useMemo(
    () =>
      ({
        "--admin-navbar-height": `${navbarHeight}px`,
        "--sidebar-offset-top": `${navbarHeight}px`,
      }) as CSSProperties,
    [navbarHeight],
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white" style={{ paddingTop: navbarHeight }}>
      <SidebarProvider
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        style={shellVariables}
        className="min-h-[calc(100svh-var(--admin-navbar-height))] bg-[#0A0A0A]"
      >
        <Sidebar
          mobileSide="bottom"
          collapsible="icon"
          className="border-r border-gray-800/80 bg-[#0A0A0A] group-data-[variant=sidebar]:border-r"
        >
          <SidebarHeader className="overflow-hidden border-b border-gray-800/80 p-4 group-data-[collapsible=icon]:p-2">
            {sidebarOpen ? (
              <div className="flex items-center justify-between gap-2 overflow-hidden">
                <div className="min-w-0">
                  <p className="text-2xl font-black text-[#7CFC00] leading-none">Admin</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-gray-400">
                    Control Center
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="shrink-0 border-gray-700 text-[10px] uppercase text-gray-300"
                >
                  {userRole === "super_admin" ? "Super Admin" : "Writer"}
                </Badge>
              </div>
            ) : (
              <div className="flex items-center justify-center py-1">
                <Image
                  src="/images/dead-party-logo.png"
                  alt="Dead Party Media"
                  width={26}
                  height={26}
                  className="size-[26px] rounded-full object-cover"
                />
              </div>
            )}
          </SidebarHeader>
          <SidebarContent className="p-2">
            <SidebarMenu>
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(pathname, item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => router.push(item.href)}
                      className="rounded-md border border-transparent text-sm text-gray-300 data-[active=true]:border-[#7CFC00]/40 data-[active=true]:bg-[#7CFC00]/15 data-[active=true]:text-[#7CFC00] hover:bg-[#1A1A1A] hover:text-white"
                    >
                      <Icon className="size-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="border-t border-gray-800/80 p-3 text-xs text-gray-500">
            <p className="truncate group-data-[collapsible=icon]:hidden">
              Cmd/Ctrl + B to toggle sidebar
            </p>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>
        <SidebarInset className="min-w-0 bg-[#0A0A0A]">
          <div className="sticky top-[var(--admin-navbar-height)] z-20 border-b border-gray-800/80 bg-[#0A0A0A]/95 px-4 py-3 backdrop-blur md:hidden">
            <SidebarTrigger className="border border-gray-700 text-white hover:border-[#7CFC00] hover:text-[#7CFC00]" />
          </div>
          <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
