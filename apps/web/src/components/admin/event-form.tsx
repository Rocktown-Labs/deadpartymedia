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
  };
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const genres = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"] as const;

export function EventForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: EventFormProps) {
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
    onSubmit(formData);
  };

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

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Event"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
