"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import FileHandler from "@tiptap/extension-file-handler";
import { useState, useRef } from "react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useArtists } from "@/lib/api/artists";
import { Badge } from "@/components/ui/badge";
import { X, Upload } from "lucide-react";
import { toast } from "sonner";
import NextImage from "next/image";
import { validateImageFile } from "@/lib/upload";
import { useRouter } from "next/navigation";
import type { Route } from "next";

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
  };
  onSubmit: (formData: FormData) => void | Promise<unknown>;
  cancelHref: Route;
  isSubmitting?: boolean;
}

const categories = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"] as const;

export function PostEditor({
  initialData,
  onSubmit,
  cancelHref,
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
    initialData?.artistIds || []
  );
  const [artistPopoverOpen, setArtistPopoverOpen] = useState(false);
  const [coverImageUploading, setCoverImageUploading] = useState(false);
  const [useCoverImageUrl, setUseCoverImageUrl] = useState(false);
  const coverImageInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { data: artists = [], isLoading: artistsLoading } = useArtists();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      FileHandler.configure({
        allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"],
        onDrop: (editor, files, pos) => {
          handleImageUpload(files, editor, pos);
        },
        onPaste: (editor, files, _htmlContent) => {
          // Only handle image files, let other content be handled by default paste handler
          const imageFiles = Array.from(files).filter((file) =>
            file.type.startsWith("image/")
          );
          if (imageFiles.length > 0) {
            handleImageUpload(imageFiles, editor);
          }
        },
      }),
    ],
    content: initialData?.content || "",
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none min-h-[400px] p-4 focus:outline-none",
      },
    },
  });

  const handleImageUpload = async (
    files: File[],
    editorInstance: typeof editor,
    position?: number
  ) => {
    if (!editorInstance) return;

    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));

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
          method: "POST",
          body: formData,
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
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid image file");
      return;
    }

    setCoverImageUploading(true);

    try {
      toast.loading("Uploading cover image...");

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload/image?type=cover", {
        method: "POST",
        body: formData,
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
      setCoverImageUploading(false);
    }
  };

  const handleArtistToggle = (artistId: number) => {
    setSelectedArtistIds((prev) =>
      prev.includes(artistId)
        ? prev.filter((id) => id !== artistId)
        : [...prev, artistId]
    );
  };

  const handleRemoveArtist = (artistId: number) => {
    setSelectedArtistIds((prev) => prev.filter((id) => id !== artistId));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData();
    formData.append("title", title);
    formData.append("slug", slug || title.toLowerCase().replace(/\s+/g, "-"));
    formData.append("category", category);
    formData.append("excerpt", excerpt);
    formData.append("content", JSON.stringify(editor?.getJSON() || {}));
    formData.append("coverImage", coverImage);
    formData.append("status", status);
    formData.append("isCoverStory", isCoverStory.toString());
    // Append artist IDs as comma-separated string
    if (selectedArtistIds.length > 0) {
      formData.append("artistIds", selectedArtistIds.join(","));
    }
    try {
      await onSubmit(formData);
    } catch (error) {
      const digest = (error as any)?.digest as string | undefined;
      if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) {
        return;
      }
      toast.error(error instanceof Error ? error.message : "Failed to save post");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedArtists = artists.filter((artist) =>
    selectedArtistIds.includes(artist.id)
  );

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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setUseCoverImageUrl(!useCoverImageUrl)}
            className="text-xs"
          >
            {useCoverImageUrl ? "Upload File" : "Use URL"}
          </Button>
        </div>

        {useCoverImageUrl ? (
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
                <NextImage
                  src={coverImage}
                  alt="Cover preview"
                  fill
                  className="object-cover"
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <Label>Content</Label>
        <div className="mt-1 border border-gray-800 rounded-lg bg-[#111111]">
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
                {artists.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-400">
                    No artists available
                  </div>
                ) : (
                  <div className="space-y-2">
                    {artists.map((artist) => (
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
                <Badge
                  key={artist.id}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
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
        </div>
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting || isSaving}>
          {isSubmitting || isSaving ? "Saving..." : "Save Post"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(cancelHref)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
