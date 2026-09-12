"use client";

import { useMemo, useRef, useState } from "react";
import NextImage from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Upload, X } from "lucide-react";
import type { Route } from "next";
import { toast } from "sonner";
import { validateImageFile } from "@/lib/upload";
import { getErrorMessage, isNextRedirectError } from "@/lib/utils/error";
import { useUnsavedChangesGuard } from "./use-unsaved-changes-guard";

interface VenueFormProps {
  initialData?: {
    id?: number;
    name?: string;
    slug?: string;
    address?: string | null;
    city?: string;
    state?: string;
    zip?: string | null;
    phone?: string | null;
    website?: string | null;
    capacity?: string | null;
    genres?: string | null;
    bookingRates?: string | null;
    bookingEmail?: string | null;
    description?: string | null;
    image?: string | null;
  };
  onSubmit: (formData: FormData) => void | Promise<unknown>;
  cancelHref: Route;
  isSubmitting?: boolean;
}

export function VenueForm({
  initialData,
  onSubmit,
  cancelHref,
  isSubmitting = false,
}: VenueFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [address, setAddress] = useState(initialData?.address || "");
  const [city, setCity] = useState(initialData?.city || "Little Rock");
  const [state, setState] = useState(initialData?.state || "AR");
  const [zip, setZip] = useState(initialData?.zip || "");
  const [phone, setPhone] = useState(initialData?.phone || "");
  const [website, setWebsite] = useState(initialData?.website || "");
  const [capacity, setCapacity] = useState(initialData?.capacity || "");
  const [genres, setGenres] = useState(initialData?.genres || "");
  const [bookingRates, setBookingRates] = useState(initialData?.bookingRates || "");
  const [bookingEmail, setBookingEmail] = useState(initialData?.bookingEmail || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [image, setImage] = useState(initialData?.image || "");

  const [imageUploading, setImageUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDirty = useMemo(() => {
    return (
      name !== (initialData?.name || "") ||
      slug !== (initialData?.slug || "") ||
      address !== (initialData?.address || "") ||
      city !== (initialData?.city || "Little Rock") ||
      state !== (initialData?.state || "AR") ||
      zip !== (initialData?.zip || "") ||
      phone !== (initialData?.phone || "") ||
      website !== (initialData?.website || "") ||
      capacity !== (initialData?.capacity || "") ||
      genres !== (initialData?.genres || "") ||
      bookingRates !== (initialData?.bookingRates || "") ||
      bookingEmail !== (initialData?.bookingEmail || "") ||
      description !== (initialData?.description || "") ||
      image !== (initialData?.image || "")
    );
  }, [
    name,
    slug,
    address,
    city,
    state,
    zip,
    phone,
    website,
    capacity,
    genres,
    bookingRates,
    bookingEmail,
    description,
    image,
    initialData,
  ]);

  const { UnsavedChangesDialog, navigateAway } = useUnsavedChangesGuard(isDirty, cancelHref);

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid image file");
      return;
    }

    setImageUploading(true);
    const loadingId = toast.loading("Uploading venue image...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload/image?type=venue", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(error.error || "Failed to upload image");
      }

      const { url } = await response.json();
      setImage(url);
      toast.success("Venue image uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload venue image");
    } finally {
      toast.dismiss(loadingId);
      setImageUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("slug", slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
    formData.append("address", address);
    formData.append("city", city);
    formData.append("state", state);
    formData.append("zip", zip);
    formData.append("phone", phone);
    formData.append("website", website);
    formData.append("capacity", capacity);
    formData.append("genres", genres);
    formData.append("bookingRates", bookingRates);
    formData.append("bookingEmail", bookingEmail);
    formData.append("description", description);
    formData.append("image", image);

    try {
      await onSubmit(formData);
      toast.success(initialData?.id ? "Venue updated successfully" : "Venue created successfully");
    } catch (error) {
      if (isNextRedirectError(error)) {
        return;
      }
      toast.error(getErrorMessage(error, "Failed to save venue"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {UnsavedChangesDialog}
      <div className="flex items-center justify-between gap-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigateAway(cancelHref)}
          className="gap-2 px-0 text-[#7CFC00] hover:bg-transparent hover:text-[#7CFC00]/80"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Venues
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Venue Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Vino's"
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
              placeholder="Auto-generated from name"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="address">Street Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="923 W 7th St"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="zip">Zip</Label>
              <Input
                id="zip"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="72201"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="501-375-8466"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="website">Website URL</Label>
            <Input
              id="website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://vinosbrewpub.com"
              className="mt-1"
            />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="capacity">Capacity</Label>
            <Input
              id="capacity"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="e.g. 250"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="genres">Music Genres / Atmosphere</Label>
            <Input
              id="genres"
              value={genres}
              onChange={(e) => setGenres(e.target.value)}
              placeholder="Punk, Hardcore, Metal, Indie"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="bookingRates">Booking Rates / Terms</Label>
            <Input
              id="bookingRates"
              value={bookingRates}
              onChange={(e) => setBookingRates(e.target.value)}
              placeholder="e.g. $150 flat + sound tech, 80/20 door split"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="bookingEmail">Booking Email</Label>
            <Input
              id="bookingEmail"
              type="email"
              value={bookingEmail}
              onChange={(e) => setBookingEmail(e.target.value)}
              placeholder="booking@venue.com"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">About Venue / Production Specs</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Stage dimensions, PA specs, green room info, etc."
              rows={4}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Venue Photo</Label>
            <div className="mt-1 flex items-center gap-4">
              {image ? (
                <div className="relative w-32 h-24 rounded border border-zinc-700 overflow-hidden bg-zinc-900">
                  <NextImage src={image} alt="Venue" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => setImage("")}
                    className="absolute top-1 right-1 p-1 bg-black/70 rounded-full text-white hover:bg-black"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : null}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageUploading}
                  className="gap-2 border-zinc-700 text-zinc-300"
                >
                  <Upload className="w-4 h-4" />
                  {imageUploading ? "Uploading..." : image ? "Change Photo" : "Upload Photo"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-zinc-800 flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigateAway(cancelHref)}
          className="border-zinc-700 text-zinc-300"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSaving || isSubmitting}
          className="bg-[#7CFC00] text-black hover:bg-[#7CFC00]/90 font-bold"
        >
          {isSaving ? "Saving..." : initialData?.id ? "Update Venue" : "Create Venue"}
        </Button>
      </div>
    </form>
  );
}
