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
import { Badge } from "@/components/ui/badge";
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
  ChevronRight,
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

interface PostEditorProps {
  initialData?: {
    title?: string;
    slug?: string;
    category?: string;
    excerpt?: string;
    content?: string;
    coverImage?: string;
    status?: "draft" | "published" | "archived";
    isCoverStory?: boolean;
    artistIds?: number[];
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

const categories = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"] as const;

function LinkButton({ editor }: { editor: any }) {
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      const currentUrl = editor.getAttributes("link").href || "";
      setUrl(currentUrl);
    }
  }, [open, editor]);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    let formattedUrl = url.trim();
    if (!formattedUrl) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = `https://${formattedUrl}`;
      }
      editor.chain().focus().extendMarkRange("link").setLink({ href: formattedUrl }).run();
    }
    setOpen(false);
  };

  const handleRemove = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setOpen(false);
  };

  const isActive = editor.isActive("link");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`p-2 rounded hover:bg-zinc-800 transition-colors ${
            isActive ? "text-[#7CFC00] bg-zinc-800" : "text-gray-400"
          }`}
          title="Add Link"
        >
          <LinkIcon className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-3 bg-zinc-950 border border-zinc-850 shadow-xl"
        align="start"
      >
        <form onSubmit={handleApply} className="space-y-3">
          <h4 className="text-xs font-semibold text-zinc-300">Insert Link</h4>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="h-8 text-xs bg-zinc-900 border-zinc-800 text-white focus-visible:ring-[#7CFC00]"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 text-xs">
            {isActive && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs border-red-900/50 hover:bg-red-950/20 text-red-400"
                onClick={handleRemove}
              >
                Remove
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs border-zinc-800 text-zinc-400 hover:text-white"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-7 px-3 text-xs bg-[#7CFC00] hover:bg-[#6edc00] text-black font-semibold"
            >
              Apply
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function EditorToolbar({ editor }: { editor: any }) {
  if (!editor) {
    return null;
  }

  const toggleHeading = (level: 2 | 3) => {
    editor.chain().focus().toggleHeading({ level }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-zinc-800 bg-zinc-900/60 p-2 rounded-t-lg select-none">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-2 rounded hover:bg-zinc-800 transition-colors ${
          editor.isActive("bold") ? "text-[#7CFC00] bg-zinc-800" : "text-gray-400"
        }`}
        title="Bold (Cmd+B)"
      >
        <Bold className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-2 rounded hover:bg-zinc-800 transition-colors ${
          editor.isActive("italic") ? "text-[#7CFC00] bg-zinc-800" : "text-gray-400"
        }`}
        title="Italic (Cmd+I)"
      >
        <Italic className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`p-2 rounded hover:bg-zinc-800 transition-colors ${
          editor.isActive("strike") ? "text-[#7CFC00] bg-zinc-800" : "text-gray-400"
        }`}
        title="Strikethrough (Cmd+Shift+X)"
      >
        <Strikethrough className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={`p-2 rounded hover:bg-zinc-800 transition-colors ${
          editor.isActive("code") ? "text-[#7CFC00] bg-zinc-800" : "text-gray-400"
        }`}
        title="Inline Code (Cmd+E)"
      >
        <Code className="w-4 h-4" />
      </button>

      <div className="w-px h-6 bg-zinc-800 mx-1" />

      <button
        type="button"
        onClick={() => toggleHeading(2)}
        className={`p-2 rounded hover:bg-zinc-800 transition-colors ${
          editor.isActive("heading", { level: 2 }) ? "text-[#7CFC00] bg-zinc-800" : "text-gray-400"
        }`}
        title="Heading 2 (Cmd+Alt+2)"
      >
        <Heading2 className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => toggleHeading(3)}
        className={`p-2 rounded hover:bg-zinc-800 transition-colors ${
          editor.isActive("heading", { level: 3 }) ? "text-[#7CFC00] bg-zinc-800" : "text-gray-400"
        }`}
        title="Heading 3 (Cmd+Alt+3)"
      >
        <Heading3 className="w-4 h-4" />
      </button>

      <div className="w-px h-6 bg-zinc-800 mx-1" />

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-2 rounded hover:bg-zinc-800 transition-colors ${
          editor.isActive("bulletList") ? "text-[#7CFC00] bg-zinc-800" : "text-gray-400"
        }`}
        title="Bullet List (Cmd+Shift+8)"
      >
        <List className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-2 rounded hover:bg-zinc-800 transition-colors ${
          editor.isActive("orderedList") ? "text-[#7CFC00] bg-zinc-800" : "text-gray-400"
        }`}
        title="Numbered List (Cmd+Shift+9)"
      >
        <ListOrdered className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`p-2 rounded hover:bg-zinc-800 transition-colors ${
          editor.isActive("blockquote") ? "text-[#7CFC00] bg-zinc-800" : "text-gray-400"
        }`}
        title="Blockquote (Cmd+Shift+B)"
      >
        <Quote className="w-4 h-4" />
      </button>

      <div className="w-px h-6 bg-zinc-800 mx-1" />

      <LinkButton editor={editor} />

      {editor.isActive("link") && (
        <button
          type="button"
          onClick={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()}
          className="p-2 rounded hover:bg-zinc-800 text-gray-400 hover:text-red-405 transition-colors"
          title="Remove Link"
        >
          <Unlink className="w-4 h-4" />
        </button>
      )}

      <div className="w-px h-6 bg-zinc-800 mx-1" />

      <button
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        className="p-2 rounded hover:bg-zinc-800 text-gray-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        title="Undo (Cmd+Z)"
      >
        <Undo2 className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        className="p-2 rounded hover:bg-zinc-800 text-gray-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        title="Redo (Cmd+Shift+Z)"
      >
        <Redo2 className="w-4 h-4" />
      </button>
    </div>
  );
}

export function PostEditor({
  initialData,
  authorOptions = [],
  canManageAuthor = false,
  onCreateAuthorStub,
  onCreateArtistStub,
  onSubmit,
  cancelHref,
  allowCoverImageUrl = true,
  isSubmitting = false,
}: PostEditorProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [category, setCategory] = useState(initialData?.category || "");
  const [excerpt, setExcerpt] = useState(initialData?.excerpt || "");
  const [coverImage, setCoverImage] = useState(initialData?.coverImage || "");
  const [status, setStatus] = useState<"draft" | "published" | "archived">(
    initialData?.status || "draft",
  );
  const [isCoverStory, setIsCoverStory] = useState(initialData?.isCoverStory || false);
  const [selectedArtistIds, setSelectedArtistIds] = useState<number[]>(
    initialData?.artistIds || [],
  );
  const [selectedAuthorId, setSelectedAuthorId] = useState(
    initialData?.authorId && authorOptions.some((author) => author.clerkId === initialData.authorId)
      ? initialData.authorId
      : authorOptions[0]?.clerkId || initialData?.authorId || "",
  );
  const [availableAuthors, setAvailableAuthors] = useState<AuthorOption[]>(authorOptions);
  const [createdArtists, setCreatedArtists] = useState<Artist[]>([]);
  const [newAuthorName, setNewAuthorName] = useState("");
  const [newAuthorEmail, setNewAuthorEmail] = useState("");
  const [creatingAuthor, setCreatingAuthor] = useState(false);
  const [newArtistName, setNewArtistName] = useState("");
  const [newArtistGenre, setNewArtistGenre] = useState("OTHER");
  const [newArtistLocation, setNewArtistLocation] = useState("");
  const [creatingArtist, setCreatingArtist] = useState(false);
  const [artistPopoverOpen, setArtistPopoverOpen] = useState(false);
  const [coverImageUploading, setCoverImageUploading] = useState(false);
  const [useCoverImageUrl, setUseCoverImageUrl] = useState(false);
  const coverImageInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const normalizedInitialContent = useMemo(
    () => normalizeStoredPostContent(initialData?.content || ""),
    [initialData?.content],
  );
  const [editorContentSnapshot, setEditorContentSnapshot] = useState(
    normalizedInitialContent.editorValue,
  );
  const initialSnapshot = useMemo(
    () =>
      JSON.stringify({
        artistIds: [...(initialData?.artistIds || [])].toSorted((a, b) => a - b),
        authorId: initialData?.authorId || "",
        category: initialData?.category || "",
        content: normalizedInitialContent.editorValue,
        coverImage: initialData?.coverImage || "",
        excerpt: initialData?.excerpt || "",
        isCoverStory: initialData?.isCoverStory || false,
        slug: initialData?.slug || "",
        status: initialData?.status || "draft",
        title: initialData?.title || "",
      }),
    [initialData, normalizedInitialContent.editorValue],
  );

  const { data: artists = [], isLoading: artistsLoading } = useArtists();
  const allArtists = useMemo(() => {
    const deduped = new Map<number, Artist>();
    for (const artist of artists) {
      deduped.set(artist.id, artist);
    }
    for (const artist of createdArtists) {
      deduped.set(artist.id, artist);
    }
    return [...deduped.values()];
  }, [artists, createdArtists]);

  const editor = useEditor({
    content: normalizedInitialContent.editorValue,
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none min-h-[400px] p-4 focus:outline-none",
      },
    },
    extensions: [
      StarterKit,
      Image,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-[#7CFC00] hover:text-[#6edc00] underline font-medium cursor-pointer",
        },
      }),
      FileHandler.configure({
        allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"],
        onDrop: (editor, files, pos) => {
          handleImageUpload(files, editor, pos);
        },
        onPaste: (editor, files, _htmlContent) => {
          // Only handle image files, let other content be handled by default paste handler
          const imageFiles = [...files].filter((file) => file.type.startsWith("image/"));
          if (imageFiles.length > 0) {
            handleImageUpload(imageFiles, editor);
          }
        },
      }),
    ],
    onUpdate: ({ editor }) => {
      setEditorContentSnapshot(editor.getJSON());
    },
  });

  const handleImageUpload = async (
    files: File[],
    editorInstance: typeof editor,
    position?: number,
  ) => {
    if (!editorInstance) {
      return;
    }

    const imageFiles = [...files].filter((file) => file.type.startsWith("image/"));

    for (const file of imageFiles) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        toast.error(validation.error || "Invalid image file");
        continue;
      }

      try {
        // Show loading indicator
        const loadingId = toast.loading("Uploading image...");

        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload/image?type=content", {
          body: formData,
          method: "POST",
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: "Upload failed" }));
          throw new Error(error.error || "Failed to upload image");
        }

        const { url } = await response.json();

        // Insert image into editor
        if (position !== undefined) {
          editorInstance.chain().focus().setImage({ src: url }).run();
        } else {
          editorInstance.chain().focus().setImage({ src: url }).run();
        }

        toast.dismiss(loadingId);
        toast.success("Image uploaded successfully");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to upload image");
      }
    }
  };

  const handleCoverImageUpload = async (file: File | null) => {
    if (!file) {
      return;
    }

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid image file");
      return;
    }

    setCoverImageUploading(true);
    const loadingId = toast.loading("Uploading cover image...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload/image?type=cover", {
        body: formData,
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(error.error || "Failed to upload image");
      }

      const { url } = await response.json();
      setCoverImage(url);
      setUseCoverImageUrl(false);
      toast.success("Cover image uploaded successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload cover image");
    } finally {
      toast.dismiss(loadingId);
      setCoverImageUploading(false);
    }
  };

  const handleArtistToggle = (artistId: number) => {
    setSelectedArtistIds((prev) =>
      prev.includes(artistId) ? prev.filter((id) => id !== artistId) : [...prev, artistId],
    );
  };

  const handleRemoveArtist = (artistId: number) => {
    setSelectedArtistIds((prev) => prev.filter((id) => id !== artistId));
  };

  const handleCreateAuthorStub = async () => {
    if (!onCreateAuthorStub) {
      return;
    }

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
      const { profile } = result;
      if (!result.success || !profile) {
        toast.error(result.error || "Failed to create author");
        return;
      }

      const name =
        [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() || profile.email;

      setAvailableAuthors((previous) => {
        const next = [...previous];
        if (!next.some((author) => author.clerkId === profile.clerkId)) {
          next.push({
            clerkId: profile.clerkId,
            name,
            role: profile.role,
          });
        }
        return next;
      });
      setSelectedAuthorId(profile.clerkId);
      setNewAuthorName("");
      setNewAuthorEmail("");
      toast.success("Author profile created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create author");
    } finally {
      setCreatingAuthor(false);
    }
  };

  const handleCreateArtistStub = async () => {
    if (!onCreateArtistStub) {
      return;
    }

    const displayName = newArtistName.trim();
    if (!displayName) {
      toast.error("Artist name is required");
      return;
    }

    setCreatingArtist(true);
    try {
      const formData = new FormData();
      formData.append("displayName", displayName);
      formData.append("genre", newArtistGenre);
      if (newArtistLocation.trim()) {
        formData.append("location", newArtistLocation.trim());
      }

      const result = await onCreateArtistStub(formData);
      const { artist } = result;
      if (!result.success || !artist) {
        toast.error(result.error || "Failed to create artist");
        return;
      }

      setCreatedArtists((previous) => {
        if (previous.some((existingArtist) => existingArtist.id === artist.id)) {
          return previous;
        }
        const createdArtist: Artist = {
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
        return [...previous, createdArtist];
      });

      setSelectedArtistIds((previous) =>
        previous.includes(artist.id) ? previous : [...previous, artist.id],
      );
      setNewArtistName("");
      setNewArtistLocation("");
      setNewArtistGenre("OTHER");
      toast.success("Artist profile created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create artist");
    } finally {
      setCreatingArtist(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData();
    formData.append("title", title);
    formData.append("slug", slug || title.toLowerCase().replaceAll(/\s+/g, "-"));
    formData.append("category", category);
    formData.append("excerpt", excerpt);
    formData.append("content", JSON.stringify(editor?.getJSON() || {}));
    formData.append("coverImage", coverImage);
    formData.append("status", status);
    formData.append("isCoverStory", isCoverStory.toString());
    if (canManageAuthor && selectedAuthorId) {
      formData.append("authorId", selectedAuthorId);
    }
    // Append artist IDs as comma-separated string
    if (selectedArtistIds.length > 0) {
      formData.append("artistIds", selectedArtistIds.join(","));
    }
    try {
      await onSubmit(formData);
    } catch (error) {
      if (isNextRedirectError(error)) {
        return;
      }
      toast.error(getErrorMessage(error, "Failed to save post"));
    } finally {
      setIsSaving(false);
    }
  };

  const selectedArtists = allArtists.filter((artist) => selectedArtistIds.includes(artist.id));
  const currentSnapshot = JSON.stringify({
    artistIds: [...selectedArtistIds].toSorted((a, b) => a - b),
    authorId: selectedAuthorId,
    category,
    content: editorContentSnapshot,
    coverImage,
    excerpt,
    isCoverStory,
    slug,
    status,
    title,
  });
  const { UnsavedChangesDialog, navigateAway } = useUnsavedChangesGuard(
    currentSnapshot !== initialSnapshot,
    cancelHref,
  );

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {UnsavedChangesDialog}
      <div className="lg:col-span-12">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigateAway(cancelHref)}
          className="gap-2 px-0 text-[#7CFC00] hover:bg-transparent hover:text-[#7CFC00]/80"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Posts
        </Button>
      </div>

      {/* Left Column - Main Content */}
      <div className="lg:col-span-8 space-y-6">
        <div className="space-y-2">
          <Label
            htmlFor="title"
            className="text-zinc-400 font-semibold uppercase text-xs tracking-wider"
          >
            Title
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="text-lg md:text-xl font-medium bg-zinc-900/40 border-zinc-800 text-white focus-visible:ring-[#7CFC00] focus-visible:border-zinc-700 py-6"
            placeholder="Enter post title..."
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="slug"
            className="text-zinc-400 font-semibold uppercase text-xs tracking-wider"
          >
            Slug
          </Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="Auto-generated from title"
            className="bg-zinc-900/40 border-zinc-800 text-zinc-300 text-sm focus-visible:ring-[#7CFC00] focus-visible:border-zinc-700"
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="excerpt"
            className="text-zinc-400 font-semibold uppercase text-xs tracking-wider"
          >
            Excerpt
          </Label>
          <Textarea
            id="excerpt"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            required
            placeholder="Write a short teaser/excerpt for the post..."
            className="bg-zinc-900/40 border-zinc-800 text-zinc-300 text-sm focus-visible:ring-[#7CFC00] focus-visible:border-zinc-700 min-h-[80px] resize-none"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-zinc-400 font-semibold uppercase text-xs tracking-wider">
            Content
          </Label>
          <div className="border border-zinc-800 rounded-lg bg-zinc-950 overflow-hidden focus-within:border-zinc-700 transition-colors">
            <EditorToolbar editor={editor} />
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {/* Right Column - Sidebar */}
      <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-[var(--sidebar-offset-top,80px)]">
        {/* Actions & Status Card */}
        <Card className="bg-zinc-900/40 border-zinc-800/80 shadow-md">
          <CardHeader className="pb-3 border-b border-zinc-850/50">
            <CardTitle className="text-xs uppercase tracking-wider text-zinc-400 font-bold">
              Publish settings
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status" className="text-xs text-zinc-400 font-medium">
                Post Status
              </Label>
              <Select
                value={status}
                onValueChange={(value: "draft" | "published" | "archived") => setStatus(value)}
              >
                <SelectTrigger className="bg-zinc-950/80 border-zinc-800 text-zinc-200 focus:ring-[#7CFC00]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-850 text-zinc-200">
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 py-1">
              <Checkbox
                id="isCoverStory"
                checked={isCoverStory}
                onCheckedChange={(checked) => setIsCoverStory(checked === true)}
                className="border-zinc-700 data-[state=checked]:bg-[#7CFC00] data-[state=checked]:border-[#7CFC00] data-[state=checked]:text-black"
              />
              <Label htmlFor="isCoverStory" className="cursor-pointer text-sm text-zinc-300">
                Set as cover story
              </Label>
            </div>

            <div className="flex flex-col gap-2 pt-3 border-t border-zinc-850/50">
              <Button
                type="submit"
                disabled={isSubmitting || isSaving || coverImageUploading}
                className="w-full bg-[#7CFC00] hover:bg-[#6edc00] text-black font-bold"
              >
                {coverImageUploading
                  ? "Uploading cover..."
                  : isSubmitting || isSaving
                    ? "Saving..."
                    : "Save Post"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full border-zinc-800 hover:bg-zinc-800 text-zinc-300"
                onClick={() => navigateAway(cancelHref)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Cover Image Card */}
        <Card className="bg-zinc-900/40 border-zinc-800/80 shadow-md">
          <CardHeader className="pb-3 border-b border-zinc-850/50 flex flex-row items-center justify-between">
            <CardTitle className="text-xs uppercase tracking-wider text-zinc-400 font-bold">
              Cover Image
            </CardTitle>
            {allowCoverImageUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setUseCoverImageUrl(!useCoverImageUrl)}
                className="text-[10px] text-zinc-400 hover:text-white h-6 px-2"
              >
                {useCoverImageUrl ? "Upload File" : "Use URL"}
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-4">
            {allowCoverImageUrl && useCoverImageUrl ? (
              <div className="space-y-2">
                <Label htmlFor="coverImage" className="text-xs text-zinc-400 font-medium">
                  Image URL
                </Label>
                <Input
                  id="coverImage"
                  type="url"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  className="bg-zinc-950/80 border-zinc-800 text-zinc-300 focus-visible:ring-[#7CFC00]"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <input
                  id="coverImage"
                  ref={coverImageInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  aria-label="Cover Image"
                  data-testid="cover-image-input"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleCoverImageUpload(file);
                    }
                  }}
                  className="hidden"
                />
                {!coverImage ? (
                  <div
                    className="border-2 border-dashed border-zinc-850 hover:border-zinc-700 rounded-lg p-6 text-center cursor-pointer transition-colors bg-zinc-950/20 group"
                    onClick={() => coverImageInputRef.current?.click()}
                  >
                    <Upload className="w-7 h-7 mx-auto mb-2 text-zinc-500 group-hover:text-zinc-400 transition-colors" />
                    <p className="text-xs text-zinc-400 font-medium">Click to upload cover image</p>
                    <p className="text-[10px] text-zinc-500 mt-1">JPEG, PNG, WEBP, GIF (Max 5MB)</p>
                  </div>
                ) : (
                  <div className="relative aspect-video border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950">
                    <NextImage src={coverImage} alt="Cover preview" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => setCoverImage("")}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/80 hover:bg-black text-zinc-400 hover:text-white transition-colors"
                      title="Remove image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Post Details Card */}
        <Card className="bg-zinc-900/40 border-zinc-800/80 shadow-md">
          <CardHeader className="pb-3 border-b border-zinc-850/50">
            <CardTitle className="text-xs uppercase tracking-wider text-zinc-400 font-bold">
              Category & Author
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category" className="text-xs text-zinc-400 font-medium">
                Category
              </Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger className="bg-zinc-950/80 border-zinc-800 text-zinc-200 focus:ring-[#7CFC00]">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-850 text-zinc-200">
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {canManageAuthor && (
              <div className="space-y-3 pt-3 border-t border-zinc-850/50">
                <div className="space-y-2">
                  <Label htmlFor="authorId" className="text-xs text-zinc-400 font-medium">
                    Author
                  </Label>
                  <Select value={selectedAuthorId} onValueChange={setSelectedAuthorId}>
                    <SelectTrigger className="bg-zinc-950/80 border-zinc-800 text-zinc-200 focus:ring-[#7CFC00]">
                      <SelectValue placeholder="Select author" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-850 text-zinc-200">
                      {availableAuthors.length === 0 ? (
                        <SelectItem value="__none__" disabled>
                          No authors available
                        </SelectItem>
                      ) : (
                        availableAuthors.map((author) => (
                          <SelectItem key={author.clerkId} value={author.clerkId}>
                            {author.name} ({author.role})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {onCreateAuthorStub && (
                  <div className="space-y-2 pt-2">
                    <Label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                      Quick Create Author
                    </Label>
                    <div className="flex flex-col gap-2">
                      <Input
                        value={newAuthorName}
                        onChange={(event) => setNewAuthorName(event.target.value)}
                        placeholder="New author name"
                        className="bg-zinc-950/80 border-zinc-800 text-zinc-300 text-xs focus-visible:ring-[#7CFC00]"
                      />
                      <Input
                        value={newAuthorEmail}
                        onChange={(event) => setNewAuthorEmail(event.target.value)}
                        placeholder="Email (optional)"
                        type="email"
                        className="bg-zinc-950/80 border-zinc-800 text-zinc-300 text-xs focus-visible:ring-[#7CFC00]"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCreateAuthorStub}
                        disabled={creatingAuthor}
                        className="text-xs border-zinc-800 hover:bg-zinc-800 hover:text-white"
                      >
                        {creatingAuthor ? "Creating..." : "Quick Create"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Featured Artists Card */}
        <Card className="bg-zinc-900/40 border-zinc-800/80 shadow-md">
          <CardHeader className="pb-3 border-b border-zinc-850/50">
            <CardTitle className="text-xs uppercase tracking-wider text-zinc-400 font-bold">
              Featured Artists
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400 font-medium">Select Artists</Label>
              <Popover open={artistPopoverOpen} onOpenChange={setArtistPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between bg-zinc-950/80 border-zinc-800 text-zinc-300 hover:bg-zinc-900"
                    disabled={artistsLoading}
                  >
                    <span className="truncate">
                      {artistsLoading
                        ? "Loading artists..."
                        : selectedArtists.length > 0
                          ? `${selectedArtists.length} artist(s) selected`
                          : "Select artists"}
                    </span>
                    <ChevronRight className="w-4 h-4 ml-2 text-zinc-500 transform rotate-90" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[300px] p-0 bg-zinc-950 border border-zinc-850 shadow-xl"
                  align="start"
                >
                  <div className="max-h-[200px] overflow-y-auto p-2 space-y-1">
                    {allArtists.length === 0 ? (
                      <div className="p-4 text-center text-xs text-zinc-500">
                        No artists available
                      </div>
                    ) : (
                      allArtists.map((artist) => (
                        <div
                          key={artist.id}
                          className="flex items-center space-x-2 p-1.5 hover:bg-zinc-900 rounded cursor-pointer"
                        >
                          <Checkbox
                            id={`artist-${artist.id}`}
                            checked={selectedArtistIds.includes(artist.id)}
                            onCheckedChange={() => handleArtistToggle(artist.id)}
                            className="border-zinc-700 data-[state=checked]:bg-[#7CFC00] data-[state=checked]:border-[#7CFC00] data-[state=checked]:text-black"
                          />
                          <Label
                            htmlFor={`artist-${artist.id}`}
                            className="flex-1 cursor-pointer text-xs text-zinc-300"
                          >
                            {artist.name}{" "}
                            <span className="text-[10px] text-zinc-500 font-light">
                              ({artist.genre})
                            </span>
                          </Label>
                        </div>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {selectedArtists.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedArtists.map((artist) => (
                  <Badge
                    key={artist.id}
                    variant="secondary"
                    className="bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center gap-1 py-0.5 text-xs"
                  >
                    {artist.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveArtist(artist.id)}
                      className="ml-1 hover:text-red-400 focus:outline-none"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {onCreateArtistStub && (
              <div className="space-y-2 pt-3 border-t border-zinc-850/50">
                <Label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                  Quick Create Artist
                </Label>
                <div className="flex flex-col gap-2">
                  <Input
                    value={newArtistName}
                    onChange={(event) => setNewArtistName(event.target.value)}
                    placeholder="Artist name"
                    className="bg-zinc-950/80 border-zinc-800 text-zinc-300 text-xs focus-visible:ring-[#7CFC00]"
                  />
                  <select
                    value={newArtistGenre}
                    onChange={(event) => setNewArtistGenre(event.target.value)}
                    className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700"
                  >
                    {categories.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={newArtistLocation}
                    onChange={(event) => setNewArtistLocation(event.target.value)}
                    placeholder="Location (optional)"
                    className="bg-zinc-950/80 border-zinc-800 text-zinc-300 text-xs focus-visible:ring-[#7CFC00]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCreateArtistStub}
                    disabled={creatingArtist}
                    className="text-xs border-zinc-800 hover:bg-zinc-800 hover:text-white"
                  >
                    {creatingArtist ? "Creating..." : "Quick Create"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
