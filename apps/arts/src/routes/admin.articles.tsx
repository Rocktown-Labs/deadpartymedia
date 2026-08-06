import { uploadFiles } from "@better-upload/client";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Edit, Eye, EyeOff, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ArtsAdminShell } from "#/components/arts-admin-shell.tsx";
import { ArtsImageUploader } from "#/components/arts-image-uploader.tsx";
import { ArtsRichTextEditor } from "#/components/arts-rich-text-editor.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import { MEDIUM_OPTIONS } from "#/lib/artmakers.ts";
import { createArtsArtmakerStub, requireArtsStaff } from "#/lib/artmakers.functions.ts";
import { getUploadedObjectKey } from "#/lib/artwork-drafts.ts";
import { getPublicUploadUrl } from "#/lib/upload.ts";
import { listAdminArtmakers } from "#/lib/admin.functions.ts";
import {
  createArtsArticle,
  deleteArtsArticle,
  listArtsAdminArticles,
  toggleArtsArticleStatus,
  updateArtsArticle,
  type ArtsArticleListItem,
} from "#/lib/content.functions.ts";

export const Route = createFileRoute("/admin/articles")({
  beforeLoad: () => requireArtsStaff(),
  component: AdminArticles,
  loader: async () => {
    const [articles, artmakers] = await Promise.all([
      listArtsAdminArticles(),
      listAdminArtmakers(),
    ]);
    return { articles, artmakers };
  },
});

function AdminArticles() {
  const staff = Route.useRouteContext();
  const { articles: initialArticles, artmakers: initialArtmakers } = Route.useLoaderData();
  const [articles, setArticles] = useState<ArtsArticleListItem[]>(initialArticles);
  const [artmakers, setArtmakers] = useState(initialArtmakers);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<ArtsArticleListItem | null>(null);

  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [selectedArtmakerIds, setSelectedArtmakerIds] = useState<number[]>([]);
  const [newArtmakerName, setNewArtmakerName] = useState("");
  const [newArtmakerMedium, setNewArtmakerMedium] = useState<string[]>(["Visual Art"]);
  const [status, setStatus] = useState<"draft" | "published" | "archived">("published");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingArtmaker, setIsCreatingArtmaker] = useState(false);

  const createArticleFn = useServerFn(createArtsArticle);
  const updateArticleFn = useServerFn(updateArtsArticle);
  const toggleStatusFn = useServerFn(toggleArtsArticleStatus);
  const deleteArticleFn = useServerFn(deleteArtsArticle);
  const createArtmakerFn = useServerFn(createArtsArtmakerStub);

  const openNewEditor = () => {
    setEditingArticle(null);
    setTitle("");
    setExcerpt("");
    setContent("");
    setCoverImage("");
    setSelectedArtmakerIds([]);
    setStatus("published");
    setIsEditorOpen(true);
  };

  const openEditEditor = (article: ArtsArticleListItem) => {
    setEditingArticle(article);
    setTitle(article.title);
    setExcerpt(article.excerpt);
    setContent(article.content || "");
    setCoverImage(article.coverImage || "");
    setSelectedArtmakerIds(article.artmakerIds);
    setStatus(article.status);
    setIsEditorOpen(true);
  };

  const uploadArticleImage = async (file: File) => {
    const result = await uploadFiles({
      files: [file],
      route: "articleImages",
    });
    const [uploadedFile] = (result.files ?? []) as unknown[];
    const key = uploadedFile ? getUploadedObjectKey(uploadedFile) : "";

    if (!key) {
      throw new Error("The image uploaded, but no object key came back from storage.");
    }

    return getPublicUploadUrl(key);
  };

  const toggleArtmaker = (id: number) => {
    setSelectedArtmakerIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const toggleNewArtmakerMedium = (value: string) => {
    setNewArtmakerMedium((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  const handleQuickCreateArtmaker = async () => {
    const displayName = newArtmakerName.trim();

    if (!displayName) {
      toast.error("Artmaker name is required.");
      return;
    }

    setIsCreatingArtmaker(true);
    try {
      const result = await createArtmakerFn({
        data: {
          medium: newArtmakerMedium.length ? newArtmakerMedium : ["Visual Art"],
          name: displayName,
        },
      });

      if (!result.success || !result.artmaker) {
        toast.error("Failed to create artmaker.");
        return;
      }

      const updated = await listAdminArtmakers();
      setArtmakers(updated);
      setSelectedArtmakerIds((current) =>
        current.includes(result.artmaker.id) ? current : [...current, result.artmaker.id],
      );
      setNewArtmakerName("");
      setNewArtmakerMedium(["Visual Art"]);
      toast.success("Artmaker profile created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create artmaker");
    } finally {
      setIsCreatingArtmaker(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !excerpt.trim() || !content.trim()) {
      toast.error("Please fill in the title, excerpt, and content.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingArticle) {
        await updateArticleFn({
          data: {
            content,
            coverImage,
            excerpt,
            id: editingArticle.id,
            artmakerIds: selectedArtmakerIds,
            status,
            title,
          },
        });
        toast.success("Article updated successfully!");
      } else {
        await createArticleFn({
          data: {
            content,
            coverImage,
            excerpt,
            artmakerIds: selectedArtmakerIds,
            status,
            title,
          },
        });
        toast.success("Article created successfully!");
      }

      setIsEditorOpen(false);
      const updatedList = await listArtsAdminArticles();
      setArticles(updatedList);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save article");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      await toggleStatusFn({ data: { id } });
      toast.success("Article status updated");
      const updatedList = await listArtsAdminArticles();
      setArticles(updatedList);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle status");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this article?")) {
      return;
    }
    try {
      await deleteArticleFn({ data: { id } });
      toast.success("Article deleted");
      setArticles((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete article");
    }
  };

  return (
    <ArtsAdminShell role={staff.role}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-black text-4xl tracking-tight">Articles</h1>
          <p className="mt-3 max-w-2xl text-gray-400">
            Create, edit, and publish stories for Dead Party Arts using the WYSIWYG editor.
          </p>
        </div>
        <Button
          type="button"
          onClick={openNewEditor}
          className="rounded-lg bg-[#7CFC00] font-black text-black text-xs tracking-wider uppercase hover:bg-[#7CFC00]/90"
        >
          <Plus className="mr-2 size-4" />
          Create Article
        </Button>
      </div>

      {/* Articles List */}
      <div className="overflow-hidden rounded-lg border border-gray-800 bg-[#111111]">
        {articles.length > 0 ? (
          <div className="divide-y divide-gray-800">
            {articles.map((article) => (
              <div
                key={article.id}
                className="flex flex-wrap items-center justify-between gap-4 p-5 hover:bg-gray-900/50"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h2 className="font-bold text-lg text-white">{article.title}</h2>
                    <span
                      className={`rounded px-2 py-0.5 font-bold text-xs uppercase ${
                        article.status === "published"
                          ? "bg-[#7CFC00]/15 text-[#7CFC00]"
                          : "bg-yellow-500/15 text-yellow-400"
                      }`}
                    >
                      {article.status}
                    </span>
                  </div>
                  <p className="line-clamp-1 text-gray-400 text-sm">{article.excerpt}</p>
                  {article.artmakers.length > 0 ? (
                    <p className="text-[#7CFC00] text-xs">
                      Featuring {article.artmakers.map((artmaker) => artmaker.name).join(", ")}
                    </p>
                  ) : null}
                  <p className="text-gray-500 text-xs">
                    {article.publishedAt
                      ? `Published: ${new Date(article.publishedAt).toLocaleDateString()}`
                      : "Draft"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleStatus(article.id)}
                    title={article.status === "published" ? "Unpublish" : "Publish"}
                  >
                    {article.status === "published" ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openEditEditor(article)}
                    title="Edit Article"
                  >
                    <Edit className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(article.id)}
                    title="Delete Article"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-8 text-center text-gray-400">
            No arts articles created yet. Click "Create Article" to write one!
          </p>
        )}
      </div>

      {/* Article Editor Modal */}
      {isEditorOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
          <div className="my-8 w-full max-w-4xl rounded-xl border border-gray-800 bg-[#111111] p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-gray-800 border-b pb-4">
              <h2 className="font-black text-2xl text-white">
                {editingArticle ? "Edit Article" : "Create New Article"}
              </h2>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <Label
                  htmlFor="title"
                  className="text-xs font-bold text-gray-400 uppercase tracking-wider"
                >
                  Article Title
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter article title..."
                  className="font-bold text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="excerpt"
                  className="text-xs font-bold text-gray-400 uppercase tracking-wider"
                >
                  Excerpt / Summary
                </Label>
                <Textarea
                  id="excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Short summary for story cards..."
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <ArtsImageUploader
                  label="Cover Image"
                  value={coverImage}
                  onChange={setCoverImage}
                />
                <div className="space-y-2">
                  <Label
                    htmlFor="status-select"
                    className="text-xs font-bold text-gray-400 uppercase tracking-wider"
                  >
                    Publication Status
                  </Label>
                  <select
                    id="status-select"
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as "draft" | "published" | "archived")
                    }
                    className="w-full h-10 rounded-lg border border-gray-800 bg-[#0A0A0A] px-3 font-bold text-white text-sm"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-gray-800 bg-[#0A0A0A] p-4">
                <div>
                  <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Featured Artmakers
                  </Label>
                  <p className="mt-1 text-gray-500 text-sm">
                    Attach this story to public artmaker profiles.
                  </p>
                </div>
                <div className="grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2">
                  {artmakers.length > 0 ? (
                    artmakers.map((artmaker) => {
                      const selected = selectedArtmakerIds.includes(artmaker.id);
                      return (
                        <button
                          key={artmaker.id}
                          type="button"
                          onClick={() => toggleArtmaker(artmaker.id)}
                          className={`flex min-h-11 items-center justify-between gap-3 border px-3 text-left text-sm ${
                            selected
                              ? "border-[#7CFC00] bg-[#7CFC00] text-black"
                              : "border-gray-800 bg-[#111111] text-gray-300 hover:border-gray-600"
                          }`}
                        >
                          <span>{artmaker.name}</span>
                          {selected ? <Check className="size-4" /> : null}
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-gray-500 text-sm">No artmakers yet.</p>
                  )}
                </div>
                {selectedArtmakerIds.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {artmakers
                      .filter((artmaker) => selectedArtmakerIds.includes(artmaker.id))
                      .map((artmaker) => (
                        <span
                          key={artmaker.id}
                          className="inline-flex items-center gap-2 rounded bg-[#7CFC00]/15 px-2 py-1 text-[#7CFC00] text-xs"
                        >
                          {artmaker.name}
                          <button type="button" onClick={() => toggleArtmaker(artmaker.id)}>
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}
                  </div>
                ) : null}

                <div className="border-gray-800 border-t pt-4">
                  <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Quick Create Artmaker
                  </Label>
                  <div className="mt-3 grid gap-3">
                    <Input
                      value={newArtmakerName}
                      onChange={(event) => setNewArtmakerName(event.target.value)}
                      placeholder="Artmaker name"
                    />
                    <div className="grid gap-2 sm:grid-cols-3">
                      {MEDIUM_OPTIONS.slice(0, 12).map((option) => {
                        const selected = newArtmakerMedium.includes(option);
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => toggleNewArtmakerMedium(option)}
                            className={`min-h-9 border px-2 text-left text-xs ${
                              selected
                                ? "border-[#7CFC00] bg-[#7CFC00] text-black"
                                : "border-gray-800 bg-[#111111] text-gray-300 hover:border-gray-600"
                            }`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleQuickCreateArtmaker}
                      disabled={isCreatingArtmaker}
                      className="w-fit"
                    >
                      {isCreatingArtmaker ? "Creating..." : "Create and attach"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Tiptap WYSIWYG Editor */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Article Content (WYSIWYG Editor)
                </Label>
                <ArtsRichTextEditor
                  content={content}
                  onChange={setContent}
                  onUploadImage={uploadArticleImage}
                />
              </div>

              <div className="flex justify-end gap-3 border-gray-800 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditorOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#7CFC00] font-black text-black hover:bg-[#7CFC00]/90"
                >
                  {isSubmitting
                    ? "Saving..."
                    : editingArticle
                      ? "Update Article"
                      : "Publish Article"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </ArtsAdminShell>
  );
}
