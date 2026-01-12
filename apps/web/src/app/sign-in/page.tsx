"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center px-6 py-20 pt-28 lg:pt-20 pb-28 lg:pb-20">
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
          <h1 className="text-4xl font-black mb-2">Welcome Back</h1>
          <p className="text-gray-400">Sign in to your Dead Party Media account</p>
        </div>

        <div className="flex justify-center">
          <SignIn
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "bg-[#111111] border border-gray-800",
                headerTitle: "text-white",
                headerSubtitle: "text-gray-400",
                socialButtonsBlockButton:
                  "bg-[#0A0A0A] border-gray-800 text-white hover:bg-[#1A1A1A]",
                formButtonPrimary: "bg-[#7CFC00] hover:bg-[#7CFC00]/90 text-black",
                formFieldInput: "bg-[#0A0A0A] border-gray-800 text-white",
                formFieldLabel: "text-gray-300",
                footerActionLink: "text-[#7CFC00]",
                identityPreviewText: "text-gray-300",
                identityPreviewEditButton: "text-[#7CFC00]",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
