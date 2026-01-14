"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useArtists } from "@/lib/api/artists";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { toast } from "sonner";

interface EventFormProps {
  initialData?: {
    title?: string;
    slug?: string;
    description?: string;
    image?: string;
    venue?: string;
    location?: string;
    date?: string;
    time?: string;
    ticketLink?: string;
    price?: string;
    genre?: string;
    status?: "draft" | "published" | "past";
    artistIds?: number[];
  };
  onSubmit: (formData: FormData) => void | Promise<unknown>;
  cancelHref: Route;
  isSubmitting?: boolean;
}

const genres = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"] as const;

export function EventForm({
  initialData,
  onSubmit,
  cancelHref,
  isSubmitting = false,
}: EventFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialData?.title || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [image, setImage] = useState(initialData?.image || "");
  const [venue, setVenue] = useState(initialData?.venue || "");
  const [location, setLocation] = useState(initialData?.location || "");
  const [date, setDate] = useState(initialData?.date || "");
  const [time, setTime] = useState(initialData?.time || "");
  const [ticketLink, setTicketLink] = useState(initialData?.ticketLink || "");
  const [price, setPrice] = useState(initialData?.price || "");
  const [genre, setGenre] = useState(initialData?.genre || "");
  const [status, setStatus] = useState<"draft" | "published" | "past">(
    initialData?.status || "draft",
  );
  const [selectedArtistIds, setSelectedArtistIds] = useState<number[]>(
    initialData?.artistIds || []
  );
  const [artistPopoverOpen, setArtistPopoverOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { data: artists = [], isLoading: artistsLoading } = useArtists();

  const handleArtistToggle = (artistId: number) => {
    setSelectedArtistIds((prev) =>
      prev.includes(artistId)
        ? prev.filter((id) => id !== artistId)
        : [...prev, artistId]
    );
  };

  const handleRemoveArtist = (artistId: number) => {
    setSelectedArtistIds((prev) => prev.filter((id) => id !== artistId));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData();
    formData.append("title", title);
    formData.append("slug", slug || title.toLowerCase().replace(/\s+/g, "-"));
    formData.append("description", description);
    formData.append("image", image);
    formData.append("venue", venue);
    formData.append("location", location);
    formData.append("date", date);
    formData.append("time", time);
    formData.append("ticketLink", ticketLink);
    formData.append("price", price);
    formData.append("genre", genre);
    formData.append("status", status);
    // Append artist IDs as comma-separated string (optional for events)
    if (selectedArtistIds.length > 0) {
      formData.append("artistIds", selectedArtistIds.join(","));
    }
    try {
      await onSubmit(formData);
    } catch (error) {
      const digest = (error as any)?.digest as string | undefined;
      if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) {
        return;
      }
      toast.error(error instanceof Error ? error.message : "Failed to save event");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedArtists = artists.filter((artist) =>
    selectedArtistIds.includes(artist.id)
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="Auto-generated from title"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className="mt-1"
          rows={4}
        />
      </div>

      <div>
        <Label htmlFor="image">Image URL</Label>
        <Input
          id="image"
          type="url"
          value={image}
          onChange={(e) => setImage(e.target.value)}
          className="mt-1"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="venue">Venue</Label>
          <Input
            id="venue"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            required
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
            className="mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="time">Time</Label>
          <Input
            id="time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="ticketLink">Ticket Link</Label>
          <Input
            id="ticketLink"
            type="url"
            value={ticketLink}
            onChange={(e) => setTicketLink(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="price">Price</Label>
          <Input
            id="price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g., $20, Free"
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="genre">Genre</Label>
        <Select value={genre} onValueChange={setGenre} required>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select genre" />
          </SelectTrigger>
          <SelectContent>
            {genres.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="status">Status</Label>
        <Select
          value={status}
          onValueChange={(value: "draft" | "published" | "past") => setStatus(value)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="past">Past</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Performing Artists (Optional)</Label>
        <div className="mt-1 space-y-2">
          <Popover open={artistPopoverOpen} onOpenChange={setArtistPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                disabled={artistsLoading}
              >
                {artistsLoading
                  ? "Loading artists..."
                  : selectedArtists.length > 0
                    ? `${selectedArtists.length} artist(s) selected`
                    : "Select artists"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <div className="max-h-[300px] overflow-y-auto p-2">
                {artists.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-400">
                    No artists available
                  </div>
                ) : (
                  <div className="space-y-2">
                    {artists.map((artist) => (
                      <div
                        key={artist.id}
                        className="flex items-center space-x-2 p-2 hover:bg-gray-800 rounded"
                      >
                        <Checkbox
                          id={`event-artist-${artist.id}`}
                          checked={selectedArtistIds.includes(artist.id)}
                          onCheckedChange={() => handleArtistToggle(artist.id)}
                        />
                        <Label
                          htmlFor={`event-artist-${artist.id}`}
                          className="flex-1 cursor-pointer text-sm"
                        >
                          {artist.name} ({artist.genre})
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
          {selectedArtists.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedArtists.map((artist) => (
                <Badge
                  key={artist.id}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {artist.name}
                  <button
                    type="button"
                    onClick={() => handleRemoveArtist(artist.id)}
                    className="ml-1 hover:text-red-400"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting || isSaving}>
          {isSubmitting || isSaving ? "Saving..." : "Save Event"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(cancelHref)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
