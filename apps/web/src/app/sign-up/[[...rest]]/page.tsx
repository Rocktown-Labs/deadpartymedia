"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role");
  const artistId = searchParams.get("artistId");

  const getRedirectUrl = () => {
    const redirectParam = searchParams.get("redirect_url") || searchParams.get("redirect");
    const suffix = redirectParam ? `&redirect_url=${encodeURIComponent(redirectParam)}` : "";
    if (role === "super_admin" || role === "writer") {
      return "/admin";
    }
    if (role === "artist") {
      return `/onboarding?role=artist${suffix}`;
    }
    if (role === "venue") {
      return `/onboarding?role=venue${suffix}`;
    }
    return redirectParam
      ? `/onboarding?redirect_url=${encodeURIComponent(redirectParam)}`
      : "/onboarding";
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center px-6 py-20 pt-[calc(var(--navbar-offset)+1.5rem)] pb-28 lg:pb-20">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center text-[#7CFC00] hover:text-[#7CFC00]/80 mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <div className="text-center mb-8">
          <Image
            src="/images/dead-party-logo.png"
            alt="Dead Party Media"
            width={80}
            height={80}
            className="mx-auto mb-6"
          />
          <h1 className="text-4xl font-black mb-2">Join the Scene</h1>
          <p className="text-gray-400">Create your Dead Party Media account</p>
          {role === "artist" && artistId && (
            <p className="text-[#7CFC00] text-sm mt-2">You're claiming an artist profile</p>
          )}
          {role === "venue" && (
            <p className="text-[#7CFC00] text-sm mt-2">Registering your venue profile</p>
          )}
        </div>

        <div className="flex justify-center">
          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            forceRedirectUrl={getRedirectUrl()}
            fallbackRedirectUrl={getRedirectUrl()}
            appearance={{
              elements: {
                card: "bg-[#111111] border border-gray-800",
                footerActionLink: "text-[#7CFC00]",
                formButtonPrimary: "bg-[#7CFC00] hover:bg-[#7CFC00]/90 text-black",
                formFieldInput: "bg-[#0A0A0A] border-gray-800 text-white",
                formFieldLabel: "text-gray-300",
                headerSubtitle: "text-gray-400",
                headerTitle: "text-white",
                identityPreviewEditButton: "text-[#7CFC00]",
                identityPreviewText: "text-gray-300",
                rootBox: "mx-auto",
                socialButtonsBlockButton:
                  "bg-[#0A0A0A] border-gray-800 text-white hover:bg-[#1A1A1A]",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
