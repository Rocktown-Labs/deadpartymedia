"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, Eye, Plus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { ArticleEditor } from "@/components/admin/article-editor"
import type { JSONContent } from "novel"
import writers from "@/data/writers.json"
import artists from "@/data/artists.json"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export default function NewArticlePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [content, setContent] = useState<JSONContent | null>(null)
  const [showNewArtistDialog, setShowNewArtistDialog] = useState(false)
  const [newArtistName, setNewArtistName] = useState("")

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    category: "COUNTRY",
    excerpt: "",
    authorId: "",
    image: "",
    artistId: "",
    status: "draft" as "draft" | "published",
  })

  const categories = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"]

  const handleSubmit = async (e: React.FormEvent, status: "draft" | "published") => {
    e.preventDefault()
    setIsLoading(true)

    await new Promise((resolve) => setTimeout(resolve, 1000))

    console.log("[v0] Creating article:", { ...formData, content, status })
    toast.success(status === "draft" ? "Article saved as draft" : "Article published successfully")

    setIsLoading(false)
    router.push("/admin/articles")
  }

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  }

  const handleCreateNewArtist = () => {
    console.log("[v0] Creating new artist on the fly:", newArtistName)
    toast.success(`Artist "${newArtistName}" created. You can now link them to this article.`)
    setNewArtistName("")
    setShowNewArtistDialog(false)
  }

  const selectedAuthor = writers.find((w) => w.id.toString() === formData.authorId)
  const selectedArtist = artists.find((a) => a.id.toString() === formData.artistId)

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/articles"
          className="inline-flex items-center text-gray-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Articles
        </Link>
        <h1 className="text-4xl font-black">Create New Article</h1>
      </div>

      <form onSubmit={(e) => handleSubmit(e, "published")} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-[#111111] border border-gray-800 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-bold mb-4">Basic Information</h2>

          <div>
            <Label htmlFor="title">Title *</Label>
            <input
              id="title"
              type="text"
              required
              value={formData.title}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  title: e.target.value,
                  slug: generateSlug(e.target.value),
                })
              }}
              className="w-full mt-1.5 px-4 py-2.5 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
              placeholder="Enter article title"
            />
          </div>

          <div>
            <Label htmlFor="slug">Slug *</Label>
            <input
              id="slug"
              type="text"
              required
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="w-full mt-1.5 px-4 py-2.5 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
              placeholder="article-url-slug"
            />
            <p className="text-xs text-gray-500 mt-1">Auto-generated from title</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category *</Label>
              <select
                id="category"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full mt-1.5 px-4 py-2.5 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-[#7CFC00]"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="authorId">Author *</Label>
              <select
                id="authorId"
                required
                value={formData.authorId}
                onChange={(e) => setFormData({ ...formData, authorId: e.target.value })}
                className="w-full mt-1.5 px-4 py-2.5 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-[#7CFC00]"
              >
                <option value="">Select an author</option>
                {writers.map((writer) => (
                  <option key={writer.id} value={writer.id}>
                    {writer.name} ({writer.category})
                  </option>
                ))}
              </select>
              {selectedAuthor && <p className="text-xs text-gray-500 mt-1">Writing for: {selectedAuthor.category}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="excerpt">Excerpt *</Label>
            <textarea
              id="excerpt"
              required
              rows={3}
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              className="w-full mt-1.5 px-4 py-2.5 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00] resize-none"
              placeholder="Brief description of the article"
            />
          </div>

          <div>
            <Label htmlFor="image">Featured Image URL *</Label>
            <input
              id="image"
              type="url"
              required
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              className="w-full mt-1.5 px-4 py-2.5 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label htmlFor="artistId">Featured Artist (Optional)</Label>
              <Dialog open={showNewArtistDialog} onOpenChange={setShowNewArtistDialog}>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-[#7CFC00] hover:text-[#7CFC00]/80 h-auto p-0"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Create New Artist
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#111111] border-gray-800 text-white">
                  <DialogHeader>
                    <DialogTitle>Create New Artist</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label htmlFor="newArtistName">Artist Name</Label>
                      <input
                        id="newArtistName"
                        type="text"
                        value={newArtistName}
                        onChange={(e) => setNewArtistName(e.target.value)}
                        className="w-full mt-1.5 px-4 py-2.5 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-600"
                        placeholder="Enter artist name"
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowNewArtistDialog(false)}
                        className="border-gray-800"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={handleCreateNewArtist}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        Create Artist
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <select
              id="artistId"
              value={formData.artistId}
              onChange={(e) => setFormData({ ...formData, artistId: e.target.value })}
              className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-[#7CFC00]"
            >
              <option value="">None - This is a general article</option>
              {artists.map((artist) => (
                <option key={artist.id} value={artist.id}>
                  {artist.name} - {artist.genre} ({artist.location})
                </option>
              ))}
            </select>
            {selectedArtist && (
              <div className="mt-2 p-3 bg-[#0A0A0A] border border-purple-500/20 rounded-lg">
                <p className="text-sm text-purple-400">
                  This article will appear on {selectedArtist.name}'s artist profile
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Article Content</h2>
          <ArticleEditor initialContent={content || undefined} onChange={setContent} />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={(e) => handleSubmit(e as any, "draft")}
            disabled={isLoading}
            className="border-gray-800 text-gray-400 hover:text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            Save as Draft
          </Button>
          <div className="flex gap-3">
            <Link href="/admin/articles">
              <Button
                type="button"
                variant="outline"
                className="border-gray-800 text-gray-400 hover:text-white bg-transparent"
              >
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-[#7CFC00] text-black hover:bg-[#7CFC00]/90 font-medium"
            >
              <Eye className="w-4 h-4 mr-2" />
              Publish Article
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
