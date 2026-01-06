import { FileText, Calendar, Users, TrendingUp } from "lucide-react"
import Link from "next/link"

export default function AdminDashboard() {
  const stats = [
    {
      label: "Total Articles",
      value: "20",
      icon: FileText,
      color: "text-[#7CFC00]",
      href: "/admin/articles",
    },
    {
      label: "Total Events",
      value: "2",
      icon: Calendar,
      color: "text-blue-500",
      href: "/admin/events",
    },
    {
      label: "Total Artists",
      value: "3",
      icon: Users,
      color: "text-purple-500",
      href: "/admin/artists",
    },
    {
      label: "Published This Month",
      value: "8",
      icon: TrendingUp,
      color: "text-orange-500",
      href: "/admin/articles",
    },
  ]

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-black mb-2">Dashboard</h1>
        <p className="text-gray-400">Welcome back to Dead Party Media Admin</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="bg-[#111111] border border-gray-800 rounded-lg p-6 hover:border-[#7CFC00]/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <Icon className={`w-8 h-8 ${stat.color}`} />
              </div>
              <div className="text-3xl font-bold mb-1">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </Link>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              href="/admin/articles/new"
              className="block px-4 py-3 bg-[#7CFC00] text-black font-medium rounded-lg hover:bg-[#7CFC00]/90 transition-colors text-center"
            >
              Create New Article
            </Link>
            <Link
              href="/admin/events/new"
              className="block px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-center"
            >
              Create New Event
            </Link>
            <Link
              href="/admin/artists/new"
              className="block px-4 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors text-center"
            >
              Add New Artist
            </Link>
          </div>
        </div>

        <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3 text-sm">
              <div className="w-2 h-2 bg-[#7CFC00] rounded-full mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-gray-400">
                  <span className="text-white font-medium">J.L. Jones</span> published a new article
                </p>
                <p className="text-gray-600 text-xs">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-gray-400">
                  New event <span className="text-white font-medium">EDM Night</span> was created
                </p>
                <p className="text-gray-600 text-xs">5 hours ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-gray-400">
                  Artist <span className="text-white font-medium">Billy Jeter</span> profile updated
                </p>
                <p className="text-gray-600 text-xs">1 day ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
