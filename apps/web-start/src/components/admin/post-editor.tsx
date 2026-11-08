"use client";

import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiPatch, apiPost } from "@/lib/api-client";

const CATEGORIES = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"] as const;
const STATUSES = ["draft", "published", "archived"] as const;

export interface PostFormValue {
  category: string;
  content: string;
  coverImage: string | null;
  excerpt: string;
  id?: number;
  isCoverStory: boolean;
  slug: string;
  status: string;
  title: string;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replaceAll(/[^\w\s-]/g, "")
    .replaceAll(/[\s_-]+/g, "-");
}

/**
 * Post editor — core port of apps/web/src/components/admin/post-editor.tsx
 * (TipTap StarterKit + Image + Link, same extension set as the API's HTML
 * renderer). The 1,223-line source's AI-assist, WordPress import, and
 * artist-linking panels land with the visual parity pass; this editor
 * covers the full create/update contract.
 */
export function PostEditor({ initial }: { initial: PostFormValue | null }) {
  const editing = initial?.id != null;
  const [fields, setFields] = useState({
    category: initial?.category ?? "OTHER",
    coverImage: initial?.coverImage ?? "",
    excerpt: initial?.excerpt ?? "",
    isCoverStory: initial?.isCoverStory ?? false,
    slug: initial?.slug ?? "",
    status: initial?.status ?? "draft",
    title: initial?.title ?? "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const editor = useEditor({
    content: initial?.content ? safeParse(initial.content) : undefined,
    extensions: [
      StarterKit,
      Image,
      Link.configure({
        HTMLAttributes: {
          class: "text-red-500 hover:text-red-400 underline font-medium cursor-pointer",
        },
      }),
    ],
    immediatelyRender: false,
  });

  const set = (key: keyof typeof fields) => (event: { target: { value: string } }) => {
    setFields((previous) => ({ ...previous, [key]: event.target.value }));
  };

  async function save() {
    if (!editor) {
      return;
    }
    setBusy(true);
    setMessage(null);
    const body = {
      category: fields.category,
      content: JSON.stringify(editor.getJSON()),
      coverImage: fields.coverImage || null,
      excerpt: fields.excerpt,
      isCoverStory: fields.isCoverStory,
      slug: fields.slug || slugify(fields.title),
      status: fields.status,
      title: fields.title,
    };
    const result = editing
      ? await apiPatch(`/music/admin/posts/${initial?.id}`, body)
      : await apiPost("/music/admin/posts", body);
    setBusy(false);
    if (!result.ok) {
      const error = (result as { error?: string }).error;
      setMessage(error ?? "Failed to save");
      return;
    }
    setMessage("Saved ✓");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black">{editing ? "Edit post" : "New post"}</h1>
        {message ? <span className="text-sm text-gray-400">{message}</span> : null}
      </div>

      <div className="space-y-1.5">
        <Label className="text-gray-300">Title</Label>
        <Input
          onChange={(event) => {
            setFields((previous) => ({
              ...previous,
              slug: slugify(event.target.value),
              title: event.target.value,
            }));
          }}
          value={fields.title}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-gray-300">Slug</Label>
          <Input onChange={set("slug")} value={fields.slug} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-gray-300">Category</Label>
          <Select
            onValueChange={(value) => {
              setFields((previous) => ({ ...previous, category: value }));
            }}
            value={fields.category}
          >
            <SelectTrigger>{fields.category}</SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-gray-300">Status</Label>
          <Select
            onValueChange={(value) => {
              setFields((previous) => ({ ...previous, status: value }));
            }}
            value={fields.status}
          >
            <SelectTrigger>{fields.status}</SelectTrigger>
            <SelectContent>
              {STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-gray-300">Cover image URL</Label>
        <Input onChange={set("coverImage")} value={fields.coverImage} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-gray-300">Excerpt</Label>
        <Textarea onChange={set("excerpt")} rows={2} value={fields.excerpt} />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-300">
        <input
          checked={fields.isCoverStory}
          className="accent-[#7CFC00]"
          onChange={(event) => {
            setFields((previous) => ({ ...previous, isCoverStory: event.target.checked }));
          }}
          type="checkbox"
        />
        Cover story
      </label>

      <div className="space-y-1.5">
        <Label className="text-gray-300">Content</Label>
        <div className="rounded-md border border-white/10 bg-zinc-950 p-3">
          <div className="mb-2 flex flex-wrap gap-1 border-b border-white/10 pb-2 text-xs">
            {(
              [
                ["bold", "B"],
                ["italic", "I"],
                ["strike", "S"],
                ["heading", "H2"],
              ] as const
            ).map(([action, label]) => (
              <button
                className="rounded border border-white/10 px-2 py-1 hover:border-[#7CFC00]/50"
                key={action}
                onClick={() => {
                  if (action === "heading") {
                    editor?.chain().focus().toggleHeading({ level: 2 }).run();
                  } else if (action === "bold") {
                    editor?.chain().focus().toggleBold().run();
                  } else if (action === "italic") {
                    editor?.chain().focus().toggleItalic().run();
                  } else {
                    editor?.chain().focus().toggleStrike().run();
                  }
                }}
                type="button"
              >
                {label}
              </button>
            ))}
            <button
              className="rounded border border-white/10 px-2 py-1 hover:border-[#7CFC00]/50"
              onClick={() => {
                const url = window.prompt("Image URL");
                if (url) {
                  editor?.chain().focus().setImage({ src: url }).run();
                }
              }}
              type="button"
            >
              Image
            </button>
            <button
              className="rounded border border-white/10 px-2 py-1 hover:border-[#7CFC00]/50"
              onClick={() => {
                const url = window.prompt("Link URL");
                if (url) {
                  editor?.chain().focus().setLink({ href: url }).run();
                }
              }}
              type="button"
            >
              Link
            </button>
          </div>
          <EditorContent
            className="prose-invert min-h-[300px] max-w-none text-gray-200 [&_.tiptap]:focus:outline-none"
            editor={editor}
          />
        </div>
      </div>

      <Button
        className="bg-[#7CFC00] text-black hover:bg-[#7CFC00]/90"
        disabled={busy}
        onClick={() => {
          void save();
        }}
        type="button"
      >
        {busy ? "Saving…" : "Save post"}
      </Button>
    </div>
  );
}

function safeParse(content: string) {
  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
}
