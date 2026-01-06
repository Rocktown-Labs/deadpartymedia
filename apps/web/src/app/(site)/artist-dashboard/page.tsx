"use client"

import { BarChart3, Users, Eye, TrendingUp, Edit } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function ArtistDashboardPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <main className="pt-40 pb-32 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h1 className="text-4xl font-black mb-2">Artist Dashboard</h1>
              <p className="text-gray-400">Welcome back, Artist!</p>
            </div>
            <Link href="/artists/1">
              <Button className="bg-[#7CFC00] hover:bg-[#7CFC00]/90 text-black font-bold">
                <Eye className="w-4 h-4 mr-2" />
                View Public Profile
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-6 mb-12">
            <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <BarChart3 className="w-8 h-8 text-[#7CFC00]" />
              </div>
              <div className="text-3xl font-black mb-1">1.2K</div>
              <div className="text-sm text-gray-400">Profile Views</div>
            </div>

            <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <Users className="w-8 h-8 text-[#9400D3]" />
              </div>
              <div className="text-3xl font-black mb-1">342</div>
              <div className="text-sm text-gray-400">Followers</div>
            </div>

            <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <TrendingUp className="w-8 h-8 text-[#7CFC00]" />
              </div>
              <div className="text-3xl font-black mb-1">3</div>
              <div className="text-sm text-gray-400">Articles</div>
            </div>

            <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <Eye className="w-8 h-8 text-[#9400D3]" />
              </div>
              <div className="text-3xl font-black mb-1">89%</div>
              <div className="text-sm text-gray-400">Profile Complete</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-[#111111] border border-gray-800 rounded-lg p-8">
            <h2 className="text-2xl font-black mb-6">Quick Actions</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <button className="flex items-center gap-4 p-4 bg-[#0A0A0A] border border-gray-800 rounded-lg hover:border-[#7CFC00] transition-colors text-left">
                <Edit className="w-6 h-6 text-[#7CFC00]" />
                <div>
                  <h3 className="font-bold">Edit Profile</h3>
                  <p className="text-sm text-gray-400">Update your artist information</p>
                </div>
              </button>

              <button className="flex items-center gap-4 p-4 bg-[#0A0A0A] border border-gray-800 rounded-lg hover:border-[#7CFC00] transition-colors text-left">
                <Users className="w-6 h-6 text-[#9400D3]" />
                <div>
                  <h3 className="font-bold">Engage Fans</h3>
                  <p className="text-sm text-gray-400">Connect with your audience</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
