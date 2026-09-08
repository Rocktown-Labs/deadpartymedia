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
import { Checkbox } from "@/components/ui/checkbox";
import { useArtists } from "@/lib/api/artists";
import { ArrowLeft, Upload, X } from "lucide-react";
import type { Route } from "next";
import { toast } from "sonner";
import { validateImageFile } from "@/lib/upload";
import { getErrorMessage, isNextRedirectError } from "@/lib/utils/error";
import { useUnsavedChangesGuard } from "./use-unsaved-changes-guard";

interface MusicReleaseFormProps {
  initialData?: {
    id?: number;
    title?: string;
    slug?: string;
    artistName?: string;
    artistId?: number | null;
    releaseType?: "Album" | "Single" | "EP";
    genre?: string;
    releaseDate?: string | null;
    coverArt?: string | null;
    excerpt?: string;
    content?: string | null;
    spotifyUrl?: string | null;
    appleMusicUrl?: string | null;
    bandcampUrl?: string | null;
    youtubeUrl?: string | null;
    status?: "draft" | "published" | "archived";
    featured?: boolean;
  };
  onSubmit: (formData: FormData) => void | Promise<unknown>;
  cancelHref: Route;
  isSubmitting?: boolean;
}

const genres = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"] as const;
const releaseTypes = ["Single", "Album", "EP"] as const;

export function MusicReleaseForm({
  initialData,
  onSubmit,
  cancelHref,
  isSubmitting = false,
}: MusicReleaseFormProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [artistName, setArtistName] = useState(initialData?.artistName || "");
  const [artistId, setArtistId] = useState<number | null>(initialData?.artistId ?? null);
  const [releaseType, setReleaseType] = useState<"Album" | "Single" | "EP">(
    initialData?.releaseType || "Single",
  );
  const [genre, setGenre] = useState(initialData?.genre || "HARDCORE & ROCK");
  const [releaseDate, setReleaseDate] = useState(initialData?.releaseDate || "");
  const [coverArt, setCoverArt] = useState(initialData?.coverArt || "");
  const [excerpt, setExcerpt] = useState(initialData?.excerpt || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [spotifyUrl, setSpotifyUrl] = useState(initialData?.spotifyUrl || "");
  const [appleMusicUrl, setAppleMusicUrl] = useState(initialData?.appleMusicUrl || "");
  const [bandcampUrl, setBandcampUrl] = useState(initialData?.bandcampUrl || "");
  const [youtubeUrl, setYoutubeUrl] = useState(initialData?.youtubeUrl || "");
  const [status, setStatus] = useState<"draft" | "published" | "archived">(
    initialData?.status || "published",
  );
  const [featured, setFeatured] = useState(initialData?.featured || false);

  const [useCoverArtUrl, setUseCoverArtUrl] = useState(Boolean(initialData?.coverArt));
  const [imageUploading, setImageUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: artists = [] } = useArtists();

  const isDirty = useMemo(() => {
    return (
      title !== (initialData?.title || "") ||
      slug !== (initialData?.slug || "") ||
      artistName !== (initialData?.artistName || "") ||
      artistId !== (initialData?.artistId ?? null) ||
      releaseType !== (initialData?.releaseType || "Single") ||
      genre !== (initialData?.genre || "HARDCORE & ROCK") ||
      releaseDate !== (initialData?.releaseDate || "") ||
      coverArt !== (initialData?.coverArt || "") ||
      excerpt !== (initialData?.excerpt || "") ||
      content !== (initialData?.content || "") ||
      spotifyUrl !== (initialData?.spotifyUrl || "") ||
      appleMusicUrl !== (initialData?.appleMusicUrl || "") ||
      bandcampUrl !== (initialData?.bandcampUrl || "") ||
      youtubeUrl !== (initialData?.youtubeUrl || "") ||
      status !== (initialData?.status || "published") ||
      featured !== (initialData?.featured || false)
    );
  }, [
    title,
    slug,
    artistName,
    artistId,
    releaseType,
    genre,
    releaseDate,
    coverArt,
    excerpt,
    content,
    spotifyUrl,
    appleMusicUrl,
    bandcampUrl,
    youtubeUrl,
    status,
    featured,
    initialData,
  ]);

  const { UnsavedChangesDialog, navigateAway } = useUnsavedChangesGuard(isDirty, cancelHref);

  const handleArtistSelect = (selectedId: string) => {
    if (selectedId === "none") {
      setArtistId(null);
      return;
    }
    const id = Number(selectedId);
    setArtistId(id);
    const matched = artists.find((a) => a.id === id);
    if (matched && !artistName) {
      setArtistName(matched.name);
    }
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file) {
      return;
    }

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid image file");
      return;
    }

    setImageUploading(true);
    const loadingId = toast.loading("Uploading cover art...");

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
      setCoverArt(url);
      setUseCoverArtUrl(false);
      toast.success("Cover art uploaded successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload cover art");
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
    formData.append("slug", slug || "");
    formData.append("artistName", artistName);
    if (artistId) {
      formData.append("artistId", artistId.toString());
    }
    formData.append("releaseType", releaseType);
    formData.append("genre", genre);
    formData.append("releaseDate", releaseDate);
    formData.append("coverArt", coverArt);
    formData.append("excerpt", excerpt);
    formData.append("content", content);
    formData.append("spotifyUrl", spotifyUrl);
    formData.append("appleMusicUrl", appleMusicUrl);
    formData.append("bandcampUrl", bandcampUrl);
    formData.append("youtubeUrl", youtubeUrl);
    formData.append("status", status);
    formData.append("featured", featured ? "true" : "false");

    try {
      await onSubmit(formData);
      toast.success(initialData?.id ? "Release updated!" : "Release created!");
    } catch (error) {
      if (isNextRedirectError(error)) {
        throw error;
      }
      toast.error(getErrorMessage(error, "Failed to save release"));
      setIsSaving(false);
    }
  };

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
          Back to Music Releases
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="title">Release Title *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Telepathic High"
            required
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="artistName">Artist / Band Name *</Label>
          <Input
            id="artistName"
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            placeholder="e.g. The Silver Tears"
            required
            className="mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div>
          <Label htmlFor="releaseType">Release Type *</Label>
          <Select
            value={releaseType}
            onValueChange={(val) => setReleaseType(val as "Album" | "Single" | "EP")}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {releaseTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="genre">Genre *</Label>
          <Select value={genre} onValueChange={setGenre}>
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
          <Label htmlFor="releaseDate">Release Date</Label>
          <Input
            id="releaseDate"
            type="date"
            value={releaseDate}
            onChange={(e) => setReleaseDate(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="artistSelect">Linked Artist Profile (Optional)</Label>
          <Select
            value={artistId ? artistId.toString() : "none"}
            onValueChange={handleArtistSelect}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Link to artist profile..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (Independent / Guest)</SelectItem>
              {artists.map((a) => (
                <SelectItem key={a.id} value={a.id.toString()}>
                  {a.name} ({a.genre})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="slug">Custom Slug (Optional)</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="Auto-generated from artist and title"
            className="mt-1"
          />
        </div>
      </div>

      {/* Cover Art Upload */}
      <div>
        <Label>Cover Art</Label>
        <div className="mt-2 space-y-4">
          {coverArt && (
            <div className="relative aspect-square w-48 rounded-lg overflow-hidden border border-gray-800 bg-zinc-950">
              <NextImage src={coverArt} alt="Cover art preview" fill className="object-cover" />
              <button
                type="button"
                onClick={() => setCoverArt("")}
                className="absolute top-2 right-2 p-1 rounded-full bg-black/70 text-white hover:bg-black transition-colors"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageUpload(e.target.files?.[0] || null)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={imageUploading}
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {imageUploading ? "Uploading..." : "Upload Cover Art"}
            </Button>
            <button
              type="button"
              onClick={() => setUseCoverArtUrl(!useCoverArtUrl)}
              className="text-xs text-[#7CFC00] hover:underline"
            >
              {useCoverArtUrl ? "Hide URL input" : "Or paste image URL"}
            </button>
          </div>

          {useCoverArtUrl && (
            <Input
              value={coverArt}
              onChange={(e) => setCoverArt(e.target.value)}
              placeholder="https://..."
              className="mt-2"
            />
          )}
        </div>
      </div>

      {/* Excerpt */}
      <div>
        <Label htmlFor="excerpt">Excerpt / Short Hook *</Label>
        <Textarea
          id="excerpt"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Brief summary or highlight about this release..."
          required
          rows={2}
          className="mt-1"
        />
      </div>

      {/* Content / Write-up */}
      <div>
        <Label htmlFor="content">Editorial Review / Notes (Optional)</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="In-depth write-up, tracklist breakdown, credits, or review..."
          rows={6}
          className="mt-1 font-mono text-sm"
        />
      </div>

      {/* Streaming Links */}
      <div className="rounded-xl border border-gray-800 bg-zinc-950/60 p-5 space-y-4">
        <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-[#7CFC00]">
          Streaming & Purchase Links
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="spotifyUrl" className="text-xs">
              Spotify URL
            </Label>
            <Input
              id="spotifyUrl"
              value={spotifyUrl}
              onChange={(e) => setSpotifyUrl(e.target.value)}
              placeholder="https://open.spotify.com/album/..."
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="appleMusicUrl" className="text-xs">
              Apple Music URL
            </Label>
            <Input
              id="appleMusicUrl"
              value={appleMusicUrl}
              onChange={(e) => setAppleMusicUrl(e.target.value)}
              placeholder="https://music.apple.com/..."
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="bandcampUrl" className="text-xs">
              Bandcamp URL
            </Label>
            <Input
              id="bandcampUrl"
              value={bandcampUrl}
              onChange={(e) => setBandcampUrl(e.target.value)}
              placeholder="https://artist.bandcamp.com/album/..."
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="youtubeUrl" className="text-xs">
              YouTube / Music Video URL
            </Label>
            <Input
              id="youtubeUrl"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="mt-1"
            />
          </div>
        </div>
      </div>

      {/* Status & Featured */}
      <div className="flex flex-wrap items-center gap-8 py-2">
        <div className="w-48">
          <Label htmlFor="status">Publish Status</Label>
          <Select
            value={status}
            onValueChange={(val) => setStatus(val as "draft" | "published" | "archived")}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2 pt-6">
          <Checkbox
            id="featured"
            checked={featured}
            onCheckedChange={(checked) => setFeatured(checked === true)}
          />
          <Label htmlFor="featured" className="text-sm font-medium cursor-pointer">
            Feature on Homepage Discography
          </Label>
        </div>
      </div>

      <div className="flex gap-4 pt-4 border-t border-gray-800">
        <Button
          type="submit"
          disabled={isSaving || isSubmitting || imageUploading}
          className="bg-[#7CFC00] text-black hover:bg-[#7CFC00]/90 font-bold"
        >
          {isSaving ? "Saving..." : initialData?.id ? "Update Release" : "Publish Release"}
        </Button>
        <Button type="button" variant="outline" onClick={() => navigateAway(cancelHref)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
