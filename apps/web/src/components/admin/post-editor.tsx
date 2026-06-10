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
import {
  X,
  Upload,
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
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { normalizeStoredPostContent } from "@/lib/content/post-content";
import { getErrorMessage, isNextRedirectError } from "@/lib/utils/error";

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
          className={`p-2 rounded hover:bg-gray-800 transition-colors ${
            isActive ? "text-red-500 bg-gray-800" : "text-gray-400"
          }`}
          title="Add Link"
        >
          <LinkIcon className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-3 bg-[#18181B] border border-gray-800 shadow-xl"
        align="start"
      >
        <form onSubmit={handleApply} className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-300">Insert Link</h4>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="h-8 text-xs bg-[#09090B] border-gray-800 text-white focus-visible:ring-red-500"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 text-xs">
            {isActive && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="h-7 px-2 text-xs bg-red-900/50 hover:bg-red-900 text-red-200 border-none"
                onClick={handleRemove}
              >
                Remove
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs border-gray-800 text-gray-400 hover:text-white"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-7 px-3 text-xs bg-red-500 hover:bg-red-600 text-white"
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
    <div className="flex flex-wrap items-center gap-1 border-b border-gray-800 bg-[#151516] p-2 rounded-t-lg select-none">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-2 rounded hover:bg-gray-800 transition-colors ${
          editor.isActive("bold") ? "text-red-500 bg-gray-800" : "text-gray-400"
        }`}
        title="Bold (Cmd+B)"
      >
        <Bold className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-2 rounded hover:bg-gray-800 transition-colors ${
          editor.isActive("italic") ? "text-red-500 bg-gray-800" : "text-gray-400"
        }`}
        title="Italic (Cmd+I)"
      >
        <Italic className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`p-2 rounded hover:bg-gray-800 transition-colors ${
          editor.isActive("strike") ? "text-red-500 bg-gray-800" : "text-gray-400"
        }`}
        title="Strikethrough (Cmd+Shift+X)"
      >
        <Strikethrough className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={`p-2 rounded hover:bg-gray-800 transition-colors ${
          editor.isActive("code") ? "text-red-500 bg-gray-800" : "text-gray-400"
        }`}
        title="Inline Code (Cmd+E)"
      >
        <Code className="w-4 h-4" />
      </button>

      <div className="w-px h-6 bg-gray-800 mx-1" />

      <button
        type="button"
        onClick={() => toggleHeading(2)}
        className={`p-2 rounded hover:bg-gray-800 transition-colors ${
          editor.isActive("heading", { level: 2 }) ? "text-red-500 bg-gray-800" : "text-gray-400"
        }`}
        title="Heading 2 (Cmd+Alt+2)"
      >
        <Heading2 className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => toggleHeading(3)}
        className={`p-2 rounded hover:bg-gray-800 transition-colors ${
          editor.isActive("heading", { level: 3 }) ? "text-red-500 bg-gray-800" : "text-gray-400"
        }`}
        title="Heading 3 (Cmd+Alt+3)"
      >
        <Heading3 className="w-4 h-4" />
      </button>

      <div className="w-px h-6 bg-gray-800 mx-1" />

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-2 rounded hover:bg-gray-800 transition-colors ${
          editor.isActive("bulletList") ? "text-red-500 bg-gray-800" : "text-gray-400"
        }`}
        title="Bullet List (Cmd+Shift+8)"
      >
        <List className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-2 rounded hover:bg-gray-800 transition-colors ${
          editor.isActive("orderedList") ? "text-red-500 bg-gray-800" : "text-gray-400"
        }`}
        title="Numbered List (Cmd+Shift+9)"
      >
        <ListOrdered className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`p-2 rounded hover:bg-gray-800 transition-colors ${
          editor.isActive("blockquote") ? "text-red-500 bg-gray-800" : "text-gray-400"
        }`}
        title="Blockquote (Cmd+Shift+B)"
      >
        <Quote className="w-4 h-4" />
      </button>

      <div className="w-px h-6 bg-gray-800 mx-1" />

      <LinkButton editor={editor} />

      {editor.isActive("link") && (
        <button
          type="button"
          onClick={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()}
          className="p-2 rounded hover:bg-gray-800 text-gray-400 hover:text-red-400 transition-colors"
          title="Remove Link"
        >
          <Unlink className="w-4 h-4" />
        </button>
      )}

      <div className="w-px h-6 bg-gray-800 mx-1" />

      <button
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        className="p-2 rounded hover:bg-gray-800 text-gray-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        title="Undo (Cmd+Z)"
      >
        <Undo2 className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        className="p-2 rounded hover:bg-gray-800 text-gray-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
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
  const router = useRouter();
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
          class: "text-red-500 hover:text-red-400 underline font-medium cursor-pointer",
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
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
          placeholder="Auto-generated from title"
          className="mt-1"
        />
      </div>

      {canManageAuthor && (
        <div className="space-y-3 rounded-lg border border-gray-800 bg-[#111111] p-4">
          <div>
            <Label htmlFor="authorId">Author</Label>
            <Select value={selectedAuthorId} onValueChange={setSelectedAuthorId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select author" />
              </SelectTrigger>
              <SelectContent>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <Input
                value={newAuthorName}
                onChange={(event) => setNewAuthorName(event.target.value)}
                placeholder="New author name"
                className="md:col-span-2"
              />
              <Input
                value={newAuthorEmail}
                onChange={(event) => setNewAuthorEmail(event.target.value)}
                placeholder="Email (optional)"
                type="email"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleCreateAuthorStub}
                disabled={creatingAuthor}
              >
                {creatingAuthor ? "Creating..." : "Quick Create Author"}
              </Button>
            </div>
          )}
        </div>
      )}

      <div>
        <Label htmlFor="category">Category</Label>
        <Select value={category} onValueChange={setCategory} required>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="excerpt">Excerpt</Label>
        <Textarea
          id="excerpt"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          required
          className="mt-1"
          rows={3}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="coverImage">Cover Image</Label>
          {allowCoverImageUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setUseCoverImageUrl(!useCoverImageUrl)}
              className="text-xs"
            >
              {useCoverImageUrl ? "Upload File" : "Use URL"}
            </Button>
          )}
        </div>

        {allowCoverImageUrl && useCoverImageUrl ? (
          <Input
            id="coverImage"
            type="url"
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            className="mt-1"
            placeholder="https://example.com/image.jpg"
          />
        ) : (
          <div className="space-y-2">
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
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => coverImageInputRef.current?.click()}
                disabled={coverImageUploading}
                className="mt-1"
              >
                <Upload className="w-4 h-4 mr-2" />
                {coverImageUploading ? "Uploading..." : "Upload Image"}
              </Button>
              {coverImage && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCoverImage("")}
                  className="mt-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            {coverImage && (
              <div className="relative w-full h-48 border border-gray-800 rounded-lg overflow-hidden bg-[#0A0A0A]">
                <NextImage src={coverImage} alt="Cover preview" fill className="object-cover" />
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <Label>Content</Label>
        <div className="mt-1 border border-gray-800 rounded-lg bg-[#111111] overflow-hidden">
          <EditorToolbar editor={editor} />
          <EditorContent editor={editor} />
        </div>
      </div>

      <div>
        <Label htmlFor="status">Status</Label>
        <Select
          value={status}
          onValueChange={(value: "draft" | "published" | "archived") => setStatus(value)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isCoverStory"
          checked={isCoverStory}
          onCheckedChange={(checked) => setIsCoverStory(checked === true)}
        />
        <Label htmlFor="isCoverStory" className="cursor-pointer">
          Set as cover story
        </Label>
      </div>

      <div>
        <Label>Featured Artists</Label>
        <div className="mt-1 space-y-2">
          <Popover open={artistPopoverOpen} onOpenChange={setArtistPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                disabled={artistsLoading}
              >
                {artistsLoading
                  ? "Loading artists..."
                  : selectedArtists.length > 0
                    ? `${selectedArtists.length} artist(s) selected`
                    : "Select artists"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <div className="max-h-[300px] overflow-y-auto p-2">
                {allArtists.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-400">No artists available</div>
                ) : (
                  <div className="space-y-2">
                    {allArtists.map((artist) => (
                      <div
                        key={artist.id}
                        className="flex items-center space-x-2 p-2 hover:bg-gray-800 rounded"
                      >
                        <Checkbox
                          id={`artist-${artist.id}`}
                          checked={selectedArtistIds.includes(artist.id)}
                          onCheckedChange={() => handleArtistToggle(artist.id)}
                        />
                        <Label
                          htmlFor={`artist-${artist.id}`}
                          className="flex-1 cursor-pointer text-sm"
                        >
                          {artist.name} ({artist.genre})
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
          {selectedArtists.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedArtists.map((artist) => (
                <Badge key={artist.id} variant="secondary" className="flex items-center gap-1">
                  {artist.name}
                  <button
                    type="button"
                    onClick={() => handleRemoveArtist(artist.id)}
                    className="ml-1 hover:text-red-400"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          {onCreateArtistStub && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mt-3">
              <Input
                value={newArtistName}
                onChange={(event) => setNewArtistName(event.target.value)}
                placeholder="New artist name"
                className="md:col-span-2"
              />
              <select
                value={newArtistGenre}
                onChange={(event) => setNewArtistGenre(event.target.value)}
                className="bg-[#0A0A0A] border border-gray-800 rounded px-3 py-2 text-sm"
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
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleCreateArtistStub}
                disabled={creatingArtist}
              >
                {creatingArtist ? "Creating..." : "Quick Create"}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting || isSaving || coverImageUploading}>
          {coverImageUploading
            ? "Uploading cover..."
            : isSubmitting || isSaving
              ? "Saving..."
              : "Save Post"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(cancelHref)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
