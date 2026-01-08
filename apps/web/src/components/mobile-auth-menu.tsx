"use client";

import { startTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatarMenu } from "./user-avatar-menu";
import { useCurrentUser } from "@/lib/api/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function MobileAuthMenu() {
  const pathname = usePathname();
  const { data: user, isLoading } = useCurrentUser();

  // Show nothing while loading to prevent flash
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center">
        <div className="w-5 h-5" />
        <div className="h-0" />
      </div>
    );
  }

  // Authenticated state: use existing UserAvatarMenu
  if (user) {
    return (
      <div className="flex flex-col items-center justify-center">
        <UserAvatarMenu />
      </div>
    );
  }

  // Unauthenticated state: show dropdown menu
  const isSignInActive = pathname === "/sign-in";
  const isSignUpActive = pathname === "/sign-up";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex flex-col items-center justify-center gap-1 transition-colors",
            isSignInActive || isSignUpActive ? "text-[#7CFC00]" : "text-gray-400",
          )}
          aria-label="Authentication menu"
        >
          <User className="w-5 h-5" />
          <span className="text-xs font-medium">Sign In</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-48 bg-[#0A0A0A] border border-gray-800 text-white mb-2"
        align="center"
        side="top"
        sideOffset={8}
      >
        <DropdownMenuItem asChild className="cursor-pointer hover:bg-gray-900 focus:bg-gray-900">
          <Link
            href="/sign-in"
            onClick={() => {
              startTransition(() => {
                // Smooth transition handled by Next.js navigation
              });
            }}
            className="flex items-center gap-2"
          >
            <User className="w-4 h-4" />
            Sign In
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer hover:bg-gray-900 focus:bg-gray-900">
          <Link
            href="/sign-up"
            onClick={() => {
              startTransition(() => {
                // Smooth transition handled by Next.js navigation
              });
            }}
            className="flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Sign Up
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

