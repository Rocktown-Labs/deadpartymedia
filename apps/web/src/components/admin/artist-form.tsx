"use client";

import { useMemo, useState } from "react";
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
import type { Route } from "next";
import { toast } from "sonner";
import { getErrorMessage, isNextRedirectError } from "@/lib/utils/error";
import { SpotifySearch } from "@/components/spotify-search";
import type { SpotifyArtist } from "@/lib/api/artists";
import { ArrowLeft } from "lucide-react";
import { useUnsavedChangesGuard } from "./use-unsaved-changes-guard";

interface ArtistFormProps {
  initialData?: {
    name?: string;
    slug?: string;
    bio?: string;
    image?: string;
    location?: string;
    genre?: string;
    spotifyUrl?: string;
    spotifyArtistId?: string;
    instagram?: string;
    twitter?: string;
    tiktok?: string;
    website?: string;
    email?: string;
    phoneNumber?: string;
  };
  onSubmit: (formData: FormData) => void | Promise<unknown>;
  cancelHref: Route;
  isSubmitting?: boolean;
}

const genres = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"] as const;

export function ArtistForm({
  initialData,
  onSubmit,
  cancelHref,
  isSubmitting = false,
}: ArtistFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [bio, setBio] = useState(initialData?.bio || "");
  const [image, setImage] = useState(initialData?.image || "");
  const [location, setLocation] = useState(initialData?.location || "");
  const [genre, setGenre] = useState(initialData?.genre || "");
  const [spotifyUrl, setSpotifyUrl] = useState(initialData?.spotifyUrl || "");
  const [spotifyArtistId, setSpotifyArtistId] = useState(initialData?.spotifyArtistId || "");
  const [instagram, setInstagram] = useState(initialData?.instagram || "");
  const [twitter, setTwitter] = useState(initialData?.twitter || "");
  const [tiktok, setTiktok] = useState(initialData?.tiktok || "");
  const [website, setWebsite] = useState(initialData?.website || "");
  const [email, setEmail] = useState(initialData?.email || "");
  const [phoneNumber, setPhoneNumber] = useState(initialData?.phoneNumber || "");
  const [inviteArtist, setInviteArtist] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const initialSnapshot = useMemo(
    () =>
      JSON.stringify({
        bio: initialData?.bio || "",
        email: initialData?.email || "",
        genre: initialData?.genre || "",
        image: initialData?.image || "",
        instagram: initialData?.instagram || "",
        location: initialData?.location || "",
        name: initialData?.name || "",
        phoneNumber: initialData?.phoneNumber || "",
        slug: initialData?.slug || "",
        spotifyArtistId: initialData?.spotifyArtistId || "",
        spotifyUrl: initialData?.spotifyUrl || "",
        tiktok: initialData?.tiktok || "",
        twitter: initialData?.twitter || "",
        website: initialData?.website || "",
      }),
    [initialData],
  );
  const currentSnapshot = JSON.stringify({
    bio,
    email,
    genre,
    image,
    instagram,
    location,
    name,
    phoneNumber,
    slug,
    spotifyArtistId,
    spotifyUrl,
    tiktok,
    twitter,
    website,
  });
  const { UnsavedChangesDialog, navigateAway } = useUnsavedChangesGuard(
    currentSnapshot !== initialSnapshot,
    cancelHref,
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData();
    formData.append("name", name);
    formData.append("slug", slug || name.toLowerCase().replaceAll(/\s+/g, "-"));
    formData.append("bio", bio);
    formData.append("image", image);
    formData.append("location", location);
    formData.append("genre", genre);
    formData.append("spotifyUrl", spotifyUrl);
    formData.append("spotifyArtistId", spotifyArtistId);
    formData.append("instagram", instagram);
    formData.append("twitter", twitter);
    formData.append("tiktok", tiktok);
    formData.append("website", website);
    formData.append("email", email);
    formData.append("phoneNumber", phoneNumber);
    formData.append("inviteArtist", String(inviteArtist && Boolean(email)));
    try {
      await onSubmit(formData);
    } catch (error) {
      // Server actions may throw on validation/authorization, or throw a redirect signal.
      if (isNextRedirectError(error)) {
        return;
      }
      toast.error(getErrorMessage(error, "Failed to save artist"));
    } finally {
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
          Back to Artists
        </Button>
      </div>

      <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800 space-y-4">
        <h3 className="text-sm font-medium text-zinc-400">Spotify Integration</h3>
        <SpotifySearch
          value={spotifyUrl}
          onSelect={(artist: SpotifyArtist) => {
            setSpotifyArtistId(artist.id);
            setSpotifyUrl(artist.external_urls.spotify);

            // Auto-fill other fields if they are empty
            if (!name) {
              setName(artist.name);
              const generatedSlug = artist.name.toLowerCase().replaceAll(/\s+/g, "-");
              setSlug(generatedSlug);
            }

            if (!image && artist.images && artist.images.length > 0) {
              // Usually first image is the highest resolution
              setImage(artist.images[0].url);
            }
          }}
        />
        <p className="text-xs text-zinc-500">
          Search for an artist to automatically sync their Spotify ID, URL, and profile image.
        </p>
      </div>

      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
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
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          required
          className="mt-1"
          rows={6}
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
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
            className="mt-1"
          />
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
      </div>

      <div>
        <Label htmlFor="email">Email (for invitation)</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="phoneNumber">Phone Number (optional)</Label>
        <Input
          id="phoneNumber"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="+1 555 123 4567"
          className="mt-1"
        />
      </div>

      {email && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="inviteArtist"
            checked={inviteArtist}
            onCheckedChange={(checked) => setInviteArtist(checked === true)}
          />
          <Label htmlFor="inviteArtist" className="cursor-pointer">
            Send invitation to claim profile
          </Label>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="spotifyUrl">Spotify URL</Label>
          <Input
            id="spotifyUrl"
            type="url"
            value={spotifyUrl}
            onChange={(e) => setSpotifyUrl(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="spotifyArtistId">Spotify Artist ID</Label>
          <Input
            id="spotifyArtistId"
            value={spotifyArtistId}
            onChange={(e) => setSpotifyArtistId(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="instagram">Instagram URL</Label>
          <Input
            id="instagram"
            type="url"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="twitter">Twitter URL</Label>
          <Input
            id="twitter"
            type="url"
            value={twitter}
            onChange={(e) => setTwitter(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="tiktok">TikTok URL</Label>
          <Input
            id="tiktok"
            type="url"
            value={tiktok}
            onChange={(e) => setTiktok(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="website">Website URL</Label>
        <Input
          id="website"
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="mt-1"
        />
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting || isSaving}>
          {isSubmitting || isSaving ? "Saving..." : "Save Artist"}
        </Button>
        <Button type="button" variant="outline" onClick={() => navigateAway(cancelHref)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
