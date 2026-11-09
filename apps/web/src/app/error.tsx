"use client";

import * as Sentry from "@sentry/nextjs";
import { ArrowLeft, RefreshCw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";

export default function ErrorBoundary({
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
    <main className="min-h-screen bg-[#0A0A0A] px-6 pb-28 pt-[calc(var(--navbar-offset)+1.5rem)] text-white lg:pb-20">
      <div className="container mx-auto">
        <div className="mx-auto max-w-xl border border-gray-800 bg-[#111111] p-8 text-center sm:p-12">
          <Image
            src="/images/dead-party-logo.png"
            alt="Dead Party Media"
            width={88}
            height={88}
            className="mx-auto mb-6"
            priority
          />
          <p className="mb-2 text-xs font-black tracking-[0.35em] text-[#7CFC00]">
            APPLICATION ERROR
          </p>
          <h1 className="mb-3 text-3xl font-black leading-tight sm:text-4xl">
            Something went wrong
          </h1>
          <p className="mb-8 text-sm text-gray-400 sm:text-base">
            An unexpected error occurred while loading this page.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex h-11 items-center justify-center gap-2 border border-[#7CFC00] bg-[#7CFC00] px-5 text-xs font-black uppercase tracking-wider text-black transition-colors hover:bg-[#7CFC00]/90 cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center gap-2 border border-gray-700 bg-transparent px-5 text-xs font-black uppercase tracking-wider text-white transition-colors hover:border-gray-500 hover:bg-white/5"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
