import { Link, useLocation } from "@tanstack/react-router";

import { AuthForm } from "@/components/auth";
import { ArrowLeft } from "lucide-react";

export default function SignUpPage() {
  const searchParams = useLocation({
    select: (location) => new URLSearchParams(location.searchStr),
  });
  const role = searchParams.get("role");
  const artistId = searchParams.get("artistId");

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center px-6 py-20 pt-[calc(var(--navbar-offset)+1.5rem)] pb-28 lg:pb-20">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center text-[#7CFC00] hover:text-[#7CFC00]/80 mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <div className="text-center mb-8">
          <img
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
          <AuthForm mode="sign-up" />
        </div>
      </div>
    </div>
  );
}
