import { useMusicSession } from "@/lib/auth-client";

import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

import { parseRole } from "@/lib/auth/role";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { session: user, isPending: sessionPending } = useMusicSession();
  const isLoaded = !sessionPending;
  const isSignedIn = !!user;
  const router = useRouter();
  const navigate = useNavigate();

  const role = parseRole(user?.roles[0]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate({ to: "/sign-in" });
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
          <Link to="/admin" className="text-white hover:underline font-mono">
            Return to Admin Desk →
          </Link>
        </div>
      )}
      {children}
    </div>
  );
}
