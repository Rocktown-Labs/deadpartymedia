"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Search, Edit, Trash2, Eye, MoreVertical, MapPin, Clock } from "lucide-react"
import events from "@/data/events.json"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

export default function EventsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState("ALL")

  const categories = ["ALL", "COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"]

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.venue.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = filterCategory === "ALL" || event.category === filterCategory
    return matchesSearch && matchesCategory
  })

  const handleDelete = (id: number) => {
    console.log("[v0] Delete event:", id)
    alert(`Delete event ${id}`)
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      COUNTRY: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      EDM: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      "HARDCORE & ROCK": "bg-red-500/10 text-red-500 border-red-500/20",
      "HIP-HOP & R&B": "bg-blue-500/10 text-blue-500 border-blue-500/20",
      OTHER: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    }
    return colors[category] || colors.OTHER
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black mb-2">Events</h1>
          <p className="text-gray-400">{filteredEvents.length} total events</p>
        </div>
        <Link href="/admin/events/new">
          <Button className="bg-blue-600 text-white hover:bg-blue-700 font-medium">
            <Plus className="w-4 h-4 mr-2" />
            New Event
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-[#111111] border border-gray-800 rounded-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-600"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setFilterCategory(category)}
                className={`px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                  filterCategory === category
                    ? "bg-blue-600 text-white"
                    : "bg-[#0A0A0A] border border-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map((event) => (
          <div key={event.id} className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden group">
            <div className="aspect-video relative">
              <img src={event.image || "/placeholder.svg"} alt={event.title} className="w-full h-full object-cover" />
              <div className="absolute top-3 right-3">
                <Badge variant="outline" className={getCategoryColor(event.category)}>
                  {event.category}
                </Badge>
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-bold text-lg mb-2 line-clamp-2">{event.title}</h3>

              <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span>
                    {event.date} at {event.time}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span>
                    {event.venue}, {event.location}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                  {event.status}
                </Badge>
                <div className="flex gap-1">
                  <Link href={`/events#${event.id}`} target="_blank">
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#111111] border-gray-800">
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/events/${event.id}/edit`} className="flex items-center cursor-pointer">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(event.id)}
                        className="text-red-500 focus:text-red-500 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredEvents.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">No events found matching your filters.</p>
        </div>
      )}
    </div>
  )
}
