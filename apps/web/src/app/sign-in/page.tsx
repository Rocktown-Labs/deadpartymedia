"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ArrowLeft, Mail, Lock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLogin } from "@/lib/api/auth"
import { getDashboardRoute } from "@/lib/utils/dashboard"
import { toast } from "sonner"

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const login = useLogin()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null) // Clear previous errors
    try {
      const user = await login.mutateAsync({ email, password })
      toast.success("Signed in successfully!")
      // Redirect to appropriate dashboard based on role
      const dashboardRoute = getDashboardRoute(user.role)
      router.push(dashboardRoute)
    } catch (error: any) {
      console.error("Error signing in:", error)
      setError(error.message || "Failed to sign in. Please check your credentials.")
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center text-[#7CFC00] hover:text-[#7CFC00]/80 mb-8">
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-500 text-sm flex-1">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold mb-2 uppercase tracking-wider">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError(null) // Clear error when user types
                }}
                className={`w-full pl-11 pr-4 py-3 bg-[#111111] border rounded-lg text-white placeholder-gray-500 focus:outline-none ${
                  error 
                    ? "border-red-500 focus:border-red-500" 
                    : "border-gray-800 focus:border-[#7CFC00]"
                }`}
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError(null) // Clear error when user types
                }}
                className={`w-full pl-11 pr-4 py-3 bg-[#111111] border rounded-lg text-white placeholder-gray-500 focus:outline-none ${
                  error 
                    ? "border-red-500 focus:border-red-500" 
                    : "border-gray-800 focus:border-[#7CFC00]"
                }`}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center">
              <input type="checkbox" className="mr-2 accent-[#7CFC00]" />
              <span className="text-gray-400">Remember me</span>
            </label>
            <a href="#" className="text-[#7CFC00] hover:text-[#7CFC00]/80">
              Forgot password?
            </a>
          </div>

          <Button
            type="submit"
            disabled={login.isPending}
            className="w-full bg-[#7CFC00] hover:bg-[#7CFC00]/90 text-black font-bold tracking-wider uppercase py-6"
          >
            {login.isPending ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-400">
            Don't have an account?{" "}
            <Link href="/sign-up" className="text-[#7CFC00] hover:text-[#7CFC00]/80 font-bold">
              Sign up for free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
