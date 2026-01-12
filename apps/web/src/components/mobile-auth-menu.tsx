"use client";

import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { User } from "lucide-react";

export function MobileAuthMenu() {
  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <button
            className="flex flex-col items-center justify-center gap-1 transition-colors text-gray-400 hover:text-[#7CFC00]"
            aria-label="Sign in"
          >
            <User className="w-5 h-5" />
            <span className="text-xs font-medium">Sign In</span>
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton
          appearance={{
            elements: {
              avatarBox: "h-10 w-10 border border-gray-800 hover:border-[#7CFC00] rounded-lg",
              userButtonPopoverCard: "bg-[#0A0A0A] border-gray-800",
              userButtonPopoverActionButton: "text-white hover:bg-gray-900",
              userButtonPopoverActionButtonText: "text-white",
            },
          }}
        />
      </SignedIn>
    </>
  );
}

