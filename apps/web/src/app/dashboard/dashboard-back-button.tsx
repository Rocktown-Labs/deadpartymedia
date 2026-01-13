"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Route } from "next";

interface DashboardBackButtonProps {
  fallbackHref?: Route;
  label?: string;
}

export function DashboardBackButton({
  fallbackHref = "/dashboard" as Route,
  label = "Back",
}: DashboardBackButtonProps) {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="ghost"
      className="inline-flex items-center text-[#7CFC00] hover:text-[#7CFC00]/80 mb-6 transition-all duration-300 transform hover:scale-110 px-0"
      onClick={() => {
        // Prefer browser history back for natural navigation; fall back to dashboard root.
        router.back();
        // If the user landed directly on this page (no history), offer a deterministic escape hatch.
        window.setTimeout(() => router.push(fallbackHref), 0);
      }}
    >
      <ArrowLeft className="w-4 h-4 mr-2" />
      {label}
    </Button>
  );
}

