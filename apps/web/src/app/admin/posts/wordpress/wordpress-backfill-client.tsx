"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, ArrowLeft, ExternalLink, Loader2, CheckCircle, BookOpen } from "lucide-react";
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
import { analyzeWordPressPostAction, importWordPressPostAction } from "./actions";
import type { BackfillAnalysis } from "./actions";

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
  importedPostId: number | null;
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
      }
    >
  >({});

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

    // Find default author that matches the post author slug
    const matchingAuthor = authorOptions.find(
      (opt) =>
        opt.clerkId.includes(post.authorSlug) ||
        opt.name.toLowerCase().includes(post.authorSlug.toLowerCase()),
    );
    setSelectedAuthorId(matchingAuthor?.clerkId || authorOptions[0]?.clerkId || "");

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
    field: "genre" | "location" | "bio",
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
    const toastId = toast.loading("Backfilling post & mirroring images...");

    try {
      // Gather linked artist IDs
      const selectedArtistIds = aiAnalysis.artistsMapping
        .filter((artist) => artist.existingId !== null)
        .map((artist) => artist.existingId as number);

      // Gather missing artists to create
      const newArtistsToCreate = Object.entries(artistsToCreate)
        .filter(([_, create]) => create)
        .map(([name]) => artistDetails[name])
        .filter((details): details is NonNullable<typeof details> => details !== undefined);

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
      };

      const result = await importWordPressPostAction(payload);

      if (result.success) {
        toast.success("Article backfilled successfully!", { id: toastId });
        setIsDrawerOpen(false);

        // Update local status so it renders as Imported
        setPostsList((previous) =>
          previous.map((p) =>
            p.url === selectedPost.url ? { ...p, importedPostId: result.postId } : p,
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
                postsList.map((post) => {
                  const isImported = post.importedPostId !== null;

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
                        {isImported ? (
                          <Badge className="bg-green-950/80 text-green-400 border border-green-800 hover:bg-green-950/80">
                            Imported
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
                        {isImported ? (
                          <Link href={`/admin/posts/${post.importedPostId}`}>
                            <Button variant="outline" size="sm" className="gap-2">
                              <BookOpen className="h-3.5 w-3.5" />
                              Edit Post
                            </Button>
                          </Link>
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
