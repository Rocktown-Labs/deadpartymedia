"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, Eye } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import events from "@/data/events.json"

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const event = events.find((e) => e.id === Number.parseInt(resolvedParams.id))

  const [formData, setFormData] = useState({
    title: event?.title || "",
    date: event?.date || "",
    time: event?.time || "",
    venue: event?.venue || "",
    location: event?.location || "",
    category: event?.category || "COUNTRY",
    description: event?.description || "",
    image: event?.image || "",
    ticketLink: event?.ticketLink || "",
    price: event?.price || "",
    status: event?.status || ("draft" as "draft" | "published"),
  })

  const categories = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"]

  const handleSubmit = async (e: React.FormEvent, status: "draft" | "published") => {
    e.preventDefault()
    setIsLoading(true)

    await new Promise((resolve) => setTimeout(resolve, 1000))

    console.log("[v0] Updating event:", resolvedParams.id, { ...formData, status })
    toast.success("Event updated successfully")

    setIsLoading(false)
    router.push("/admin/events")
  }

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Event not found</h1>
        <Link href="/admin/events">
          <Button>Back to Events</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <Link
          href="/admin/events"
          className="inline-flex items-center text-gray-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Events
        </Link>
        <h1 className="text-4xl font-black">Edit Event</h1>
      </div>

      <form onSubmit={(e) => handleSubmit(e, "published")} className="space-y-6">
        <div className="bg-[#111111] border border-gray-800 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-bold mb-4">Event Details</h2>

          <div>
            <Label htmlFor="title">Event Title *</Label>
            <input
              id="title"
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full mt-1.5 px-4 py-2.5 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date *</Label>
              <input
                id="date"
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full mt-1.5 px-4 py-2.5 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <Label htmlFor="time">Time *</Label>
              <input
                id="time"
                type="time"
                required
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full mt-1.5 px-4 py-2.5 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="venue">Venue *</Label>
              <input
                id="venue"
                type="text"
                required
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                className="w-full mt-1.5 px-4 py-2.5 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <Label htmlFor="location">Location *</Label>
              <input
                id="location"
                type="text"
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full mt-1.5 px-4 py-2.5 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="category">Category *</Label>
            <select
              id="category"
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full mt-1.5 px-4 py-2.5 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-blue-600"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <textarea
              id="description"
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full mt-1.5 px-4 py-2.5 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 resize-none"
            />
          </div>

          <div>
            <Label htmlFor="image">Event Image URL *</Label>
            <input
              id="image"
              type="url"
              required
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              className="w-full mt-1.5 px-4 py-2.5 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ticketLink">Ticket Link</Label>
              <input
                id="ticketLink"
                type="url"
                value={formData.ticketLink}
                onChange={(e) => setFormData({ ...formData, ticketLink: e.target.value })}
                className="w-full mt-1.5 px-4 py-2.5 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <Label htmlFor="price">Price</Label>
              <input
                id="price"
                type="text"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full mt-1.5 px-4 py-2.5 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>
        </div>

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
            <Link href="/admin/events">
              <Button
                type="button"
                variant="outline"
                className="border-gray-800 text-gray-400 hover:text-white bg-transparent"
              >
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isLoading} className="bg-blue-600 text-white hover:bg-blue-700 font-medium">
              <Eye className="w-4 h-4 mr-2" />
              Update Event
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
