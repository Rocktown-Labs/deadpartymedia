"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { ArrowLeft, Check, FileUp, Search, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { SpotifySearch } from "@/components/spotify-search";
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
import type { SpotifyArtist } from "@/lib/api/artists";
import { ARTIST_IMPORT_GENRES, buildArtistImportRows } from "@/lib/admin/artist-list-import";
import type { ArtistImportGenre, ArtistImportRow } from "@/lib/admin/artist-list-import";
import { cn } from "@/lib/utils";

interface ExistingArtist {
  genre: ArtistImportGenre;
  hidden: boolean;
  id: number;
  image: string | null;
  location: string;
  name: string;
  slug: string;
  spotifyUrl: string | null;
  website: string | null;
}

interface CreateArtistResult {
  artist?: ExistingArtist;
  error?: string;
  existing?: boolean;
  success: boolean;
}

interface ArtistListImportClientProps {
  existingArtists: ExistingArtist[];
  onCreateArtist: (formData: FormData) => Promise<CreateArtistResult>;
}

export function ArtistListImportClient({
  existingArtists,
  onCreateArtist,
}: ArtistListImportClientProps) {
  const [rawText, setRawText] = useState("");
  const [rows, setRows] = useState<ArtistImportRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeRow = rows.find((row) => row.id === activeId) ?? rows[0] ?? null;
  const activeIndex = activeRow ? rows.findIndex((row) => row.id === activeRow.id) : -1;
  const stats = useMemo(
    () => ({
      created: rows.filter((row) => row.status === "created").length,
      duplicates: rows.filter((row) => row.status === "duplicate").length,
      errors: rows.filter((row) => row.status === "error").length,
      ready: rows.filter((row) => row.status === "ready").length,
      skipped: rows.filter((row) => row.status === "skipped").length,
      total: rows.length,
    }),
    [rows],
  );

  const setRow = (id: string, updates: Partial<ArtistImportRow>) => {
    setRows((currentRows) =>
      currentRows.map((row) => (row.id === id ? { ...row, ...updates } : row)),
    );
  };

  const parseRows = (text: string) => {
    const parsedRows = buildArtistImportRows(text, existingArtists);
    setRows(parsedRows);
    setActiveId(parsedRows[0]?.id ?? null);
    if (parsedRows.length === 0) {
      toast.error("No artist rows found");
    } else {
      toast.success(`Loaded ${parsedRows.length} artists for review`);
    }
  };

  const createArtist = (row: ArtistImportRow, moveNext = true) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("name", row.name);
      formData.append("genre", row.genre);
      formData.append("location", row.location);
      formData.append("spotifyArtistId", row.spotifyArtistId);
      formData.append("spotifyUrl", row.spotifyUrl);
      formData.append("image", row.image);
      formData.append("website", row.website);

      try {
        const result = await onCreateArtist(formData);
        if (!result.success) {
          setRow(row.id, { status: "error", statusMessage: result.error || "Import failed" });
          toast.error(result.error || "Import failed");
          return;
        }
        setRow(row.id, {
          duplicateId: result.artist?.id ?? row.duplicateId,
          status: result.existing ? "duplicate" : "created",
          statusMessage: result.existing
            ? `Already exists as #${result.artist?.id}`
            : `Created hidden profile #${result.artist?.id}`,
        });
        if (moveNext) {
          const nextRow = rows
            .slice(activeIndex + 1)
            .find((candidate) => candidate.status === "ready");
          setActiveId(nextRow?.id ?? row.id);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Import failed";
        setRow(row.id, { status: "error", statusMessage: message });
        toast.error(message);
      }
    });
  };

  const createAllReady = () => {
    const readyRows = rows.filter((row) => row.status === "ready");
    if (readyRows.length === 0) {
      toast.info("No ready rows to create");
      return;
    }
    startTransition(async () => {
      for (const row of readyRows) {
        const formData = new FormData();
        formData.append("name", row.name);
        formData.append("genre", row.genre);
        formData.append("location", row.location);
        formData.append("spotifyArtistId", row.spotifyArtistId);
        formData.append("spotifyUrl", row.spotifyUrl);
        formData.append("image", row.image);
        formData.append("website", row.website);
        try {
          const result = await onCreateArtist(formData);
          setRow(row.id, {
            duplicateId: result.artist?.id ?? row.duplicateId,
            status: result.existing ? "duplicate" : "created",
            statusMessage: result.existing
              ? `Already exists as #${result.artist?.id}`
              : `Created hidden profile #${result.artist?.id}`,
          });
        } catch (error) {
          setRow(row.id, {
            status: "error",
            statusMessage: error instanceof Error ? error.message : "Import failed",
          });
        }
      }
      toast.success("Finished creating ready artist profiles");
    });
  };

  return (
    <div className="space-y-6">
      <Link
        href="/admin/artists"
        className="inline-flex items-center gap-2 text-sm font-bold text-[#7CFC00]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Artists
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-gray-500">Super Admin</p>
          <h1 className="text-3xl font-black">Artist List Import</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-400">
            Paste a sheet export or upload CSV/TSV with Band/Artist Name, Genre, and City/Region.
            New records are hidden until a real bio, image, and links are ready.
          </p>
        </div>
        {rows.length > 0 && (
          <Button
            type="button"
            onClick={createAllReady}
            disabled={isPending || stats.ready === 0}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Create {stats.ready} Hidden Profiles
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(280px,380px)_1fr]">
        <section className="rounded-lg border border-gray-800 bg-[#111111] p-4">
          <div className="mb-4 grid grid-cols-3 gap-2 text-xs">
            <Stat label="Total" value={stats.total} />
            <Stat label="Ready" value={stats.ready} />
            <Stat label="Created" value={stats.created} />
            <Stat label="Duplicates" value={stats.duplicates} />
            <Stat label="Skipped" value={stats.skipped} />
            <Stat label="Errors" value={stats.errors} />
          </div>

          <div className="space-y-3">
            <Label htmlFor="artist-import-text">Paste list</Label>
            <Textarea
              id="artist-import-text"
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              rows={8}
              placeholder={
                "Band/Artist Name, Genre, City/Region\nPat B Da Truth, Hip-Hop, Little Rock"
              }
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => parseRows(rawText)} disabled={!rawText.trim()}>
                Parse List
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileUp className="h-4 w-4" />
                Upload CSV
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    return;
                  }
                  const text = await file.text();
                  setRawText(text);
                  parseRows(text);
                }}
              />
            </div>
          </div>

          {rows.length > 0 && (
            <div className="mt-5 max-h-[52svh] space-y-2 overflow-y-auto pr-1">
              {rows.map((row, index) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setActiveId(row.id)}
                  className={cn(
                    "w-full rounded-md border p-3 text-left transition-colors",
                    activeRow?.id === row.id
                      ? "border-[#7CFC00] bg-[#7CFC00]/10"
                      : "border-gray-800 bg-[#0A0A0A] hover:border-gray-700",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-bold">
                      {index + 1}. {row.name}
                    </span>
                    <StatusPill status={row.status} />
                  </div>
                  <p className="mt-1 truncate text-xs text-gray-500">{row.statusMessage}</p>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-gray-800 bg-[#111111] p-4">
          {activeRow ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 border-b border-gray-800 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-gray-500">
                    Row {activeIndex + 1} of {rows.length}
                  </p>
                  <h2 className="mt-1 text-2xl font-black">{activeRow.name}</h2>
                  <p className="mt-1 text-sm text-gray-400">{activeRow.statusMessage}</p>
                </div>
                <StatusPill status={activeRow.status} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Artist Name"
                  value={activeRow.name}
                  onChange={(value) => setRow(activeRow.id, { name: value })}
                />
                <Field
                  label="City / Region"
                  value={activeRow.location}
                  onChange={(value) => setRow(activeRow.id, { location: value })}
                />
                <div>
                  <Label>Genre</Label>
                  <Select
                    value={activeRow.genre}
                    onValueChange={(value) =>
                      setRow(activeRow.id, { genre: value as ArtistImportGenre })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ARTIST_IMPORT_GENRES.map((genre) => (
                        <SelectItem key={genre} value={genre}>
                          {genre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Field
                  label="Other Link"
                  value={activeRow.website}
                  onChange={(value) => setRow(activeRow.id, { website: value })}
                  placeholder="Bandcamp, YouTube, SoundCloud, website..."
                />
              </div>

              {activeRow.duplicateId ? (
                <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-100">
                  This row matches artist #{activeRow.duplicateId}. Skip it, or edit the name if it
                  really belongs to a different artist.
                </div>
              ) : null}

              <div className="rounded-lg border border-gray-800 p-4">
                <SpotifySearch
                  key={activeRow.id}
                  value={activeRow.spotifyUrl || activeRow.name}
                  onSelect={(artist: SpotifyArtist) => {
                    setRow(activeRow.id, {
                      image: artist.images[0]?.url ?? activeRow.image,
                      name: activeRow.name || artist.name,
                      spotifyArtistId: artist.id,
                      spotifyUrl: artist.external_urls.spotify,
                    });
                  }}
                />
                <p className="mt-2 text-xs text-gray-500">
                  Optional. Leave Spotify blank for artists who use Bandcamp, YouTube, SoundCloud,
                  or a personal site instead.
                </p>
              </div>

              {activeRow.spotifyUrl || activeRow.website || activeRow.image ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="Spotify URL"
                    value={activeRow.spotifyUrl}
                    onChange={(value) => setRow(activeRow.id, { spotifyUrl: value })}
                  />
                  <Field
                    label="Image URL"
                    value={activeRow.image}
                    onChange={(value) => setRow(activeRow.id, { image: value })}
                  />
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => createArtist(activeRow)}
                  disabled={isPending || activeRow.status === "created"}
                  className="gap-2"
                >
                  <Check className="h-4 w-4" />
                  Create Hidden Profile
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setRow(activeRow.id, { status: "skipped", statusMessage: "Skipped by admin" })
                  }
                  disabled={isPending || activeRow.status === "created"}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Skip
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[420px] flex-col items-center justify-center text-center text-gray-500">
              <Search className="mb-3 h-8 w-8" />
              <p className="font-bold text-gray-300">Load an artist list to begin.</p>
              <p className="mt-1 max-w-md text-sm">
                The importer will flag exact duplicates before anything is created.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1"
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-gray-800 bg-[#0A0A0A] p-2">
      <p className="text-lg font-black text-white">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
    </div>
  );
}

function StatusPill({ status }: { status: ArtistImportRow["status"] }) {
  const styles = {
    created: "border-green-500/30 bg-green-500/15 text-green-300",
    duplicate: "border-yellow-500/30 bg-yellow-500/15 text-yellow-300",
    error: "border-red-500/30 bg-red-500/15 text-red-300",
    ready: "border-blue-500/30 bg-blue-500/15 text-blue-300",
    skipped: "border-gray-600 bg-gray-800 text-gray-300",
  };
  return (
    <span
      className={cn(
        "shrink-0 rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wider",
        styles[status],
      )}
    >
      {status}
    </span>
  );
}
