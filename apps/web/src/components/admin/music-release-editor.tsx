"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import FileHandler from "@tiptap/extension-file-handler";
import Link from "@tiptap/extension-link";
import { useMemo, useState, useRef, useEffect } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useArtists } from "@/lib/api/artists";
import type { Artist } from "@/lib/api/artists";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  X,
  Upload,
  ArrowLeft,
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Unlink,
  Undo2,
  Redo2,
} from "lucide-react";
import { toast } from "sonner";
import NextImage from "next/image";
import { validateImageFile } from "@/lib/upload";
import type { Route } from "next";
import { normalizeStoredPostContent } from "@/lib/content/post-content";
import { getErrorMessage, isNextRedirectError } from "@/lib/utils/error";
import { useUnsavedChangesGuard } from "./use-unsaved-changes-guard";

interface AuthorOption {
  clerkId: string;
  name: string;
  role: string;
}

interface CreateAuthorStubResult {
  success: boolean;
  error?: string;
  profile?: {
    clerkId: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    role: string;
  };
}

interface CreateArtistStubResult {
  success: boolean;
  error?: string;
  artist?: {
    id: number;
    name: string;
    genre: string;
    location: string;
    email: string | null;
  };
}

interface MusicReleaseEditorProps {
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
    authorId?: string;
  };
  authorOptions?: AuthorOption[];
  canManageAuthor?: boolean;
  onCreateAuthorStub?: (formData: FormData) => Promise<CreateAuthorStubResult>;
  onCreateArtistStub?: (formData: FormData) => Promise<CreateArtistStubResult>;
  onSubmit: (formData: FormData) => void | Promise<unknown>;
  cancelHref: Route;
  allowCoverImageUrl?: boolean;
  isSubmitting?: boolean;
}

const genres = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"] as const;
const releaseTypes = ["Single", "Album", "EP"] as const;

function LinkButton({ editor }: { editor: any }) {
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      const currentUrl = editor?.getAttributes("link").href || "";
      setUrl(currentUrl);
    }
  }, [open, editor]);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    let formattedUrl = url.trim();
    if (!formattedUrl) {
      editor?.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = `https://${formattedUrl}`;
      }
      editor?.chain().focus().extendMarkRange("link").setLink({ href: formattedUrl }).run();
    }
    setOpen(false);
  };

  const handleRemove = () => {
    editor?.chain().focus().extendMarkRange("link").unsetLink().run();
    setOpen(false);
  };

  const isActive = editor?.isActive("link");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 text-zinc-400 hover:text-white ${
            isActive ? "bg-zinc-800 text-white" : ""
          }`}
          title="Add Link"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3 bg-zinc-900 border-zinc-800" align="start">
        <form onSubmit={handleApply} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="link-url" className="text-xs text-zinc-400">
              Link URL
            </Label>
            <Input
              id="link-url"
              type="text"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="h-8 text-sm bg-zinc-800 border-zinc-700 text-white"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            {isActive && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleRemove}
              >
                <Unlink className="h-3 w-3 mr-1" />
                Remove
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-zinc-400 hover:text-white"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-7 px-2 text-xs bg-[#7CFC00] text-black hover:bg-[#7CFC00]/90"
            >
              Apply
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

export function MusicReleaseEditor({
  initialData,
  authorOptions = [],
  canManageAuthor = false,
  onCreateAuthorStub,
  onCreateArtistStub,
  onSubmit,
  cancelHref,
  allowCoverImageUrl = true,
  isSubmitting = false,
}: MusicReleaseEditorProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [artistName, setArtistName] = useState(initialData?.artistName || "");
  const [selectedArtistId, setSelectedArtistId] = useState<number | null>(
    initialData?.artistId ?? null,
  );
  const [releaseType, setReleaseType] = useState<"Album" | "Single" | "EP">(
    initialData?.releaseType || "Single",
  );
  const [genre, setGenre] = useState(initialData?.genre || "HARDCORE & ROCK");
  const [releaseDate, setReleaseDate] = useState(initialData?.releaseDate || "");
  const [excerpt, setExcerpt] = useState(initialData?.excerpt || "");
  const [coverArt, setCoverArt] = useState(initialData?.coverArt || "");
  const [status, setStatus] = useState<"draft" | "published" | "archived">(
    initialData?.status || "published",
  );
  const [featured, setFeatured] = useState(initialData?.featured || false);
  const [selectedAuthorId, setSelectedAuthorId] = useState(initialData?.authorId || "");
  const [availableAuthors, setAvailableAuthors] = useState<AuthorOption[]>(authorOptions);

  const [useCoverArtUrl, setUseCoverArtUrl] = useState(Boolean(initialData?.coverArt));
  const [coverArtUploading, setCoverArtUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Quick-create author state
  const [authorPopoverOpen, setAuthorPopoverOpen] = useState(false);
  const [newAuthorName, setNewAuthorName] = useState("");
  const [newAuthorEmail, setNewAuthorEmail] = useState("");
  const [creatingAuthor, setCreatingAuthor] = useState(false);

  // Quick-create artist state
  const [artistPopoverOpen, setArtistPopoverOpen] = useState(false);
  const [newArtistName, setNewArtistName] = useState("");
  const [newArtistLocation, setNewArtistLocation] = useState("");
  const [newArtistGenre, setNewArtistGenre] = useState<Artist["genre"]>("OTHER");
  const [creatingArtist, setCreatingArtist] = useState(false);
  const [createdArtists, setCreatedArtists] = useState<Artist[]>([]);

  const { data: dbArtists = [] } = useArtists();
  const allArtists = useMemo(() => {
    const combined = [...dbArtists, ...createdArtists];
    const map = new Map<number, Artist>();
    for (const a of combined) {
      map.set(a.id, a);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [dbArtists, createdArtists]);

  // Sync author list
  useEffect(() => {
    if (authorOptions.length > 0) {
      setAvailableAuthors((prev) => {
        const merged = [...authorOptions];
        for (const p of prev) {
          if (!merged.some((m) => m.clerkId === p.clerkId)) {
            merged.push(p);
          }
        }
        return merged;
      });
    }
  }, [authorOptions]);

  // Setup TipTap editor
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "rounded-lg max-w-full h-auto my-4",
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-[#7CFC00] underline underline-offset-4 hover:opacity-80",
        },
      }),
      FileHandler.configure({
        allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
        onDrop: (currentEditor, files, pos) => {
          for (const file of files) {
            handleInlineImageUpload(file, pos, currentEditor);
          }
        },
        onPaste: (currentEditor, files) => {
          for (const file of files) {
            handleInlineImageUpload(file, undefined, currentEditor);
          }
        },
      }),
    ],
    content: normalizeStoredPostContent(initialData?.content ?? "") || "",
    editorProps: {
      attributes: {
        class:
          "prose prose-invert max-w-none focus:outline-none min-h-[350px] px-4 py-3 text-zinc-100 placeholder:text-zinc-600",
      },
    },
  });

  const handleInlineImageUpload = async (file: File, position?: number, editorInstance?: any) => {
    const targetEditor = editorInstance || editor;
    if (!targetEditor) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid image file");
      return;
    }

    const loadingId = toast.loading("Uploading image...");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload/image?type=content", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const { url } = await response.json();
      targetEditor.chain().focus().setImage({ src: url }).run();
      toast.dismiss(loadingId);
      toast.success("Image uploaded successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload image");
    }
  };

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

      const response = await fetch("/api/upload/image?type=cover", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload cover art");
      }

      const { url } = await response.json();
      setCoverArt(url);
      setUseCoverArtUrl(false);
      toast.success("Cover art uploaded successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload cover art");
    } finally {
      toast.dismiss(loadingId);
      setCoverArtUploading(false);
    }
  };

  const handleCreateAuthorStub = async () => {
    if (!onCreateAuthorStub) return;
    const displayName = newAuthorName.trim();
    if (!displayName) {
      toast.error("Author name is required");
      return;
    }

    setCreatingAuthor(true);
    try {
      const formData = new FormData();
      formData.append("displayName", displayName);
      formData.append("role", "writer");
      if (newAuthorEmail.trim()) {
        formData.append("email", newAuthorEmail.trim());
      }

      const result = await onCreateAuthorStub(formData);
      if (!result.success || !result.profile) {
        toast.error(result.error || "Failed to create author");
        return;
      }

      const profile = result.profile;
      const name =
        [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() || profile.email;

      setAvailableAuthors((prev) => [
        ...prev,
        { clerkId: profile.clerkId, name, role: profile.role },
      ]);
      setSelectedAuthorId(profile.clerkId);
      setNewAuthorName("");
      setNewAuthorEmail("");
      setAuthorPopoverOpen(false);
      toast.success("Author created successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create author");
    } finally {
      setCreatingAuthor(false);
    }
  };

  const handleCreateArtistStub = async () => {
    if (!onCreateArtistStub) return;
    const name = newArtistName.trim();
    if (!name) {
      toast.error("Artist name is required");
      return;
    }

    setCreatingArtist(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("genre", newArtistGenre);
      formData.append("location", newArtistLocation.trim() || "Arkansas");

      const result = await onCreateArtistStub(formData);
      if (!result.success || !result.artist) {
        toast.error(result.error || "Failed to create artist");
        return;
      }

      const artist = result.artist;
      const createdStub: Artist = {
        article_count: 0,
        bio: "Profile pending update.",
        claimed: false,
        created_at: new Date().toISOString(),
        event_count: 0,
        genre: artist.genre as Artist["genre"],
        hidden: false,
        id: artist.id,
        image: null,
        instagram: null,
        location: artist.location,
        name: artist.name,
        profile_views: 0,
        slug: "",
        spotify_artist_id: null,
        spotify_url: null,
        tiktok: null,
        twitter: null,
        website: null,
      };

      setCreatedArtists((prev) => [...prev, createdStub]);
      setSelectedArtistId(artist.id);
      setArtistName(artist.name);
      setNewArtistName("");
      setNewArtistLocation("");
      setArtistPopoverOpen(false);
      toast.success("Artist profile created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create artist");
    } finally {
      setCreatingArtist(false);
    }
  };

  const isDirty = useMemo(() => {
    return (
      title !== (initialData?.title || "") ||
      slug !== (initialData?.slug || "") ||
      artistName !== (initialData?.artistName || "") ||
      selectedArtistId !== (initialData?.artistId ?? null) ||
      releaseType !== (initialData?.releaseType || "Single") ||
      genre !== (initialData?.genre || "HARDCORE & ROCK") ||
      releaseDate !== (initialData?.releaseDate || "") ||
      coverArt !== (initialData?.coverArt || "") ||
      excerpt !== (initialData?.excerpt || "") ||
      status !== (initialData?.status || "published") ||
      featured !== (initialData?.featured || false) ||
      selectedAuthorId !== (initialData?.authorId || "")
    );
  }, [
    title,
    slug,
    artistName,
    selectedArtistId,
    releaseType,
    genre,
    releaseDate,
    coverArt,
    excerpt,
    status,
    featured,
    selectedAuthorId,
    initialData,
  ]);

  const { UnsavedChangesDialog, navigateAway } = useUnsavedChangesGuard(isDirty, cancelHref);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!artistName.trim()) {
      toast.error("Artist name is required (select or enter an artist)");
      return;
    }
    if (!excerpt.trim()) {
      toast.error("Excerpt summary is required");
      return;
    }

    setIsSaving(true);
    const formData = new FormData();
    formData.append("title", title);
    formData.append("slug", slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
    formData.append("artistName", artistName);
    if (selectedArtistId) {
      formData.append("artistId", String(selectedArtistId));
    }
    formData.append("releaseType", releaseType);
    formData.append("genre", genre);
    formData.append("releaseDate", releaseDate);
    formData.append("excerpt", excerpt);
    formData.append("content", JSON.stringify(editor?.getJSON() || {}));
    formData.append("coverArt", coverArt);
    formData.append("status", status);
    formData.append("featured", String(featured));
    if (canManageAuthor && selectedAuthorId) {
      formData.append("authorId", selectedAuthorId);
    }

    try {
      await onSubmit(formData);
      toast.success(
        initialData?.id ? "Release updated successfully" : "Release created successfully",
      );
    } catch (error) {
      if (isNextRedirectError(error)) {
        return;
      }
      toast.error(getErrorMessage(error, "Failed to save release"));
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
          Back to Music Releases
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-zinc-950 border-zinc-800">
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label htmlFor="title" className="text-zinc-200">
                  Release / Article Title *
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Model Prisoner Drops Ferocious New EP"
                  required
                  className="mt-1 bg-zinc-900 border-zinc-800 text-white text-lg font-bold"
                />
              </div>

              <div>
                <Label htmlFor="slug" className="text-zinc-400 text-xs">
                  URL Slug
                </Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="Auto-generated from title"
                  className="mt-1 bg-zinc-900 border-zinc-800 text-zinc-300 font-mono text-xs"
                />
              </div>

              <div>
                <Label htmlFor="excerpt" className="text-zinc-200">
                  Excerpt Summary *
                </Label>
                <Textarea
                  id="excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="A brief 1-2 sentence overview of the release and sound..."
                  required
                  rows={3}
                  className="mt-1 bg-zinc-900 border-zinc-800 text-zinc-300"
                />
              </div>

              {/* Rich Text Editor for Body */}
              <div className="space-y-2">
                <Label className="text-zinc-200">Article Content &amp; Media Links</Label>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
                  {/* Toolbar */}
                  <div className="flex flex-wrap items-center gap-1 p-2 border-b border-zinc-800 bg-zinc-950/60">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor?.chain().focus().toggleBold().run()}
                      className={`h-8 w-8 p-0 text-zinc-400 hover:text-white ${
                        editor?.isActive("bold") ? "bg-zinc-800 text-white" : ""
                      }`}
                    >
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor?.chain().focus().toggleItalic().run()}
                      className={`h-8 w-8 p-0 text-zinc-400 hover:text-white ${
                        editor?.isActive("italic") ? "bg-zinc-800 text-white" : ""
                      }`}
                    >
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor?.chain().focus().toggleStrike().run()}
                      className={`h-8 w-8 p-0 text-zinc-400 hover:text-white ${
                        editor?.isActive("strike") ? "bg-zinc-800 text-white" : ""
                      }`}
                    >
                      <Strikethrough className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor?.chain().focus().toggleCode().run()}
                      className={`h-8 w-8 p-0 text-zinc-400 hover:text-white ${
                        editor?.isActive("code") ? "bg-zinc-800 text-white" : ""
                      }`}
                    >
                      <Code className="h-4 w-4" />
                    </Button>
                    <div className="h-4 w-px bg-zinc-800 mx-1" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                      className={`h-8 w-8 p-0 text-zinc-400 hover:text-white ${
                        editor?.isActive("heading", { level: 2 }) ? "bg-zinc-800 text-white" : ""
                      }`}
                    >
                      <Heading2 className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                      className={`h-8 w-8 p-0 text-zinc-400 hover:text-white ${
                        editor?.isActive("heading", { level: 3 }) ? "bg-zinc-800 text-white" : ""
                      }`}
                    >
                      <Heading3 className="h-4 w-4" />
                    </Button>
                    <div className="h-4 w-px bg-zinc-800 mx-1" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor?.chain().focus().toggleBulletList().run()}
                      className={`h-8 w-8 p-0 text-zinc-400 hover:text-white ${
                        editor?.isActive("bulletList") ? "bg-zinc-800 text-white" : ""
                      }`}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                      className={`h-8 w-8 p-0 text-zinc-400 hover:text-white ${
                        editor?.isActive("orderedList") ? "bg-zinc-800 text-white" : ""
                      }`}
                    >
                      <ListOrdered className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                      className={`h-8 w-8 p-0 text-zinc-400 hover:text-white ${
                        editor?.isActive("blockquote") ? "bg-zinc-800 text-white" : ""
                      }`}
                    >
                      <Quote className="h-4 w-4" />
                    </Button>
                    <div className="h-4 w-px bg-zinc-800 mx-1" />
                    <LinkButton editor={editor} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = "image/*";
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) handleInlineImageUpload(file);
                        };
                        input.click();
                      }}
                      className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
                      title="Insert Image"
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                    <div className="h-4 w-px bg-zinc-800 mx-1" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor?.chain().focus().undo().run()}
                      disabled={!editor?.can().undo()}
                      className="h-8 w-8 p-0 text-zinc-400 hover:text-white disabled:opacity-30"
                    >
                      <Undo2 className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor?.chain().focus().redo().run()}
                      disabled={!editor?.can().redo()}
                      className="h-8 w-8 p-0 text-zinc-400 hover:text-white disabled:opacity-30"
                    >
                      <Redo2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Editor Content Area */}
                  <EditorContent editor={editor} />
                </div>
                <p className="text-xs text-zinc-500">
                  Tip: Paste streaming links, Bandcamp URLs, or audio players directly into the text
                  body.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* Release Specs Card */}
          <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-zinc-200">Publication Specs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="status" className="text-xs text-zinc-400">
                  Status
                </Label>
                <Select
                  value={status}
                  onValueChange={(val: "draft" | "published" | "archived") => setStatus(val)}
                >
                  <SelectTrigger id="status" className="mt-1 bg-zinc-900 border-zinc-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="releaseType" className="text-xs text-zinc-400">
                  Release Format
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
                  Genre
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

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="featured"
                  checked={featured}
                  onCheckedChange={(checked) => setFeatured(Boolean(checked))}
                />
                <Label htmlFor="featured" className="text-xs text-zinc-300 cursor-pointer">
                  Feature in homepage music showcase
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Artist Card */}
          <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base text-zinc-200">Artist Profile</CardTitle>
              {onCreateArtistStub && (
                <Popover open={artistPopoverOpen} onOpenChange={setArtistPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs text-[#7CFC00] hover:text-[#7CFC00]/80 h-auto p-0"
                    >
                      + Quick Add
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4 bg-zinc-900 border-zinc-800" align="end">
                    <div className="space-y-3">
                      <h4 className="font-bold text-sm text-white">Create Artist Profile</h4>
                      <div>
                        <Label htmlFor="new-artist-name" className="text-xs text-zinc-400">
                          Artist Name *
                        </Label>
                        <Input
                          id="new-artist-name"
                          value={newArtistName}
                          onChange={(e) => setNewArtistName(e.target.value)}
                          placeholder="e.g. Model Prisoner"
                          className="mt-1 h-8 text-sm bg-zinc-800 border-zinc-700"
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-artist-location" className="text-xs text-zinc-400">
                          Location
                        </Label>
                        <Input
                          id="new-artist-location"
                          value={newArtistLocation}
                          onChange={(e) => setNewArtistLocation(e.target.value)}
                          placeholder="Little Rock, AR"
                          className="mt-1 h-8 text-sm bg-zinc-800 border-zinc-700"
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-artist-genre" className="text-xs text-zinc-400">
                          Genre
                        </Label>
                        <Select
                          value={newArtistGenre}
                          onValueChange={(val: Artist["genre"]) => setNewArtistGenre(val)}
                        >
                          <SelectTrigger
                            id="new-artist-genre"
                            className="mt-1 h-8 bg-zinc-800 border-zinc-700"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-800 border-zinc-700">
                            {genres.map((g) => (
                              <SelectItem key={g} value={g}>
                                {g}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setArtistPopoverOpen(false)}
                          className="h-7 text-xs text-zinc-400"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleCreateArtistStub}
                          disabled={creatingArtist}
                          className="h-7 text-xs bg-[#7CFC00] text-black font-bold"
                        >
                          {creatingArtist ? "Creating..." : "Create Artist"}
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="artist-select" className="text-xs text-zinc-400">
                  Select Existing Artist
                </Label>
                <Select
                  value={selectedArtistId ? String(selectedArtistId) : "custom"}
                  onValueChange={(val) => {
                    if (val === "custom") {
                      setSelectedArtistId(null);
                    } else {
                      const id = Number(val);
                      const art = allArtists.find((a) => a.id === id);
                      if (art) {
                        setSelectedArtistId(id);
                        setArtistName(art.name);
                        if (art.genre) setGenre(art.genre);
                      }
                    }
                  }}
                >
                  <SelectTrigger id="artist-select" className="mt-1 bg-zinc-900 border-zinc-800">
                    <SelectValue placeholder="Choose an artist" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 max-h-60">
                    <SelectItem value="custom">Enter custom name below</SelectItem>
                    {allArtists.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.name} ({a.genre})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="artistName" className="text-xs text-zinc-400">
                  Artist Display Name *
                </Label>
                <Input
                  id="artistName"
                  value={artistName}
                  onChange={(e) => {
                    setArtistName(e.target.value);
                    setSelectedArtistId(null);
                  }}
                  placeholder="Artist or Band Name"
                  required
                  className="mt-1 bg-zinc-900 border-zinc-800 text-white"
                />
              </div>
            </CardContent>
          </Card>

          {/* Author Card (Super Admin) */}
          {canManageAuthor && (
            <Card className="bg-zinc-950 border-zinc-800">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base text-zinc-200">Writer / Author</CardTitle>
                {onCreateAuthorStub && (
                  <Popover open={authorPopoverOpen} onOpenChange={setAuthorPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs text-[#7CFC00] hover:text-[#7CFC00]/80 h-auto p-0"
                      >
                        + Quick Add
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-4 bg-zinc-900 border-zinc-800" align="end">
                      <div className="space-y-3">
                        <h4 className="font-bold text-sm text-white">Create Writer</h4>
                        <div>
                          <Label htmlFor="new-author-name" className="text-xs text-zinc-400">
                            Name *
                          </Label>
                          <Input
                            id="new-author-name"
                            value={newAuthorName}
                            onChange={(e) => setNewAuthorName(e.target.value)}
                            placeholder="Writer Name"
                            className="mt-1 h-8 text-sm bg-zinc-800 border-zinc-700"
                          />
                        </div>
                        <div>
                          <Label htmlFor="new-author-email" className="text-xs text-zinc-400">
                            Email (Optional)
                          </Label>
                          <Input
                            id="new-author-email"
                            type="email"
                            value={newAuthorEmail}
                            onChange={(e) => setNewAuthorEmail(e.target.value)}
                            placeholder="writer@example.com"
                            className="mt-1 h-8 text-sm bg-zinc-800 border-zinc-700"
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setAuthorPopoverOpen(false)}
                            className="h-7 text-xs text-zinc-400"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleCreateAuthorStub}
                            disabled={creatingAuthor}
                            className="h-7 text-xs bg-[#7CFC00] text-black font-bold"
                          >
                            {creatingAuthor ? "Creating..." : "Create"}
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </CardHeader>
              <CardContent>
                <Select value={selectedAuthorId} onValueChange={(val) => setSelectedAuthorId(val)}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800">
                    <SelectValue placeholder="Select writer" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {availableAuthors.map((a) => (
                      <SelectItem key={a.clerkId} value={a.clerkId}>
                        {a.name} ({a.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Cover Art Card */}
          <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base text-zinc-200">Cover Art</CardTitle>
              {allowCoverImageUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setUseCoverArtUrl(!useCoverArtUrl)}
                  className="text-xs text-zinc-400 hover:text-white h-auto p-0"
                >
                  {useCoverArtUrl ? "Upload File" : "Use URL"}
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {useCoverArtUrl ? (
                <div>
                  <Input
                    type="url"
                    value={coverArt}
                    onChange={(e) => setCoverArt(e.target.value)}
                    placeholder="https://example.com/cover.jpg"
                    className="bg-zinc-900 border-zinc-800 text-sm"
                  />
                </div>
              ) : (
                <div className="space-y-3">
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
                        : "Upload Cover Art"}
                  </Button>
                </div>
              )}

              {coverArt && (
                <div className="relative aspect-square w-full rounded-lg overflow-hidden border border-zinc-800 bg-black">
                  <NextImage src={coverArt} alt="Cover Art Preview" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => setCoverArt("")}
                    className="absolute top-2 right-2 p-1 bg-black/70 rounded-full text-white hover:bg-black"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
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
              disabled={isSaving || isSubmitting}
              className="flex-1 bg-[#7CFC00] text-black hover:bg-[#7CFC00]/90 font-bold"
            >
              {isSaving ? "Saving..." : initialData?.id ? "Update Release" : "Publish Release"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
