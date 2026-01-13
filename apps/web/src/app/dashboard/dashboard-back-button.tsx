"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardBackButtonProps {
  fallbackHref?: string;
  label?: string;
}

export function DashboardBackButton({
  fallbackHref = "/dashboard",
  label = "Back",
}: DashboardBackButtonProps) {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="ghost"
      className="text-gray-300 hover:text-white hover:bg-gray-800/40 px-2"
      onClick={() => {
        // Prefer browser history back for natural navigation; fall back to dashboard root.
        try {
          router.back();
        } catch {
          router.push(fallbackHref);
        }
      }}
    >
      <ArrowLeft className="w-4 h-4 mr-2" />
      {label}
    </Button>
  );
}

