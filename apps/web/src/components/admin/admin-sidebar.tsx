"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Users,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Home,
} from "lucide-react"
import { cn } from "@/lib/utils"

export function AdminSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const pathname = usePathname()

  const navItems = [
    { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/admin/articles", icon: FileText, label: "Articles" },
    { href: "/admin/events", icon: Calendar, label: "Events" },
    { href: "/admin/artists", icon: Users, label: "Artists" },
  ]

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#111111] border border-gray-800 rounded-lg text-white hover:border-[#7CFC00] transition-colors"
      >
        {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setIsMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full bg-[#0A0A0A] border-r border-gray-800 z-40 transition-all duration-300",
          isCollapsed ? "w-20" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center justify-between">
              {!isCollapsed && (
                <div className="text-lg font-bold">
                  <span className="text-[#7CFC00]">DEAD</span> <span className="text-white">PARTY</span>
                </div>
              )}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:block p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronLeft className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>
            {!isCollapsed && <p className="text-xs text-gray-500 mt-1">Admin Panel</p>}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                    active
                      ? "bg-[#7CFC00]/10 text-[#7CFC00] border border-[#7CFC00]/20"
                      : "text-gray-400 hover:text-white hover:bg-gray-800",
                    isCollapsed && "justify-center",
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && <span className="font-medium">{item.label}</span>}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-800 space-y-2">
            <Link
              href="/"
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors",
                isCollapsed && "justify-center",
              )}
            >
              <Home className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span className="font-medium">Back to Site</span>}
            </Link>
            <button
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-gray-800 transition-colors",
                isCollapsed && "justify-center",
              )}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span className="font-medium">Logout</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
