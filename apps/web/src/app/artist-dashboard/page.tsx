"use client";

import { BarChart3, Users, Eye, TrendingUp, Edit, FileText, Calendar } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/lib/api/auth";

export default function ArtistDashboardPage() {
  const { data: user } = useCurrentUser();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <main className="pt-40 pb-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-8">
            <h1 className="text-4xl font-black mb-2">Artist Dashboard</h1>
            <p className="text-gray-400">
              Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!
            </p>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
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

          {/* Action Buttons */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Link href="/artist-dashboard/profile">
              <Button className="w-full h-auto p-6 flex flex-col items-start gap-3 bg-[#111111] border border-gray-800 hover:border-[#7CFC00] text-white">
                <Edit className="w-6 h-6 text-[#7CFC00]" />
                <div className="text-left">
                  <h3 className="font-bold text-base">Edit Profile</h3>
                  <p className="text-sm text-gray-400">Update your information</p>
                </div>
              </Button>
            </Link>

            <Link href="/artist-dashboard/articles">
              <Button className="w-full h-auto p-6 flex flex-col items-start gap-3 bg-[#111111] border border-gray-800 hover:border-[#7CFC00] text-white">
                <FileText className="w-6 h-6 text-[#7CFC00]" />
                <div className="text-left">
                  <h3 className="font-bold text-base">My Articles</h3>
                  <p className="text-sm text-gray-400">View featured articles</p>
                </div>
              </Button>
            </Link>

            <Link href="/artist-dashboard/events">
              <Button className="w-full h-auto p-6 flex flex-col items-start gap-3 bg-[#111111] border border-gray-800 hover:border-[#7CFC00] text-white">
                <Calendar className="w-6 h-6 text-[#7CFC00]" />
                <div className="text-left">
                  <h3 className="font-bold text-base">My Events</h3>
                  <p className="text-sm text-gray-400">Manage events</p>
                </div>
              </Button>
            </Link>

            <Link href="/artists/1">
              <Button className="w-full h-auto p-6 flex flex-col items-start gap-3 bg-[#111111] border border-gray-800 hover:border-[#7CFC00] text-white">
                <Eye className="w-6 h-6 text-[#7CFC00]" />
                <div className="text-left">
                  <h3 className="font-bold text-base">View Profile</h3>
                  <p className="text-sm text-gray-400">See public profile</p>
                </div>
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
