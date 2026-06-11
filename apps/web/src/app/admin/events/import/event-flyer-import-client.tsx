"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Upload, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { SpotifySearch } from "@/components/spotify-search";
import { useArtists } from "@/lib/api/artists";
import { validateImageFile } from "@/lib/upload";
import type { SpotifyArtist } from "@/lib/api/artists";
import { analyzeEventFlyerAction, createEventFromFlyerImportAction } from "./actions";
import type { EventFlyerAnalysis } from "./actions";

type QueueStatus = "queued" | "uploading" | "analyzing" | "needs_review" | "approved" | "failed";

interface QueueItem {
  id: string;
  fileName: string;
  previewUrl: string;
  imageUrl: string;
  status: QueueStatus;
  error: string | null;
  analysis: EventFlyerAnalysis | null;
  fields: {
    title: string;
    description: string;
    venue: string;
    location: string;
    date: string;
    time: string;
    ticketLink: string;
    price: string;
    genre: "COUNTRY" | "EDM" | "HARDCORE & ROCK" | "HIP-HOP & R&B" | "OTHER";
    artistIds: number[];
    ignoredArtistNames: string[];
  };
}

const EMPTY_FIELDS: QueueItem["fields"] = {
  artistIds: [],
  date: "",
  description: "",
  genre: "OTHER",
  ignoredArtistNames: [],
  location: "",
  price: "",
  ticketLink: "",
  time: "",
  title: "",
  venue: "",
};

const GENRES = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"] as const;

interface EventFlyerImportClientProps {
  onCreateArtistStub: (formData: FormData) => Promise<
    | {
        success: boolean;
        artist: {
          id: number;
          name: string;
          genre: string;
          location: string;
          email: string | null;
        };
      }
    | { success: boolean; error: string; artist?: undefined }
  >;
}

function statusLabel(status: QueueStatus) {
  return status.replaceAll("_", " ");
}

function buildItemFromAnalysis(item: QueueItem, analysis: EventFlyerAnalysis): QueueItem {
  return {
    ...item,
    analysis,
    status: "needs_review",
    fields: {
      artistIds: analysis.matchedArtists.map((artist) => artist.id),
      date: analysis.date,
      description: analysis.description,
      genre: analysis.genre,
      ignoredArtistNames: [],
      location: analysis.location,
      price: analysis.price ?? "",
      ticketLink: analysis.ticketLink ?? "",
      time: analysis.time,
      title: analysis.title,
      venue: analysis.venue,
    },
  };
}

export default function EventFlyerImportClient({
  onCreateArtistStub,
}: EventFlyerImportClientProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: artists = [], refetch: refetchArtists } = useArtists();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);

  const activeItem = items.find((item) => item.id === activeItemId) ?? items[0] ?? null;
  const selectedArtists = useMemo(() => {
    if (!activeItem) {
      return [];
    }
    return artists.filter((artist) => activeItem.fields.artistIds.includes(artist.id));
  }, [activeItem, artists]);

  const updateItem = (id: string, updater: (item: QueueItem) => QueueItem) => {
    setItems((previous) => previous.map((item) => (item.id === id ? updater(item) : item)));
  };

  const updateField = <K extends keyof QueueItem["fields"]>(
    id: string,
    field: K,
    value: QueueItem["fields"][K],
  ) => {
    updateItem(id, (item) => ({
      ...item,
      fields: {
        ...item.fields,
        [field]: value,
      },
    }));
  };

  const uploadImage = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/upload/image?type=event", {
      body: formData,
      method: "POST",
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error || "Image upload failed");
    }
    const payload = await response.json();
    return String(payload.url);
  };

  const failItem = (itemId: string, error: unknown, fallbackMessage: string) => {
    const message = error instanceof Error ? error.message : fallbackMessage;
    updateItem(itemId, (item) => ({
      ...item,
      error: message,
      status: "failed",
    }));
  };

  const analyzeItem = async (itemId: string) => {
    const current = items.find((item) => item.id === itemId);
    if (!current?.imageUrl) {
      return;
    }

    updateItem(itemId, (item) => ({ ...item, error: null, status: "analyzing" }));
    try {
      const analysis = await analyzeEventFlyerAction(current.imageUrl);
      updateItem(itemId, (item) => buildItemFromAnalysis(item, analysis));
    } catch (error) {
      updateItem(itemId, (item) => ({
        ...item,
        error: error instanceof Error ? error.message : "Failed to analyze flyer",
        status: "failed",
      }));
    }
  };

  const handleFiles = async (fileList: FileList | null) => {
    const files = [...(fileList ?? [])];
    if (files.length === 0) {
      return;
    }

    const newItems = files.map((file) => ({
      id: crypto.randomUUID(),
      fileName: file.name,
      previewUrl: URL.createObjectURL(file),
      imageUrl: "",
      status: "queued" as QueueStatus,
      error: null,
      analysis: null,
      fields: { ...EMPTY_FIELDS },
    }));
    setItems((previous) => [...previous, ...newItems]);
    setActiveItemId(newItems[0]?.id ?? null);
    setIsProcessingBatch(true);

    for (const [index, file] of files.entries()) {
      const itemId = newItems[index]?.id;
      if (!itemId) {
        continue;
      }

      const validation = validateImageFile(file);
      if (!validation.valid) {
        updateItem(itemId, (item) => ({
          ...item,
          error: validation.error || "Invalid image file",
          status: "failed",
        }));
        continue;
      }

      try {
        updateItem(itemId, (item) => ({ ...item, status: "uploading" }));
        const imageUrl = await uploadImage(file);
        updateItem(itemId, (item) => ({ ...item, imageUrl }));
        const analysis = await analyzeEventFlyerAction(imageUrl);
        updateItem(itemId, (item) => buildItemFromAnalysis(item, analysis));
      } catch (error) {
        failItem(itemId, error, "Failed to process flyer");
      }
    }

    setIsProcessingBatch(false);
  };

  const toggleArtist = (artistId: number, checked: boolean) => {
    if (!activeItem) {
      return;
    }
    const nextIds = checked
      ? [...new Set([...activeItem.fields.artistIds, artistId])]
      : activeItem.fields.artistIds.filter((id) => id !== artistId);
    updateField(activeItem.id, "artistIds", nextIds);
  };

  const createArtistStub = async (name: string, spotifyArtist?: SpotifyArtist) => {
    if (!activeItem) {
      return;
    }

    const formData = new FormData();
    formData.append("displayName", spotifyArtist?.name || name);
    formData.append("genre", activeItem.fields.genre);
    formData.append("location", activeItem.fields.location || "Arkansas");

    const result = await onCreateArtistStub(formData);
    if (!result.success || !result.artist) {
      toast.error("error" in result ? result.error : "Failed to create artist");
      return;
    }

    await refetchArtists();
    updateField(activeItem.id, "artistIds", [...activeItem.fields.artistIds, result.artist.id]);
    updateField(activeItem.id, "ignoredArtistNames", [
      ...activeItem.fields.ignoredArtistNames,
      name,
    ]);
    toast.success(`Added ${result.artist.name}`);
  };

  const ignoreArtistName = (name: string) => {
    if (!activeItem) {
      return;
    }
    updateField(activeItem.id, "ignoredArtistNames", [
      ...new Set([...activeItem.fields.ignoredArtistNames, name]),
    ]);
  };

  const approveActiveItem = async () => {
    if (!activeItem) {
      return;
    }

    const formData = new FormData();
    formData.append("title", activeItem.fields.title);
    formData.append("slug", activeItem.fields.title.toLowerCase().replaceAll(/\s+/g, "-"));
    formData.append("description", activeItem.fields.description);
    formData.append("image", activeItem.imageUrl);
    formData.append("venue", activeItem.fields.venue);
    formData.append("location", activeItem.fields.location);
    formData.append("date", activeItem.fields.date);
    formData.append("time", activeItem.fields.time);
    formData.append("ticketLink", activeItem.fields.ticketLink);
    formData.append("price", activeItem.fields.price);
    formData.append("genre", activeItem.fields.genre);
    formData.append("artistIds", activeItem.fields.artistIds.join(","));

    try {
      const result = await createEventFromFlyerImportAction(formData);
      updateItem(activeItem.id, (item) => ({ ...item, status: "approved" }));
      toast.success(
        result.eventIsPast
          ? "Past event published and will appear under Past."
          : "Upcoming event published.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create event");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link
            href="/admin/events"
            className="mb-3 inline-flex items-center text-sm text-[#7CFC00]"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Link>
          <h1 className="text-3xl font-black">AI Event Flyer Import</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-400">
            Upload flyers, review extracted event fields, sync performers, then approve each event.
          </p>
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(event) => handleFiles(event.target.files)}
          />
          <Button
            type="button"
            className="gap-2"
            disabled={isProcessingBatch}
            onClick={() => inputRef.current?.click()}
          >
            {isProcessingBatch ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Upload Flyers
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-800 bg-[#111111] p-10 text-center text-gray-400">
          No flyers queued yet.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="space-y-3">
            {items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveItemId(item.id)}
                className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                  activeItem?.id === item.id
                    ? "border-[#7CFC00] bg-[#7CFC00]/10"
                    : "border-gray-800 bg-[#111111] hover:border-gray-700"
                }`}
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded border border-gray-800">
                  <Image src={item.previewUrl} alt={item.fileName} fill className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">Flyer {index + 1}</p>
                  <p className="truncate text-xs text-gray-500">{item.fileName}</p>
                  <Badge variant="outline" className="mt-2 text-[10px] uppercase">
                    {statusLabel(item.status)}
                  </Badge>
                </div>
                {item.status === "approved" && <CheckCircle2 className="h-5 w-5 text-green-400" />}
                {(item.status === "uploading" || item.status === "analyzing") && (
                  <Loader2 className="h-5 w-5 animate-spin text-[#7CFC00]" />
                )}
              </button>
            ))}
          </div>

          {activeItem && (
            <div className="rounded-lg border border-gray-800 bg-[#111111] p-5">
              <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
                <div className="space-y-4">
                  <div className="relative aspect-square overflow-hidden rounded-lg border border-gray-800 bg-black">
                    <Image
                      src={activeItem.previewUrl}
                      alt={activeItem.fileName}
                      fill
                      className="object-contain"
                    />
                  </div>
                  {activeItem.error && (
                    <div className="rounded border border-red-900/60 bg-red-950/20 p-3 text-sm text-red-200">
                      {activeItem.error}
                    </div>
                  )}
                  {activeItem.analysis?.possibleDuplicate && (
                    <div className="rounded border border-yellow-900/60 bg-yellow-950/20 p-3 text-sm text-yellow-200">
                      <AlertTriangle className="mr-2 inline h-4 w-4" />
                      Possible duplicate: {activeItem.analysis.possibleDuplicate.title}
                    </div>
                  )}
                  {activeItem.status === "failed" && activeItem.imageUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => analyzeItem(activeItem.id)}
                    >
                      Retry Analysis
                    </Button>
                  )}
                </div>

                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <Label>Title</Label>
                      <Input
                        value={activeItem.fields.title}
                        onChange={(event) =>
                          updateField(activeItem.id, "title", event.target.value)
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Description</Label>
                      <Textarea
                        rows={4}
                        value={activeItem.fields.description}
                        onChange={(event) =>
                          updateField(activeItem.id, "description", event.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label>Venue</Label>
                      <Input
                        value={activeItem.fields.venue}
                        onChange={(event) =>
                          updateField(activeItem.id, "venue", event.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label>Location</Label>
                      <Input
                        value={activeItem.fields.location}
                        onChange={(event) =>
                          updateField(activeItem.id, "location", event.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={activeItem.fields.date}
                        onChange={(event) => updateField(activeItem.id, "date", event.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Time</Label>
                      <Input
                        type="time"
                        value={activeItem.fields.time}
                        onChange={(event) => updateField(activeItem.id, "time", event.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Price</Label>
                      <Input
                        value={activeItem.fields.price}
                        onChange={(event) =>
                          updateField(activeItem.id, "price", event.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label>Ticket Link</Label>
                      <Input
                        value={activeItem.fields.ticketLink}
                        onChange={(event) =>
                          updateField(activeItem.id, "ticketLink", event.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label>Genre</Label>
                      <select
                        value={activeItem.fields.genre}
                        onChange={(event) =>
                          updateField(
                            activeItem.id,
                            "genre",
                            event.target.value as QueueItem["fields"]["genre"],
                          )
                        }
                        className="mt-1 h-10 w-full rounded-md border border-gray-800 bg-black px-3 text-sm"
                      >
                        {GENRES.map((genre) => (
                          <option key={genre} value={genre}>
                            {genre}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border border-gray-800 p-4">
                    <div className="flex items-center justify-between">
                      <h2 className="font-black">Performing Artists</h2>
                      <span className="text-xs text-gray-500">
                        Select existing, create stubs, or ignore vendors/sponsors.
                      </span>
                    </div>
                    {selectedArtists.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedArtists.map((artist) => (
                          <Badge key={artist.id} variant="secondary" className="gap-1">
                            {artist.name}
                            <button
                              type="button"
                              onClick={() => toggleArtist(artist.id, false)}
                              aria-label={`Remove ${artist.name}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="max-h-48 space-y-2 overflow-y-auto rounded border border-gray-900 p-2">
                      {artists.map((artist) => (
                        <label
                          key={artist.id}
                          className="flex cursor-pointer items-center gap-2 rounded p-2 text-sm hover:bg-gray-900"
                        >
                          <Checkbox
                            checked={activeItem.fields.artistIds.includes(artist.id)}
                            onCheckedChange={(checked) => toggleArtist(artist.id, checked === true)}
                          />
                          <span>{artist.name}</span>
                          <span className="text-xs text-gray-500">{artist.genre}</span>
                        </label>
                      ))}
                    </div>

                    {(activeItem.analysis?.unmatchedArtists ?? [])
                      .filter((name) => !activeItem.fields.ignoredArtistNames.includes(name))
                      .map((name) => (
                        <div key={name} className="rounded border border-gray-800 p-3">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <span className="text-sm font-bold">{name}</span>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => createArtistStub(name)}
                              >
                                Create Stub
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => ignoreArtistName(name)}
                              >
                                Ignore
                              </Button>
                            </div>
                          </div>
                          <SpotifySearch
                            value={name}
                            onSelect={(spotifyArtist) => createArtistStub(name, spotifyArtist)}
                          />
                        </div>
                      ))}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      onClick={approveActiveItem}
                      disabled={
                        activeItem.status === "approved" ||
                        activeItem.status === "uploading" ||
                        activeItem.status === "analyzing"
                      }
                    >
                      Approve & Publish Event
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        updateItem(activeItem.id, (item) => ({
                          ...item,
                          status: "failed",
                          error: "Skipped by admin",
                        }))
                      }
                    >
                      Skip
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
