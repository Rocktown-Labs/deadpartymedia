"use client"

import { Home, Music, Calendar, ShoppingBag } from "lucide-react"
import Link from "next/link"
import type { Route } from "next"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { UserAvatarMenu } from "./user-avatar-menu"
import { useCurrentUser } from "@/lib/api/auth"

export default function MobileBottomNav() {
  const pathname = usePathname()
  const { data: user } = useCurrentUser()

  const navItems = [
    { icon: Home, label: "Home", href: "/" as Route },
    { icon: Music, label: "Music", href: "/music" as Route },
    { icon: Calendar, label: "Events", href: "/events" as Route },
    { icon: ShoppingBag, label: "Merch", href: "/merch" as Route },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0A] border-t border-gray-800 lg:hidden">
      <div className="grid grid-cols-5 h-16">
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
        <div className="flex flex-col items-center justify-center">
          {user ? (
            <UserAvatarMenu />
          ) : (
            <Link
              href="/sign-in"
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors",
                pathname === "/sign-in" ? "text-[#7CFC00]" : "text-gray-400",
              )}
            >
              <span className="text-xs font-medium">Sign In</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
