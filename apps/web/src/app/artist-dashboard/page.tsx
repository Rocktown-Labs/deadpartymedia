import { useMusicSession } from "@/lib/auth-client";

import { Link } from "@tanstack/react-router";
import { BarChart3, Calendar, Disc, Edit, Eye, FileText, TrendingUp, Users } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ArtistDashboardPage() {
  const { session: user } = useMusicSession();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <main className="pt-40 pb-20">
        <div className="container mx-auto px-6">
          <div className="mb-8">
            <h1 className="text-4xl font-black mb-2">Artist Dashboard</h1>
            <p className="text-gray-400">
              Welcome back{user?.name.split(" ")[0] ? `, ${user.name.split(" ")[0]}` : ""}!
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
            <Link to={"/artist-dashboard/releases"}>
              <Button className="w-full h-auto p-6 flex flex-col items-start gap-3 bg-[#111111] border border-gray-800 hover:border-[#7CFC00] text-white">
                <Disc className="w-6 h-6 text-[#7CFC00]" />
                <div className="text-left">
                  <h3 className="font-bold text-base">My Releases</h3>
                  <p className="text-sm text-gray-400">Submit and track music</p>
                </div>
              </Button>
            </Link>

            <Link to="/artist-dashboard/profile">
              <Button className="w-full h-auto p-6 flex flex-col items-start gap-3 bg-[#111111] border border-gray-800 hover:border-[#7CFC00] text-white">
                <Edit className="w-6 h-6 text-[#7CFC00]" />
                <div className="text-left">
                  <h3 className="font-bold text-base">Edit Profile</h3>
                  <p className="text-sm text-gray-400">Update your information</p>
                </div>
              </Button>
            </Link>

            <Link to="/artist-dashboard/articles">
              <Button className="w-full h-auto p-6 flex flex-col items-start gap-3 bg-[#111111] border border-gray-800 hover:border-[#7CFC00] text-white">
                <FileText className="w-6 h-6 text-[#7CFC00]" />
                <div className="text-left">
                  <h3 className="font-bold text-base">My Articles</h3>
                  <p className="text-sm text-gray-400">View featured articles</p>
                </div>
              </Button>
            </Link>

            <Link to="/artist-dashboard/events">
              <Button className="w-full h-auto p-6 flex flex-col items-start gap-3 bg-[#111111] border border-gray-800 hover:border-[#7CFC00] text-white">
                <Calendar className="w-6 h-6 text-[#7CFC00]" />
                <div className="text-left">
                  <h3 className="font-bold text-base">My Events</h3>
                  <p className="text-sm text-gray-400">Manage events</p>
                </div>
              </Button>
            </Link>

            <Link to="/artists/$slug" params={{ slug: user?.artistSlug || "" }}>
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
