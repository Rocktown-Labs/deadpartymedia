"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Route } from "next";
import { parseRole } from "@/lib/auth/role";

export default function VenueDashboardLayout({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  const role = parseRole(user?.publicMetadata?.role);
  const isVenueAuthorized = role === "venue" || role === "super_admin";

  useEffect(() => {
    if (isLoaded && (!isSignedIn || !isVenueAuthorized)) {
      router.push("/sign-in" as Route);
    }
  }, [isLoaded, isSignedIn, isVenueAuthorized, router]);

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

  if (!isSignedIn || !user || !isVenueAuthorized) {
    return null;
  }

  return <>{children}</>;
}
