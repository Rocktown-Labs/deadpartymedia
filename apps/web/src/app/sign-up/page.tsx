"use client";

import type React from "react";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Lock, UserIcon, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRegister } from "@/lib/api/auth";
import { toast } from "sonner";

export default function SignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    userType: "fan" as "fan" | "artist",
  });
  const [error, setError] = useState<string | null>(null);
  const register = useRegister();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Clear previous errors

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      await register.mutateAsync({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        userType: formData.userType,
      });
      toast.success("Account created successfully!");

      // Redirect based on user type
      if (formData.userType === "artist") {
        router.push("/onboarding");
      } else {
        router.push("/");
      }
    } catch (error: any) {
      console.error("Error signing up:", error);
      setError(error.message || "Failed to create account. Please try again.");
    }
  };

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
          <h1 className="text-4xl font-black mb-2">Join the Scene</h1>
          <p className="text-gray-400">Create your Dead Party Media account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-500 text-sm flex-1">{error}</p>
            </div>
          )}

          {/* User Type Selection */}
          <div>
            <label className="block text-sm font-bold mb-3 uppercase tracking-wider">
              I am a...
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, userType: "fan" })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.userType === "fan"
                    ? "border-[#7CFC00] bg-[#7CFC00]/10"
                    : "border-gray-800 hover:border-gray-700"
                }`}
              >
                <div className="text-2xl mb-2">🎵</div>
                <div className="font-bold">Music Fan</div>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, userType: "artist" })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.userType === "artist"
                    ? "border-[#7CFC00] bg-[#7CFC00]/10"
                    : "border-gray-800 hover:border-gray-700"
                }`}
              >
                <div className="text-2xl mb-2">🎸</div>
                <div className="font-bold">Artist</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
              Full Name
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full pl-11 pr-4 py-3 bg-[#111111] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
                placeholder="John Doe"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 uppercase tracking-wider">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  setError(null); // Clear error when user types
                }}
                className={`w-full pl-11 pr-4 py-3 bg-[#111111] border rounded-lg text-white placeholder-gray-500 focus:outline-none ${
                  error && error.toLowerCase().includes("email")
                    ? "border-red-500 focus:border-red-500"
                    : "border-gray-800 focus:border-[#7CFC00]"
                }`}
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-11 pr-4 py-3 bg-[#111111] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full pl-11 pr-4 py-3 bg-[#111111] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={register.isPending}
            className="w-full bg-[#7CFC00] hover:bg-[#7CFC00]/90 text-black font-bold tracking-wider uppercase py-6"
          >
            {register.isPending ? "Creating Account..." : "Get Started"}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-400">
            Already have an account?{" "}
            <Link href="/sign-in" className="text-[#7CFC00] hover:text-[#7CFC00]/80 font-bold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
