"use client";

import * as Sentry from "@sentry/nextjs";
import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="rounded-lg border border-red-900/50 bg-[#111111] p-8 text-center sm:p-12">
      <p className="mb-2 text-xs font-black tracking-[0.35em] text-red-500">ADMIN ERROR</p>
      <h2 className="mb-3 text-2xl font-bold text-white sm:text-3xl">Failed to load admin view</h2>
      <p className="mx-auto mb-8 max-w-md text-sm text-gray-400">
        An error occurred while loading this section of the admin dashboard.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex h-10 items-center justify-center gap-2 border border-[#7CFC00] bg-[#7CFC00] px-4 text-xs font-black uppercase tracking-wider text-black transition-colors hover:bg-[#7CFC00]/90 cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
        <Link
          href="/admin"
          className="inline-flex h-10 items-center justify-center gap-2 border border-gray-700 bg-transparent px-4 text-xs font-black uppercase tracking-wider text-white transition-colors hover:border-gray-500 hover:bg-white/5"
        >
          <ArrowLeft className="h-4 w-4" />
          Admin Overview
        </Link>
      </div>
    </div>
  );
}
