import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
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
          <p className="mb-2 text-xs font-black tracking-[0.35em] text-[#7CFC00]">404 ERROR</p>
          <h1 className="mb-3 text-3xl font-black leading-tight sm:text-5xl">Page Not Found</h1>
          <p className="mb-8 text-sm text-gray-400 sm:text-base">
            The page you are looking for does not exist or has moved.
          </p>

          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center gap-2 border border-[#7CFC00] bg-[#7CFC00] px-5 text-xs font-black uppercase tracking-wider text-black transition-colors hover:bg-[#7CFC00]/90"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
