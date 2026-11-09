"use client";

import { useMemo, useRef, useState } from "react";
import NextImage from "next/image";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useArtists } from "@/lib/api/artists";
import { useVenues } from "@/lib/api/venues";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, X } from "lucide-react";
import type { Route } from "next";
import { toast } from "sonner";
import { validateImageFile } from "@/lib/upload";
import { getErrorMessage, isNextRedirectError } from "@/lib/utils/error";
import { useUnsavedChangesGuard } from "./use-unsaved-changes-guard";

interface EventFormProps {
  initialData?: {
    title?: string;
    slug?: string;
    description?: string;
    image?: string;
    venue?: string;
    venueId?: number | null;
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
  allowImageUrl?: boolean;
  isSubmitting?: boolean;
}

const genres = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"] as const;

export function EventForm({
  initialData,
  onSubmit,
  cancelHref,
  allowImageUrl = true,
  isSubmitting = false,
}: EventFormProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [image, setImage] = useState(initialData?.image || "");
  const [venue, setVenue] = useState(initialData?.venue || "");
  const [venueId, setVenueId] = useState<number | null>(initialData?.venueId ?? null);
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
    initialData?.artistIds || [],
  );
  const [artistPopoverOpen, setArtistPopoverOpen] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [useImageUrl, setUseImageUrl] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const initialSnapshot = useMemo(
    () =>
      JSON.stringify({
        artistIds: [...(initialData?.artistIds || [])].toSorted((a, b) => a - b),
        date: initialData?.date || "",
        description: initialData?.description || "",
        genre: initialData?.genre || "",
        image: initialData?.image || "",
        location: initialData?.location || "",
        price: initialData?.price || "",
        slug: initialData?.slug || "",
        status: initialData?.status || "draft",
        ticketLink: initialData?.ticketLink || "",
        time: initialData?.time || "",
        title: initialData?.title || "",
        venue: initialData?.venue || "",
        venueId: initialData?.venueId ?? null,
      }),
    [initialData],
  );
  const currentSnapshot = JSON.stringify({
    artistIds: [...selectedArtistIds].toSorted((a, b) => a - b),
    date,
    description,
    genre,
    image,
    location,
    price,
    slug,
    status,
    ticketLink,
    time,
    title,
    venue,
    venueId,
  });
  const { UnsavedChangesDialog, navigateAway } = useUnsavedChangesGuard(
    currentSnapshot !== initialSnapshot,
    cancelHref,
  );

  const { data: artists = [], isLoading: artistsLoading } = useArtists();
  const { data: venuesList = [] } = useVenues();

  const handleArtistToggle = (artistId: number) => {
    setSelectedArtistIds((prev) =>
      prev.includes(artistId) ? prev.filter((id) => id !== artistId) : [...prev, artistId],
    );
  };

  const handleRemoveArtist = (artistId: number) => {
    setSelectedArtistIds((prev) => prev.filter((id) => id !== artistId));
  };

  const handleEventImageUpload = async (file: File | null) => {
    if (!file) {
      return;
    }

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid image file");
      return;
    }

    setImageUploading(true);
    const loadingId = toast.loading("Uploading event image...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload/image?type=event", {
        body: formData,
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(error.error || "Failed to upload image");
      }

      const { url } = await response.json();
      setImage(url);
      setUseImageUrl(false);
      toast.success("Event image uploaded successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload event image");
    } finally {
      toast.dismiss(loadingId);
      setImageUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData();
    formData.append("title", title);
    formData.append("slug", slug || title.toLowerCase().replaceAll(/\s+/g, "-"));
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
    if (venueId) {
      formData.append("venueId", String(venueId));
    }
    // Append artist IDs as comma-separated string (optional for events)
    if (selectedArtistIds.length > 0) {
      formData.append("artistIds", selectedArtistIds.join(","));
    }
    try {
      await onSubmit(formData);
    } catch (error) {
      if (isNextRedirectError(error)) {
        return;
      }
      toast.error(getErrorMessage(error, "Failed to save event"));
    } finally {
      setIsSaving(false);
    }
  };

  const selectedArtists = artists.filter((artist) => selectedArtistIds.includes(artist.id));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {UnsavedChangesDialog}
      <div className="flex items-center justify-between gap-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigateAway(cancelHref)}
          className="gap-2 px-0 text-[#7CFC00] hover:bg-transparent hover:text-[#7CFC00]/80"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Events
        </Button>
      </div>

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
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="image">Event Image</Label>
          {allowImageUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setUseImageUrl(!useImageUrl)}
              className="text-xs"
            >
              {useImageUrl ? "Upload File" : "Use URL"}
            </Button>
          )}
        </div>

        {allowImageUrl && useImageUrl ? (
          <Input
            id="image"
            type="url"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            className="mt-1"
            placeholder="https://example.com/event-image.jpg"
          />
        ) : (
          <div className="space-y-2">
            <input
              id="image"
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
              aria-label="Event Image"
              data-testid="event-image-input"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleEventImageUpload(file);
                }
              }}
              className="hidden"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => imageInputRef.current?.click()}
                disabled={imageUploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {imageUploading ? "Uploading..." : "Upload Image"}
              </Button>
              {image && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setImage("")}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            {image && (
              <div className="relative w-full h-48 border border-gray-800 rounded-lg overflow-hidden bg-[#0A0A0A]">
                <NextImage src={image} alt="Event image preview" fill className="object-cover" />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4 p-4 rounded-lg bg-zinc-900/40 border border-zinc-800">
        <div>
          <Label htmlFor="venue-select">Select Saved Venue (Auto-fills name and address)</Label>
          <Select
            value={venueId ? String(venueId) : "custom"}
            onValueChange={(val) => {
              if (val === "custom") {
                setVenueId(null);
              } else {
                const selected = venuesList.find((v) => String(v.id) === val);
                if (selected) {
                  setVenueId(selected.id);
                  setVenue(selected.name);
                  const fullAddr = [
                    selected.address,
                    selected.city,
                    `${selected.state} ${selected.zip || ""}`.trim(),
                  ]
                    .filter(Boolean)
                    .join(", ");
                  setLocation(fullAddr);
                }
              }
            }}
          >
            <SelectTrigger id="venue-select" className="mt-1 bg-zinc-900">
              <SelectValue placeholder="Choose a venue or enter custom below" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="custom">Custom Venue (Type below)</SelectItem>
              {venuesList.map((v) => (
                <SelectItem key={v.id} value={String(v.id)}>
                  {v.name} ({v.city}, {v.state})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="venue">Venue Name</Label>
            <Input
              id="venue"
              value={venue}
              onChange={(e) => {
                setVenue(e.target.value);
                setVenueId(null);
              }}
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="location">Location / Address</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              placeholder="e.g. 923 W 7th St, Little Rock, AR"
              className="mt-1"
            />
          </div>
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
                  <div className="p-4 text-center text-sm text-gray-400">No artists available</div>
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
                <Badge key={artist.id} variant="secondary" className="flex items-center gap-1">
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
        <Button type="submit" disabled={isSubmitting || isSaving || imageUploading}>
          {imageUploading
            ? "Uploading image..."
            : isSubmitting || isSaving
              ? "Saving..."
              : "Save Event"}
        </Button>
        <Button type="button" variant="outline" onClick={() => navigateAway(cancelHref)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
