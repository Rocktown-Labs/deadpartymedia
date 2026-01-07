"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { History, MessageSquare, Settings, LogOut, LayoutDashboard } from "lucide-react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCurrentUser, useLogout } from "@/lib/api/auth"
import { getDashboardRoute } from "@/lib/utils/dashboard"
import { Button } from "@/components/ui/button"

function getInitials(name: string): string {
  if (!name) return "U"
  const parts = name.trim().split(" ")
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export function UserAvatarMenu() {
  const router = useRouter()
  const { data: user, isLoading } = useCurrentUser()
  const logout = useLogout()

  if (isLoading || !user) {
    return null
  }

  const handleLogout = async () => {
    try {
      await logout.mutateAsync()
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const dashboardRoute = getDashboardRoute(user.role)
  const initials = getInitials(user.name)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-full border border-gray-800 hover:border-[#7CFC00] transition-colors bg-transparent p-0"
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatar || undefined} alt={user.name} />
            <AvatarFallback className="bg-[#111111] text-[#7CFC00] border border-gray-800">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 bg-[#0A0A0A] border border-gray-800 text-white"
        align="end"
        sideOffset={4}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatar || undefined} alt={user.name} />
              <AvatarFallback className="bg-[#111111] text-[#7CFC00] border border-gray-800">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{user.name}</span>
              <span className="text-xs text-gray-400">{user.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-800" />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild className="cursor-pointer hover:bg-gray-900 focus:bg-gray-900">
            <Link href={dashboardRoute} className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
          </DropdownMenuItem>
          {user.role === "fan" && (
            <>
              <DropdownMenuItem asChild className="cursor-pointer hover:bg-gray-900 focus:bg-gray-900">
                <Link href="/dashboard/history" className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  History
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer hover:bg-gray-900 focus:bg-gray-900">
                <Link href="/dashboard/comments" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Comments
                </Link>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem asChild className="cursor-pointer hover:bg-gray-900 focus:bg-gray-900">
            <Link href="/dashboard/settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-gray-800" />
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-red-500 hover:text-red-400 hover:bg-gray-900 focus:bg-gray-900 focus:text-red-400"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

