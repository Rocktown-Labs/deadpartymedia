"use client";

import { useLayoutEffect, useState } from "react";
import Link from "next/link";

interface AdminShellProps {
  children: React.ReactNode;
  isSuperAdmin: boolean;
  userRole: "super_admin" | "writer";
}

function getNavbarHeight() {
  const header = document.querySelector("header");
  if (!header) return 0;
  return Math.ceil(header.getBoundingClientRect().height);
}

export function AdminShell({ children, isSuperAdmin, userRole }: AdminShellProps) {
  const [navbarHeight, setNavbarHeight] = useState<number>(0);

  useLayoutEffect(() => {
    function measure() {
      setNavbarHeight(getNavbarHeight());
    }

    measure();

    const header = document.querySelector("header");
    if (!header) return;

    const ro = new ResizeObserver(measure);
    ro.observe(header);
    window.addEventListener("resize", measure);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white" style={{ paddingTop: navbarHeight }}>
      <div className="flex">
        {/* Sidebar */}
        <aside
          className="w-64 bg-[#111111] border-r border-gray-800 overflow-y-auto p-6"
          style={{
            height: `calc(100vh - ${navbarHeight}px)`,
            position: "sticky",
            top: navbarHeight,
          }}
        >
          <div className="mb-8">
            <h1 className="text-2xl font-black text-[#7CFC00]">Admin</h1>
            <p className="text-sm text-gray-400 mt-1">
              Role: {userRole === "super_admin" ? "Super Admin" : "Writer"}
            </p>
          </div>

          <nav className="space-y-2">
            <Link
              href="/admin"
              className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/posts"
              className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Posts
            </Link>
            <Link
              href="/admin/events"
              className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Events
            </Link>
            <Link
              href="/admin/artists"
              className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Artists
            </Link>
            {isSuperAdmin && (
              <Link
                href="/admin/users"
                className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Users
              </Link>
            )}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}

