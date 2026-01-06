"use client"

import { User, Settings } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <main className="pt-40 pb-32 px-6">
        <div className="container mx-auto max-w-2xl">
          <h1 className="text-4xl font-black mb-8">My Profile</h1>

          <div className="space-y-4">
            <Link
              href="/sign-in"
              className="flex items-center gap-4 p-6 bg-[#111111] border border-gray-800 rounded-lg hover:border-[#7CFC00] transition-colors"
            >
              <User className="w-6 h-6 text-[#7CFC00]" />
              <div className="flex-1">
                <h3 className="font-bold">Account</h3>
                <p className="text-sm text-gray-400">Manage your account settings</p>
              </div>
            </Link>

            <Link
              href="/sign-in"
              className="flex items-center gap-4 p-6 bg-[#111111] border border-gray-800 rounded-lg hover:border-[#7CFC00] transition-colors"
            >
              <Settings className="w-6 h-6 text-[#7CFC00]" />
              <div className="flex-1">
                <h3 className="font-bold">Settings</h3>
                <p className="text-sm text-gray-400">Customize your experience</p>
              </div>
            </Link>

            <div className="pt-8 border-t border-gray-800">
              <div className="text-center space-y-4">
                <p className="text-gray-400">Not signed in</p>
                <div className="flex gap-4">
                  <Link href="/sign-in" className="flex-1">
                    <Button variant="outline" className="w-full border-gray-700 hover:border-[#7CFC00] bg-transparent">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/sign-up" className="flex-1">
                    <Button className="w-full bg-[#7CFC00] hover:bg-[#7CFC00]/90 text-black">Get Started</Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
