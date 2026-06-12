"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Sparkles,
  ArrowLeft,
  ExternalLink,
  Loader2,
  CheckCircle,
  BookOpen,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { SpotifySearch } from "@/components/spotify-search";
import {
  analyzeWordPressPostAction,
  importWordPressPostAction,
  syncExistingArtistsSpotifyAction,
  syncPublishedWordPressTagsAction,
} from "./actions";
import { findDefaultBackfillAuthorId } from "@/lib/admin/wordpress-backfill";
import type { BackfillAnalysis } from "./actions";
import type { SpotifyArtist } from "@/lib/api/artists";

interface WordPressPostFeedItem {
  id: number;
  title: string;
  url: string;
  excerpt: string;
  content: string;
  date: string;
  modified: string;
  authorName: string;
  authorSlug: string;
  coverImage: string | null;
  rawCategories: string[];
  rawTags?: string[];
  importedPostId: number | null;
  localStatus: "draft" | "published" | "archived" | null;
}

interface AuthorOption {
  clerkId: string;
  name: string;
  role: string;
}

interface WordpressBackfillClientProps {
  posts: WordPressPostFeedItem[];
  authorOptions: AuthorOption[];
}

const CATEGORIES = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"] as const;

export default function WordpressBackfillClient({
  posts: initialPosts,
  authorOptions,
}: WordpressBackfillClientProps) {
  const router = useRouter();
  const [postsList, setPostsList] = useState<WordPressPostFeedItem[]>(initialPosts);
  const [selectedPost, setSelectedPost] = useState<WordPressPostFeedItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);

  // Form State
  const [aiAnalysis, setAiAnalysis] = useState<BackfillAnalysis | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedExcerpt, setEditedExcerpt] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    "COUNTRY" | "EDM" | "HARDCORE & ROCK" | "HIP-HOP & R&B" | "OTHER"
  >("OTHER");
  const [selectedAuthorId, setSelectedAuthorId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<"draft" | "published">("published");
  const [isCoverStory, setIsCoverStory] = useState(false);

  // Artist stub selection
  const [artistsToCreate, setArtistsToCreate] = useState<Record<string, boolean>>({});
  const [artistDetails, setArtistDetails] = useState<
    Record<
      string,
      {
        name: string;
        genre: "COUNTRY" | "EDM" | "HARDCORE & ROCK" | "HIP-HOP & R&B" | "OTHER";
        location: string;
        bio: string;
        spotifyUrl?: string;
        spotifyArtistId?: string;
        image?: string;
      }
    >
  >({});

  // Bulk / Sync states
  const [bulkAuthorId, setBulkAuthorId] = useState(
    findDefaultBackfillAuthorId(authorOptions, authorOptions[0]?.clerkId || ""),
  );
  const [bulkStatus, setBulkStatus] = useState<"draft" | "published">("published");
  const [bulkLimit, setBulkLimit] = useState(40);
  const [bulkOffset, setBulkOffset] = useState(0);
  const [isBulkStarting, setIsBulkStarting] = useState(false);
  const [isSyncingSpotify, setIsSyncingSpotify] = useState(false);
  const [isSyncingTags, setIsSyncingTags] = useState(false);
  const [isDedupeStarting, setIsDedupeStarting] = useState(false);

  // Background Runs States
  const [runs, setRuns] = useState<any[]>([]);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  const fetchRuns = async () => {
    try {
      const response = await fetch("/api/workflow/backfill/runs");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRuns(data.runs || []);
        }
      }
    } catch (error) {
      console.error("Failed to fetch backfill runs:", error);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  useEffect(() => {
    const hasRunning = runs.some((run) => run.status === "running");
    if (hasRunning) {
      const interval = setInterval(() => {
        fetchRuns();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [runs]);

  const handleBulkBackfill = async (source: "wordpress" | "local_drafts" = "wordpress") => {
    if (!bulkAuthorId) {
      toast.error("Please select an author for bulk backfill.");
      return;
    }
    setIsBulkStarting(true);
    const toastId = toast.loading(
      source === "local_drafts"
        ? "Starting local draft publishing workflow..."
        : "Starting WordPress backfill background workflow...",
    );
    try {
      const response = await fetch("/api/workflow/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          limit: bulkLimit,
          offset: bulkOffset,
          authorId: bulkAuthorId,
          status: source === "local_drafts" ? "published" : bulkStatus,
          source,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to start workflow");
      }

      toast.success(
        `Workflow started successfully! Run ID: ${data.runId}. Ingesting posts in the background...`,
        { id: toastId, duration: 8000 },
      );
      fetchRuns();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start bulk backfill", {
        id: toastId,
      });
    } finally {
      setIsBulkStarting(false);
    }
  };

  const handleSyncExistingArtistsSpotify = async () => {
    setIsSyncingSpotify(true);
    const toastId = toast.loading("Syncing Spotify details for existing database artists...");
    try {
      const result = await syncExistingArtistsSpotifyAction();
      if (result.success) {
        toast.success(
          `Sync completed! Checked ${result.total} artists. Matched and updated ${result.updatedCount} profiles.`,
          { id: toastId, duration: 8000 },
        );
        router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sync artists Spotify", {
        id: toastId,
      });
    } finally {
      setIsSyncingSpotify(false);
    }
  };

  const handleSyncPublishedTags = async () => {
    setIsSyncingTags(true);
    const toastId = toast.loading("Syncing WordPress tags for published imports...");
    try {
      const result = await syncPublishedWordPressTagsAction();
      if (result.success) {
        toast.success(
          `Tag sync completed! Checked ${result.total} WordPress posts, matched ${result.matchedCount}, updated ${result.updatedCount}.`,
          { id: toastId, duration: 8000 },
        );
        router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sync WordPress tags", {
        id: toastId,
      });
    } finally {
      setIsSyncingTags(false);
    }
  };

  const handleDedupe = async () => {
    setIsDedupeStarting(true);
    const toastId = toast.loading("Starting post deduplication & title decoding workflow...");
    try {
      const response = await fetch("/api/workflow/dedupe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to start workflow");
      }

      toast.success(
        `Workflow started successfully! Run ID: ${data.runId}. Running in the background...`,
        { id: toastId, duration: 8000 },
      );
      fetchRuns();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start deduplication", {
        id: toastId,
      });
    } finally {
      setIsDedupeStarting(false);
    }
  };

  const handleStartBackfill = async (post: WordPressPostFeedItem) => {
    setSelectedPost(post);
    setIsDrawerOpen(true);
    setAnalyzing(true);
    setAiAnalysis(null);

    // Setup initial details before AI response
    setEditedTitle(
      post.title.replaceAll("&#8217;", "'").replaceAll("&#8220;", '"').replaceAll("&#8221;", '"'),
    );
    setEditedExcerpt("");
    setIsCoverStory(false);

    // Find default author that matches "pettyvandalism"
    // Find default author that matches the post author slug
    const matchingAuthor = authorOptions.find(
      (opt) =>
        opt.clerkId.includes(post.authorSlug) ||
        opt.name.toLowerCase().includes(post.authorSlug.toLowerCase()),
    );
    setSelectedAuthorId(
      findDefaultBackfillAuthorId(
        authorOptions,
        matchingAuthor?.clerkId || authorOptions[0]?.clerkId || "",
      ),
    );
    setSelectedStatus(
      post.localStatus === "draft" || post.localStatus === "published"
        ? post.localStatus
        : "published",
    );

    try {
      const result = await analyzeWordPressPostAction(post.title, post.content);
      setAiAnalysis(result);
      setEditedExcerpt(result.excerpt);
      setSelectedCategory(result.category);

      // Pre-populate artist stub creation flags and details
      const initialToCreate: Record<string, boolean> = {};
      const initialDetails: typeof artistDetails = {};

      for (const artist of result.artistsMapping) {
        if (!artist.existingId) {
          initialToCreate[artist.name] = true;
          initialDetails[artist.name] = {
            bio: artist.bio,
            genre: artist.genre,
            location: artist.location || "Arkansas",
            name: artist.name,
            spotifyUrl: artist.spotifyUrl || "",
            spotifyArtistId: artist.spotifyArtistId || "",
            image: artist.spotifyImageUrl || "",
          };
        }
      }

      setArtistsToCreate(initialToCreate);
      setArtistDetails(initialDetails);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to run AI analysis");
      setIsDrawerOpen(false);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleArtistDetailChange = (
    artistName: string,
    field: "genre" | "location" | "bio" | "spotifyUrl" | "spotifyArtistId" | "image",
    value: string,
  ) => {
    setArtistDetails((previous) => {
      const existing = previous[artistName];
      if (!existing) {
        return previous;
      }
      return {
        ...previous,
        [artistName]: {
          ...existing,
          [field]: value,
        },
      };
    });
  };

  const handleImport = async () => {
    if (!selectedPost || !aiAnalysis) {
      return;
    }

    setImporting(true);
    const toastId = toast.loading(
      selectedPost.localStatus === "draft"
        ? "Updating post & mirroring images..."
        : "Backfilling post & mirroring images...",
    );

    try {
      // Gather linked artist IDs
      const selectedArtistIds = aiAnalysis.artistsMapping
        .filter((artist) => artist.existingId !== null)
        .map((artist) => artist.existingId as number);

      // Gather missing artists to create
      const newArtistsToCreate = Object.entries(artistsToCreate)
        .filter(([_, create]) => create)
        .map(([name]) => {
          const details = artistDetails[name];
          return {
            name: details?.name || name,
            genre: details?.genre || "OTHER",
            location: details?.location || "Arkansas",
            bio: details?.bio || "",
            spotifyUrl: details?.spotifyUrl || null,
            spotifyArtistId: details?.spotifyArtistId || null,
            image: details?.image || null,
          };
        });

      const payload = {
        authorId: selectedAuthorId,
        category: selectedCategory,
        contentHtml: selectedPost.content,
        coverImageUrl: selectedPost.coverImage,
        excerpt: editedExcerpt || selectedPost.excerpt,
        isCoverStory,
        newArtistsToCreate,
        rawCategories: selectedPost.rawCategories,
        selectedArtistIds,
        slug: selectedPost.authorSlug,
        sourceAuthorSlug: selectedPost.authorSlug,
        sourceModifiedAt: selectedPost.modified,
        sourcePublishedAt: selectedPost.date,
        sourceUrl: selectedPost.url,
        title: editedTitle,
        status: selectedStatus,
        tags: selectedPost.rawTags || [],
      };

      const result = await importWordPressPostAction(payload);

      if (result.success) {
        toast.success(
          selectedPost.localStatus === "draft"
            ? "Draft article backfilled and updated successfully!"
            : "Article backfilled successfully!",
          { id: toastId },
        );
        setIsDrawerOpen(false);

        // Update local status so it renders correctly
        setPostsList((previous) =>
          previous.map((p) =>
            p.url === selectedPost.url
              ? { ...p, importedPostId: result.postId, localStatus: selectedStatus }
              : p,
          ),
        );
        router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import article", {
        id: toastId,
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/posts">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-black">WordPress AI Backfill</h1>
            <p className="text-sm text-gray-400 mt-1">
              Analyze and import latest articles from deadpartymedia.wordpress.com using Gemini AI
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Bulk Backfill Card */}
        <Card className="p-6 border-gray-800 bg-[#141414] text-white space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#7CFC00]" />
            <h2 className="text-lg font-bold">Bulk Ingest Background Workflow</h2>
          </div>
          <p className="text-xs text-gray-400">
            Imports new WordPress posts and fully reprocesses imported drafts before publishing.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-gray-300">Default Writer</Label>
              <Select value={bulkAuthorId} onValueChange={setBulkAuthorId}>
                <SelectTrigger className="bg-black border-gray-800 text-xs">
                  <SelectValue placeholder="Select writer..." />
                </SelectTrigger>
                <SelectContent className="bg-[#111111] border-gray-800 text-xs">
                  {authorOptions.map((author) => (
                    <SelectItem key={author.clerkId} value={author.clerkId}>
                      {author.name} ({author.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-gray-300">Status</Label>
              <Select
                value={bulkStatus}
                onValueChange={(val: "draft" | "published") => setBulkStatus(val)}
              >
                <SelectTrigger className="bg-black border-gray-800 text-xs">
                  <SelectValue placeholder="Select status..." />
                </SelectTrigger>
                <SelectContent className="bg-[#111111] border-gray-800 text-xs">
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft (Unpublished)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="space-y-1">
              <Label className="text-xs text-gray-300">Limit</Label>
              <Input
                type="number"
                value={bulkLimit}
                onChange={(e) => setBulkLimit(Number.parseInt(e.target.value) || 40)}
                className="bg-black border-gray-800 text-xs h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-300">Offset</Label>
              <Input
                type="number"
                value={bulkOffset}
                onChange={(e) => setBulkOffset(Number.parseInt(e.target.value) || 0)}
                className="bg-black border-gray-800 text-xs h-9"
              />
            </div>
          </div>
          <Button
            className="w-full bg-[#7CFC00] hover:bg-[#7CFC00]/95 text-black font-bold text-xs py-2 h-9 gap-2 mt-2"
            disabled={isBulkStarting}
            onClick={() => handleBulkBackfill("wordpress")}
          >
            {isBulkStarting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Start Background Backfill
              </>
            )}
          </Button>
          <Button
            variant="outline"
            className="w-full border-[#7CFC00]/40 hover:bg-[#7CFC00]/10 text-white font-semibold text-xs py-2 h-9 gap-2"
            disabled={isBulkStarting}
            onClick={() => handleBulkBackfill("local_drafts")}
          >
            {isBulkStarting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 text-[#7CFC00]" />
                Publish Local Draft Imports
              </>
            )}
          </Button>
          <Button
            variant="outline"
            className="w-full border-blue-500/40 hover:bg-blue-500/10 text-white font-semibold text-xs py-2 h-9 gap-2"
            disabled={isSyncingTags}
            onClick={handleSyncPublishedTags}
          >
            {isSyncingTags ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5 text-blue-400" />
                Sync Published Tags
              </>
            )}
          </Button>
        </Card>

        {/* Sync Spotify Card */}
        <Card className="p-6 border-gray-800 bg-[#141414] text-white flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <h2 className="text-lg font-bold">Sync Existing Artists Spotify</h2>
            </div>
            <p className="text-sm text-gray-400">
              Scan all profiles in the database with missing Spotify connections, search Spotify,
              and automatically link their profile details and images.
            </p>
            <p className="text-xs text-gray-500">
              This will solve the issue for previously published articles where the created artist
              profile didn't get a Spotify link automatically.
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full border-gray-800 hover:bg-gray-900 text-white font-semibold text-xs py-2 h-9 gap-2 mt-4"
            disabled={isSyncingSpotify}
            onClick={handleSyncExistingArtistsSpotify}
          >
            {isSyncingSpotify ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                Sync Spotify Details
              </>
            )}
          </Button>
        </Card>

        {/* Deduplicate & Clean Titles Card */}
        <Card className="p-6 border-gray-800 bg-[#141414] text-white flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-indigo-400" />
              <h2 className="text-lg font-bold">Deduplicate & Decode Titles</h2>
            </div>
            <p className="text-sm text-gray-400">
              Scans all database posts, decodes HTML entities in titles (like quotes and
              apostrophes), and merges any duplicate posts created during backfill.
            </p>
            <p className="text-xs text-gray-500">
              This will merge comments, artist relations, reads, and saves, and clean up duplicate
              post records.
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full border-gray-800 hover:bg-gray-900 text-white font-semibold text-xs py-2 h-9 gap-2 mt-4"
            disabled={isDedupeStarting}
            onClick={handleDedupe}
          >
            {isDedupeStarting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5 text-indigo-400" />
                Deduplicate & Decode
              </>
            )}
          </Button>
        </Card>
      </div>

      {/* Background Workflow runs dashboard */}
      <Card className="p-6 border-gray-800 bg-[#141414] text-white space-y-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw
              className={`h-5 w-5 text-[#7CFC00] ${runs.some((r) => r.status === "running") ? "animate-spin" : ""}`}
            />
            <h2 className="text-lg font-bold">Background Workflow Logs & Status</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRuns}
            className="border-gray-800 hover:bg-gray-900 text-xs gap-1 text-white"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Button>
        </div>

        {runs.length === 0 ? (
          <div className="py-6 text-center text-gray-400 text-xs border border-dashed border-gray-800 rounded-lg">
            No background backfill runs recorded yet. Use the card above to start a background
            ingestion.
          </div>
        ) : (
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {runs.map((run) => {
              const percent =
                run.totalPosts > 0 ? Math.round((run.processedPosts / run.totalPosts) * 100) : 0;
              const isExpanded = expandedRunId === run.runId;
              const hasSpotify403 =
                Array.isArray(run.results) &&
                run.results.some(
                  (res: any) =>
                    (res.error &&
                      (res.error.includes("403") || res.error.toLowerCase().includes("spotify"))) ||
                    (res.warnings &&
                      res.warnings.some(
                        (w: any) => w.includes("403") || w.toLowerCase().includes("spotify"),
                      )),
                );

              return (
                <div
                  key={run.runId}
                  className="border border-gray-800 rounded-lg p-4 bg-black/40 space-y-3"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      {run.status === "running" ? (
                        <Badge className="bg-blue-900 text-blue-200 border-blue-800 animate-pulse gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Running
                        </Badge>
                      ) : run.status === "completed" ? (
                        <Badge className="bg-green-900 text-green-200 border-green-800">
                          Completed
                        </Badge>
                      ) : (
                        <Badge className="bg-red-900 text-red-200 border-red-800">Failed</Badge>
                      )}
                      <span className="text-xs font-mono text-gray-400">
                        ID: {run.runId.slice(0, 8)}...
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(run.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-300">
                        Progress: {run.processedPosts} / {run.totalPosts} ({percent}%)
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => setExpandedRunId(isExpanded ? null : run.runId)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-900 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        run.status === "failed"
                          ? "bg-red-600"
                          : run.status === "completed"
                            ? "bg-green-500"
                            : "bg-[#7CFC00]"
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  {/* Expanded Logs & Diagnostics */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-800 space-y-3">
                      {hasSpotify403 && (
                        <div className="p-3 bg-yellow-950/20 border border-yellow-800/40 rounded text-xs text-yellow-300 flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold">Spotify Web API 403 Forbidden Detected</p>
                            <p className="mt-0.5 text-gray-300">
                              Some artist profiles could not be linked because Spotify returned a
                              403 Forbidden. To fix this:
                            </p>
                            <ul className="list-disc list-inside mt-1 space-y-0.5 text-gray-400">
                              <li>
                                Verify your Spotify Client ID and Client Secret in
                                development/production environment config.
                              </li>
                              <li>
                                In your Spotify Developer Dashboard under application settings,
                                ensure the <strong>"Web API"</strong> option is enabled.
                              </li>
                              <li>
                                If your application is in development/sandbox mode, ensure the
                                accounts running this backfill are added as Team members or explicit
                                users, and have Spotify Premium.
                              </li>
                            </ul>
                          </div>
                        </div>
                      )}

                      <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1 text-xs">
                        <p className="font-bold text-gray-400 mb-1">Execution Log Details:</p>
                        {run.runId.startsWith("dedupe-") &&
                          run.results &&
                          typeof run.results === "object" &&
                          !Array.isArray(run.results) && (
                            <div className="text-indigo-300 font-semibold mb-2 bg-indigo-950/20 p-2 border border-indigo-900/40 rounded">
                              Decoded and cleaned up {(run.results as any).decodedTitlesCount || 0}{" "}
                              post titles!
                            </div>
                          )}
                        {(() => {
                          const resultsArray = Array.isArray(run.results)
                            ? run.results
                            : run.results &&
                                typeof run.results === "object" &&
                                Array.isArray((run.results as any).dedupeResults)
                              ? (run.results as any).dedupeResults
                              : [];

                          return resultsArray.length > 0 ? (
                            resultsArray.map((res: any, rIdx: number) => {
                              if (run.runId.startsWith("dedupe-")) {
                                return (
                                  <div
                                    key={rIdx}
                                    className="flex items-start gap-1.5 text-gray-300 py-0.5"
                                  >
                                    {res.status === "deduped" ? (
                                      <span className="text-indigo-400 font-bold">✓</span>
                                    ) : (
                                      <span className="text-red-500 font-bold">•</span>
                                    )}
                                    <div>
                                      Merged duplicate for:{" "}
                                      <span className="font-semibold text-gray-200">
                                        {res.dupeTitle}
                                      </span>
                                      {res.status === "error" && (
                                        <span className="text-red-400 ml-1">({res.error})</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              }

                              if (res.status === "error") {
                                return (
                                  <div
                                    key={rIdx}
                                    className="flex items-start gap-1.5 text-red-400 bg-red-950/10 p-1.5 rounded"
                                  >
                                    <span className="text-red-500 font-bold">•</span>
                                    <div>
                                      <span className="font-semibold">{res.title || "Post"}</span>:
                                      Failed - {res.error}
                                    </div>
                                  </div>
                                );
                              }
                              const isReprocessed = res.status?.startsWith("reprocessed_");
                              const isImported = res.status === "imported";

                              return (
                                <div
                                  key={rIdx}
                                  className="flex items-start gap-1.5 text-gray-300 py-0.5"
                                >
                                  {isImported ? (
                                    <span className="text-green-500 font-bold">✓</span>
                                  ) : isReprocessed ? (
                                    <span className="text-blue-400 font-bold">ℹ</span>
                                  ) : (
                                    <span className="text-gray-500 font-bold">•</span>
                                  )}
                                  <div>
                                    <span className="font-semibold text-gray-200">{res.title}</span>
                                    :{" "}
                                    {isImported ? (
                                      <span className="text-green-400">
                                        Successfully imported (ID: {res.postId})
                                      </span>
                                    ) : isReprocessed ? (
                                      <span className="text-blue-400">
                                        Reprocessed with AI and set to {bulkStatus} (ID:{" "}
                                        {res.postId})
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">
                                        Already published, skipped AI rewrite
                                      </span>
                                    )}
                                    {res.updatedArtistsCount > 0 && (
                                      <span className="text-xs text-gray-500 ml-1">
                                        ({res.updatedArtistsCount} Spotify artists updated)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-gray-500 italic">
                              No logs recorded yet. Ingestion starting...
                            </p>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="overflow-hidden rounded-lg border border-gray-800 bg-[#111111]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-[#0A0A0A]">
              <TableRow className="border-gray-800 hover:bg-transparent">
                <TableHead className="text-gray-300 font-bold">Title</TableHead>
                <TableHead className="text-gray-300 font-bold">Original Writer</TableHead>
                <TableHead className="text-gray-300 font-bold">Published Date</TableHead>
                <TableHead className="text-gray-300 font-bold text-center">Status</TableHead>
                <TableHead className="text-gray-300 font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {postsList.length === 0 ? (
                <TableRow className="border-gray-800">
                  <TableCell colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    No articles fetched from WordPress feed.
                  </TableCell>
                </TableRow>
              ) : (
                postsList.map((post, index) => {
                  const isDraft = post.localStatus === "draft";
                  const isPublished = post.localStatus === "published";
                  const isNewest = index === 0;

                  return (
                    <TableRow key={post.id} className="border-gray-800 hover:bg-gray-900/40">
                      <TableCell className="px-6 py-4 max-w-md">
                        <div className="font-bold flex items-center gap-2">
                          <span className="truncate">
                            {post.title
                              .replaceAll("&#8217;", "'")
                              .replaceAll("&#8220;", '"')
                              .replaceAll("&#8221;", '"')}
                          </span>
                          {isNewest && (
                            <Badge className="bg-red-950/80 text-red-400 border border-red-800 text-[10px] py-0 px-1.5 font-bold uppercase shrink-0">
                              Latest / Featured Candidate
                            </Badge>
                          )}
                          <a
                            href={post.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-500 hover:text-white transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-gray-400">
                        {post.authorName} ({post.authorSlug})
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-gray-400">
                        {new Date(post.date).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-center">
                        {isPublished ? (
                          <Badge className="bg-green-950/80 text-green-400 border border-green-800 hover:bg-green-950/80">
                            Published
                          </Badge>
                        ) : isDraft ? (
                          <Badge className="bg-yellow-950/80 text-yellow-400 border border-yellow-800 hover:bg-yellow-950/80">
                            Draft (Unpublished)
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-gray-800 text-gray-400 hover:bg-gray-800"
                          >
                            Not Imported
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        {isPublished ? (
                          <Link href={`/admin/posts/${post.importedPostId}`}>
                            <Button variant="outline" size="sm" className="gap-2">
                              <BookOpen className="h-3.5 w-3.5" />
                              Edit Post
                            </Button>
                          </Link>
                        ) : isDraft ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              className="bg-yellow-600 hover:bg-yellow-700 text-white gap-2 font-semibold"
                              onClick={() => handleStartBackfill(post)}
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              Backfill with AI
                            </Button>
                            <Link href={`/admin/posts/${post.importedPostId}`}>
                              <Button variant="outline" size="sm" className="gap-2">
                                <BookOpen className="h-3.5 w-3.5" />
                                Edit Post
                              </Button>
                            </Link>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            className="bg-red-500 hover:bg-red-600 text-white gap-2 font-semibold"
                            onClick={() => handleStartBackfill(post)}
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            Backfill with AI
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Side Slide Drawer for Reviewing Backfill */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto bg-[#0A0A0A] border-l border-gray-800 text-white p-6">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-2xl font-black text-white flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-red-500" />
              AI Backfill Preview
            </SheetTitle>
            <SheetDescription className="text-gray-400">
              Review AI analysis results and customize your article configuration.
            </SheetDescription>
          </SheetHeader>

          {analyzing ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-red-500" />
              <p className="text-sm text-gray-400 font-medium animate-pulse">
                Gemini is reading and analyzing the post content...
              </p>
            </div>
          ) : (
            aiAnalysis && (
              <div className="space-y-6">
                {/* Basic Metadata */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-red-500">
                    Post Details
                  </h3>
                  <div className="space-y-2">
                    <Label htmlFor="backfill-title">Title</Label>
                    <Input
                      id="backfill-title"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="bg-[#111111] border-gray-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="backfill-excerpt">Excerpt (AI Summary)</Label>
                    <Textarea
                      id="backfill-excerpt"
                      value={editedExcerpt}
                      onChange={(e) => setEditedExcerpt(e.target.value)}
                      className="bg-[#111111] border-gray-800 h-24"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="backfill-category">Category</Label>
                      <Select
                        value={selectedCategory}
                        onValueChange={(value: any) => setSelectedCategory(value)}
                      >
                        <SelectTrigger className="bg-[#111111] border-gray-800">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#111111] border-gray-800">
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="backfill-author">Assigned Writer</Label>
                      <Select value={selectedAuthorId} onValueChange={setSelectedAuthorId}>
                        <SelectTrigger className="bg-[#111111] border-gray-800">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#111111] border-gray-800">
                          {authorOptions.map((opt) => (
                            <SelectItem key={opt.clerkId} value={opt.clerkId}>
                              {opt.name} ({opt.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="backfill-status">Publish Status</Label>
                      <Select
                        value={selectedStatus}
                        onValueChange={(value: any) => setSelectedStatus(value)}
                      >
                        <SelectTrigger className="bg-[#111111] border-gray-800">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#111111] border-gray-800">
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="draft">Draft (Unpublished)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-2 border-t border-gray-900">
                    <Checkbox
                      id="backfill-featured"
                      checked={isCoverStory}
                      onCheckedChange={(checked) => setIsCoverStory(checked === true)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label
                        htmlFor="backfill-featured"
                        className="cursor-pointer font-bold text-sm"
                      >
                        Set as Featured Cover Story
                      </Label>
                      <p className="text-xs text-gray-500">
                        Warning: This will unset all other active featured stories.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Artists Section */}
                <div className="space-y-4 pt-4 border-t border-gray-800">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-red-500">
                    Featured Artists (AI Detected)
                  </h3>

                  {aiAnalysis.artistsMapping.length === 0 ? (
                    <div className="p-4 rounded-lg bg-gray-950 border border-gray-900 text-center text-sm text-gray-400">
                      No specific music artists were detected in this post.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {aiAnalysis.artistsMapping.map((artist) => {
                        const isExisting = artist.existingId !== null;

                        return (
                          <Card
                            key={artist.name}
                            className="bg-[#111111] border-gray-800 p-4 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white text-base">{artist.name}</span>
                              {isExisting ? (
                                <Badge className="bg-green-950/80 text-green-400 border border-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Already in DB
                                </Badge>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`create-${artist.name}`}
                                    checked={artistsToCreate[artist.name] || false}
                                    onCheckedChange={(checked) =>
                                      setArtistsToCreate((previous) => ({
                                        ...previous,
                                        [artist.name]: checked === true,
                                      }))
                                    }
                                  />
                                  <Label
                                    htmlFor={`create-${artist.name}`}
                                    className="text-xs text-gray-400 cursor-pointer"
                                  >
                                    Auto-create profile
                                  </Label>
                                </div>
                              )}
                            </div>

                            {/* Editable stub info for new artists */}
                            {!isExisting && artistsToCreate[artist.name] && (
                              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-900 text-xs">
                                <div className="space-y-1.5">
                                  <Label className="text-gray-400">Genre</Label>
                                  <Select
                                    value={artistDetails[artist.name]?.genre || artist.genre}
                                    onValueChange={(val: any) =>
                                      handleArtistDetailChange(artist.name, "genre", val)
                                    }
                                  >
                                    <SelectTrigger className="h-8 bg-[#0A0A0A] border-gray-800 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#0A0A0A] border-gray-800">
                                      {CATEGORIES.map((cat) => (
                                        <SelectItem key={cat} value={cat} className="text-xs">
                                          {cat}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-gray-400">Location</Label>
                                  <Input
                                    value={
                                      artistDetails[artist.name]?.location ??
                                      artist.location ??
                                      "Arkansas"
                                    }
                                    onChange={(e) =>
                                      handleArtistDetailChange(
                                        artist.name,
                                        "location",
                                        e.target.value,
                                      )
                                    }
                                    className="h-8 bg-[#0A0A0A] border-gray-800 text-xs"
                                  />
                                </div>
                                <div className="col-span-2 space-y-1.5">
                                  <Label className="text-gray-400">
                                    Spotify Search / Integration
                                  </Label>
                                  <SpotifySearch
                                    value={artistDetails[artist.name]?.spotifyUrl || ""}
                                    onSelect={(spotifyArtist: SpotifyArtist) => {
                                      handleArtistDetailChange(
                                        artist.name,
                                        "spotifyUrl",
                                        spotifyArtist.external_urls.spotify || "",
                                      );
                                      handleArtistDetailChange(
                                        artist.name,
                                        "spotifyArtistId",
                                        spotifyArtist.id,
                                      );
                                      if (spotifyArtist.images && spotifyArtist.images.length > 0) {
                                        handleArtistDetailChange(
                                          artist.name,
                                          "image",
                                          spotifyArtist.images[0].url,
                                        );
                                      }
                                    }}
                                  />
                                </div>
                                <div className="col-span-2 space-y-1.5">
                                  <Label className="text-gray-400">AI Generated Bio</Label>
                                  <Textarea
                                    value={artistDetails[artist.name]?.bio || artist.bio}
                                    onChange={(e) =>
                                      handleArtistDetailChange(artist.name, "bio", e.target.value)
                                    }
                                    className="bg-[#0A0A0A] border-gray-800 text-xs h-16"
                                  />
                                </div>
                              </div>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>

                <SheetFooter className="mt-8 border-t border-gray-800 pt-6">
                  <div className="flex gap-4 w-full">
                    <Button
                      variant="outline"
                      className="flex-1 border-gray-800 hover:text-white"
                      disabled={importing}
                      onClick={() => setIsDrawerOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold"
                      disabled={importing}
                      onClick={handleImport}
                    >
                      {importing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Importing...
                        </>
                      ) : selectedPost?.localStatus === "draft" ? (
                        "Update & Re-publish Post"
                      ) : (
                        "Import & Publish Post"
                      )}
                    </Button>
                  </div>
                </SheetFooter>
              </div>
            )
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
