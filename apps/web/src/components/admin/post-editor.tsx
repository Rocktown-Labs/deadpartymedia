"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { useState } from "react";
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
  };
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const categories = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"] as const;

export function PostEditor({
  initialData,
  onSubmit,
  onCancel,
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

  const editor = useEditor({
    extensions: [StarterKit, Image],
    content: initialData?.content || "",
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none min-h-[400px] p-4 focus:outline-none",
      },
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("title", title);
    formData.append("slug", slug || title.toLowerCase().replace(/\s+/g, "-"));
    formData.append("category", category);
    formData.append("excerpt", excerpt);
    formData.append("content", JSON.stringify(editor?.getJSON() || {}));
    formData.append("coverImage", coverImage);
    formData.append("status", status);
    formData.append("isCoverStory", isCoverStory.toString());
    onSubmit(formData);
  };

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
        <Label htmlFor="coverImage">Cover Image URL</Label>
        <Input
          id="coverImage"
          type="url"
          value={coverImage}
          onChange={(e) => setCoverImage(e.target.value)}
          className="mt-1"
        />
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

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Post"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
