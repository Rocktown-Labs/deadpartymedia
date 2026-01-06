"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Search, Edit, Trash2, Eye, MoreVertical } from "lucide-react"
import articles from "@/data/articles.json"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

export default function ArticlesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState("ALL")

  const categories = ["ALL", "COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"]

  const filteredArticles = articles.filter((article) => {
    const matchesSearch =
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.author.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = filterCategory === "ALL" || article.category === filterCategory
    return matchesSearch && matchesCategory
  })

  const handleDelete = (id: number) => {
    console.log("[v0] Delete article:", id)
    // In production, this would call an API
    alert(`Delete article ${id}`)
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
          <h1 className="text-4xl font-black mb-2">Articles</h1>
          <p className="text-gray-400">{filteredArticles.length} total articles</p>
        </div>
        <Link href="/admin/articles/new">
          <Button className="bg-[#7CFC00] text-black hover:bg-[#7CFC00]/90 font-medium">
            <Plus className="w-4 h-4 mr-2" />
            New Article
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
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setFilterCategory(category)}
                className={`px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                  filterCategory === category
                    ? "bg-[#7CFC00] text-black"
                    : "bg-[#0A0A0A] border border-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0A0A0A] border-b border-gray-800">
              <tr>
                <th className="text-left p-4 font-medium text-gray-400 text-sm">Title</th>
                <th className="text-left p-4 font-medium text-gray-400 text-sm">Category</th>
                <th className="text-left p-4 font-medium text-gray-400 text-sm">Author</th>
                <th className="text-left p-4 font-medium text-gray-400 text-sm">Date</th>
                <th className="text-left p-4 font-medium text-gray-400 text-sm">Status</th>
                <th className="text-right p-4 font-medium text-gray-400 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredArticles.map((article) => (
                <tr key={article.id} className="hover:bg-[#0A0A0A] transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={article.image || "/placeholder.svg"}
                        alt={article.title}
                        className="w-12 h-12 rounded object-cover"
                      />
                      <div className="min-w-0">
                        <div className="font-medium text-white truncate">{article.title}</div>
                        <div className="text-sm text-gray-400 truncate">{article.excerpt}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant="outline" className={getCategoryColor(article.category)}>
                      {article.category}
                    </Badge>
                  </td>
                  <td className="p-4 text-gray-300">{article.author}</td>
                  <td className="p-4 text-gray-400 text-sm">{article.date}</td>
                  <td className="p-4">
                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                      Published
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/article/${article.slug}`} target="_blank">
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
                            <Link
                              href={`/admin/articles/${article.id}/edit`}
                              className="flex items-center cursor-pointer"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(article.id)}
                            className="text-red-500 focus:text-red-500 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {filteredArticles.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">No articles found matching your filters.</p>
        </div>
      )}
    </div>
  )
}
