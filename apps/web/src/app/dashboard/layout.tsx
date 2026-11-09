"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Route } from "next";
import { parseRole } from "@/lib/auth/role";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  const role = parseRole(user?.publicMetadata?.role);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in" as Route);
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7CFC00] mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {role === "super_admin" && (
        <div className="bg-[#7CFC00]/15 border-b border-[#7CFC00]/30 px-6 py-2.5 flex items-center justify-between text-xs text-white">
          <span className="font-bold text-[#7CFC00] flex items-center gap-2">
            <span>👁️</span> Super Admin Preview: Viewing Fan Dashboard
          </span>
          <Link href="/admin" className="text-white hover:underline font-mono">
            Return to Admin Desk →
          </Link>
        </div>
      )}
      {children}
    </div>
  );
}
