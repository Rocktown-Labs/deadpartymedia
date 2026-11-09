"use client";

import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

interface DashboardBackButtonProps {
  fallbackHref?: Route;
  label?: string;
}

export function DashboardBackButton({
  fallbackHref = "/dashboard" as Route,
  label = "Back",
}: DashboardBackButtonProps) {
  return (
    <Link
      href={fallbackHref}
      className="inline-flex items-center text-[#7CFC00] hover:text-[#7CFC00]/80 mb-6 transition-all duration-300 transform hover:scale-110 px-0"
    >
      <ArrowLeft className="w-4 h-4 mr-2" />
      {label}
    </Link>
  );
}
