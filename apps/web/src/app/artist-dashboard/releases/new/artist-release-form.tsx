"use client";

import { useState, useRef, useMemo } from "react";
import NextImage from "next/image";
import type { Route } from "next";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Upload, X, Disc, Music, Link2 } from "lucide-react";
import { toast } from "sonner";
import { validateImageFile } from "@/lib/upload";
import { getErrorMessage, isNextRedirectError } from "@/lib/utils/error";
import { useUnsavedChangesGuard } from "@/components/admin/use-unsaved-changes-guard";

interface ArtistReleaseFormProps {
  artistName: string;
  artistGenre?: string;
  onSubmit: (formData: FormData) => void | Promise<unknown>;
  cancelHref: Route;
}

const genres = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"] as const;
const releaseTypes = ["Single", "Album", "EP"] as const;

export function ArtistReleaseForm({
  artistName,
  artistGenre = "HARDCORE & ROCK",
  onSubmit,
  cancelHref,
}: ArtistReleaseFormProps) {
  const [title, setTitle] = useState("");
  const [releaseType, setReleaseType] = useState<"Album" | "Single" | "EP">("Single");
  const [genre, setGenre] = useState(artistGenre);
  const [releaseDate, setReleaseDate] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [coverArt, setCoverArt] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [appleMusicUrl, setAppleMusicUrl] = useState("");
  const [bandcampUrl, setBandcampUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");

  const [coverArtUploading, setCoverArtUploading] = useState(false);
  const [audioUploading, setAudioUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const isDirty = useMemo(() => {
    return (
      title !== "" ||
      releaseType !== "Single" ||
      genre !== artistGenre ||
      releaseDate !== "" ||
      excerpt !== "" ||
      content !== "" ||
      coverArt !== "" ||
      audioUrl !== "" ||
      spotifyUrl !== "" ||
      appleMusicUrl !== "" ||
      bandcampUrl !== "" ||
      youtubeUrl !== ""
    );
  }, [
    title,
    releaseType,
    genre,
    artistGenre,
    releaseDate,
    excerpt,
    content,
    coverArt,
    audioUrl,
    spotifyUrl,
    appleMusicUrl,
    bandcampUrl,
    youtubeUrl,
  ]);

  const { UnsavedChangesDialog, navigateAway } = useUnsavedChangesGuard(isDirty, cancelHref);

  const handleCoverArtUpload = async (file: File | null) => {
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid image file");
      return;
    }

    setCoverArtUploading(true);
    const loadingId = toast.loading("Uploading cover art...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload/image?type=release", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload cover art");
      }

      const { url } = await response.json();
      setCoverArt(url);
      toast.success("Cover art uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload cover art");
    } finally {
      toast.dismiss(loadingId);
      setCoverArtUploading(false);
    }
  };

  const handleAudioUpload = async (file: File | null) => {
    if (!file) return;

    // Check size limit (10MB max for direct blob upload)
    if (file.size > 10 * 1024 * 1024) {
      toast.error(
        "Audio file exceeds 10MB limit. For large albums, please paste a streaming or download link instead.",
      );
      return;
    }

    setAudioUploading(true);
    const loadingId = toast.loading("Uploading audio track...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload/image?type=content", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Audio upload failed");
      }

      const { url } = await response.json();
      setAudioUrl(url);
      toast.success("Audio file uploaded");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to upload audio. You can paste a link instead.",
      );
    } finally {
      toast.dismiss(loadingId);
      setAudioUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Release title is required");
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("title", title);
    formData.append("artistName", artistName);
    formData.append("releaseType", releaseType);
    formData.append("genre", genre);
    formData.append("releaseDate", releaseDate);
    formData.append("excerpt", excerpt);
    formData.append("content", content);
    formData.append("coverArt", coverArt);
    formData.append("audioUrl", audioUrl);
    formData.append("spotifyUrl", spotifyUrl);
    formData.append("appleMusicUrl", appleMusicUrl);
    formData.append("bandcampUrl", bandcampUrl);
    formData.append("youtubeUrl", youtubeUrl);

    try {
      await onSubmit(formData);
      toast.success("Release submitted! Our team will review and publish it.");
    } catch (error) {
      if (isNextRedirectError(error)) {
        return;
      }
      toast.error(getErrorMessage(error, "Failed to submit release"));
    } finally {
      setIsSubmitting(false);
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
          Back to Releases
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-zinc-100 flex items-center gap-2">
                <Disc className="w-5 h-5 text-[#7CFC00]" /> Release Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-zinc-200">
                  Release Title *
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Dead Weight, Vol. 1"
                  required
                  className="mt-1 bg-zinc-900 border-zinc-800 text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="releaseType" className="text-xs text-zinc-400">
                    Format *
                  </Label>
                  <Select
                    value={releaseType}
                    onValueChange={(val: "Single" | "Album" | "EP") => setReleaseType(val)}
                  >
                    <SelectTrigger id="releaseType" className="mt-1 bg-zinc-900 border-zinc-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {releaseTypes.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="genre" className="text-xs text-zinc-400">
                    Genre *
                  </Label>
                  <Select value={genre} onValueChange={(val) => setGenre(val)}>
                    <SelectTrigger id="genre" className="mt-1 bg-zinc-900 border-zinc-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {genres.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="releaseDate" className="text-xs text-zinc-400">
                    Release Date
                  </Label>
                  <Input
                    id="releaseDate"
                    type="date"
                    value={releaseDate}
                    onChange={(e) => setReleaseDate(e.target.value)}
                    className="mt-1 bg-zinc-900 border-zinc-800 text-zinc-300"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="excerpt" className="text-zinc-200">
                  Short Pitch / Headline *
                </Label>
                <Textarea
                  id="excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="One or two sentences summarizing the release, sound, and message..."
                  rows={2}
                  required
                  className="mt-1 bg-zinc-900 border-zinc-800 text-zinc-300"
                />
              </div>

              <div>
                <Label htmlFor="content" className="text-zinc-200">
                  Release Story &amp; Recording Notes
                </Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Tell us about the tracks, who produced it, themes, lyrical inspiration, upcoming release show, etc."
                  rows={6}
                  className="mt-1 bg-zinc-900 border-zinc-800 text-zinc-300"
                />
              </div>

              {/* Audio Upload or Link */}
              <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-3">
                <Label className="text-zinc-200 flex items-center gap-1.5">
                  <Music className="w-4 h-4 text-[#7CFC00]" /> Audio Track (File or Link)
                </Label>
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                  <div className="flex-1">
                    <Input
                      type="url"
                      value={audioUrl}
                      onChange={(e) => setAudioUrl(e.target.value)}
                      placeholder="https://dropbox.com/... or Google Drive / Soundcloud link"
                      className="bg-zinc-900 border-zinc-800 text-sm"
                    />
                  </div>
                  <div>
                    <input
                      type="file"
                      ref={audioInputRef}
                      accept="audio/*"
                      onChange={(e) => handleAudioUpload(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => audioInputRef.current?.click()}
                      disabled={audioUploading}
                      className="w-full sm:w-auto border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 gap-1.5"
                    >
                      <Upload className="w-4 h-4" />
                      {audioUploading ? "Uploading..." : "Upload Audio File"}
                    </Button>
                  </div>
                </div>
                {audioUrl && (
                  <p className="text-xs text-[#7CFC00] font-mono truncate">
                    Attached track: {audioUrl}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Cover Art & Streaming Links */}
        <div className="space-y-6">
          {/* Cover Art Card */}
          <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-zinc-200">Cover Art *</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                type="file"
                ref={coverInputRef}
                accept="image/*"
                onChange={(e) => handleCoverArtUpload(e.target.files?.[0] || null)}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => coverInputRef.current?.click()}
                disabled={coverArtUploading}
                className="w-full border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 gap-2"
              >
                <Upload className="h-4 w-4" />
                {coverArtUploading
                  ? "Uploading..."
                  : coverArt
                    ? "Change Cover Art"
                    : "Upload Artwork"}
              </Button>

              {coverArt ? (
                <div className="relative aspect-square w-full rounded-lg overflow-hidden border border-zinc-800 bg-black">
                  <NextImage src={coverArt} alt="Artwork Preview" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => setCoverArt("")}
                    className="absolute top-2 right-2 p-1 bg-black/70 rounded-full text-white hover:bg-black"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="border border-dashed border-zinc-800 rounded-lg p-6 text-center text-zinc-500 text-xs">
                  Square cover art (JPG, PNG, WebP)
                </div>
              )}
            </CardContent>
          </Card>

          {/* Streaming & Purchase Links Card */}
          <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-zinc-200 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-[#7CFC00]" /> Streaming &amp; Pre-Save Links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="spotifyUrl" className="text-xs text-zinc-400">
                  Spotify Link
                </Label>
                <Input
                  id="spotifyUrl"
                  type="url"
                  value={spotifyUrl}
                  onChange={(e) => setSpotifyUrl(e.target.value)}
                  placeholder="https://open.spotify.com/..."
                  className="mt-1 bg-zinc-900 border-zinc-800 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="bandcampUrl" className="text-xs text-zinc-400">
                  Bandcamp Link
                </Label>
                <Input
                  id="bandcampUrl"
                  type="url"
                  value={bandcampUrl}
                  onChange={(e) => setBandcampUrl(e.target.value)}
                  placeholder="https://artist.bandcamp.com/..."
                  className="mt-1 bg-zinc-900 border-zinc-800 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="appleMusicUrl" className="text-xs text-zinc-400">
                  Apple Music Link
                </Label>
                <Input
                  id="appleMusicUrl"
                  type="url"
                  value={appleMusicUrl}
                  onChange={(e) => setAppleMusicUrl(e.target.value)}
                  placeholder="https://music.apple.com/..."
                  className="mt-1 bg-zinc-900 border-zinc-800 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="youtubeUrl" className="text-xs text-zinc-400">
                  YouTube / Music Video Link
                </Label>
                <Input
                  id="youtubeUrl"
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="mt-1 bg-zinc-900 border-zinc-800 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigateAway(cancelHref)}
              className="flex-1 border-zinc-800 text-zinc-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-[#7CFC00] text-black hover:bg-[#7CFC00]/90 font-bold"
            >
              {isSubmitting ? "Submitting..." : "Submit Release"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
