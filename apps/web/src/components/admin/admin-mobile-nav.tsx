"use client"

import { Home, FileText, Calendar, Users } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export default function AdminMobileNav() {
  const pathname = usePathname()

  const navItems = [
    { icon: Home, label: "Dashboard", href: "/admin" },
    { icon: FileText, label: "Articles", href: "/admin/articles" },
    { icon: Calendar, label: "Events", href: "/admin/events" },
    { icon: Users, label: "Artists", href: "/admin/artists" },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0A] border-t border-gray-800 lg:hidden">
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors",
                isActive ? "text-[#7CFC00]" : "text-gray-400",
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
