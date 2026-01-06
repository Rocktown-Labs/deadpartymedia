"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Search, Edit, Trash2, Eye, MoreVertical, Mail, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useArtists } from "@/lib/convex-hooks"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

export default function ArtistsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterGenre, setFilterGenre] = useState<"ALL" | "Country" | "EDM" | "Hardcore & Rock" | "Hip-Hop & R&B" | "Other">("ALL")
  
  const artists = useArtists(filterGenre !== "ALL" ? filterGenre : undefined)
  const genres = ["ALL", "Country", "EDM", "Hardcore & Rock", "Hip-Hop & R&B", "Other"]

  const filteredArtists = (artists || []).filter((artist) => {
    const matchesSearch =
      artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artist.location.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const handleDelete = (id: string) => {
    console.log("Delete artist:", id)
    // TODO: Add delete mutation
    alert(`Delete artist ${id}`)
  }

  const handleInvite = (id: string) => {
    console.log("Resend invite to artist:", id)
    // TODO: Add invite mutation
    alert(`Invitation sent to artist ${id}`)
  }

  const getStatusColor = (claimed: boolean) => {
    return claimed
      ? "bg-green-500/10 text-green-500 border-green-500/20"
      : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black mb-2">Artists</h1>
          <p className="text-gray-400">{filteredArtists.length} total artists</p>
        </div>
        <Link href="/admin/artists/new">
          <Button className="bg-purple-600 text-white hover:bg-purple-700 font-medium">
            <Plus className="w-4 h-4 mr-2" />
            Add Artist
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-[#111111] border border-gray-800 rounded-lg p-4 mb-6">
        <div className="flex flex-col gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search artists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-600"
            />
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex gap-2 overflow-x-auto">
              {genres.map((genre) => (
                <button
                  key={genre}
                  onClick={() => setFilterGenre(genre)}
                  className={`px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                    filterGenre === genre
                      ? "bg-purple-600 text-white"
                      : "bg-[#0A0A0A] border border-gray-800 text-gray-400 hover:text-white"
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {statuses.map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition-colors capitalize ${
                    filterStatus === status
                      ? "bg-purple-600 text-white"
                      : "bg-[#0A0A0A] border border-gray-800 text-gray-400 hover:text-white"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Artists Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {filteredArtists.map((artist) => (
          <div key={artist.id} className="bg-[#111111] border border-gray-800 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold mb-1">{artist.name}</h3>
                <p className="text-sm text-gray-400">{artist.location}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#111111] border-gray-800">
                  <DropdownMenuItem asChild>
                    <Link href={`/artists/${artist.id}`} target="_blank" className="flex items-center cursor-pointer">
                      <Eye className="w-4 h-4 mr-2" />
                      View Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/admin/artists/${artist.id}/edit`} className="flex items-center cursor-pointer">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Link>
                  </DropdownMenuItem>
                  {artist.status === "invited" && (
                    <DropdownMenuItem onClick={() => handleInvite(artist.id)} className="cursor-pointer">
                      <Mail className="w-4 h-4 mr-2" />
                      Resend Invite
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => handleDelete(artist.id)}
                    className="text-red-500 focus:text-red-500 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                {artist.genre}
              </Badge>
              <Badge variant="outline" className={getStatusColor(artist.status)}>
                {artist.status}
              </Badge>
            </div>

            <p className="text-sm text-gray-300 mb-4 line-clamp-2">{artist.bio}</p>

            <div className="grid grid-cols-2 gap-4 py-4 border-t border-gray-800 text-sm">
              <div>
                <p className="text-gray-400 mb-1">Articles</p>
                <p className="font-bold text-lg">{artist.articleCount}</p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Contact</p>
                <div className="flex gap-2">
                  {artist.email && (
                    <a href={`mailto:${artist.email}`} className="text-gray-300 hover:text-purple-500">
                      <Mail className="w-4 h-4" />
                    </a>
                  )}
                  {artist.phone && (
                    <a href={`tel:${artist.phone}`} className="text-gray-300 hover:text-purple-500">
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredArtists.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">No artists found matching your filters.</p>
        </div>
      )}
    </div>
  )
}
