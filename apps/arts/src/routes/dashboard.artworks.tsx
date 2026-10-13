import { uploadFiles } from "@better-upload/client";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Image } from "@unpic/react";
import { CheckCircle2, ImageUp, Loader2, Pencil, Trash2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { ArtmakerDashboardShell } from "#/components/artmaker-dashboard-shell.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import { requireArtmakerDashboardUser } from "#/lib/artmakers.functions.ts";
import { type ArtworkDraft, createArtworkDrafts } from "#/lib/artwork-drafts.ts";
import {
  type ArtworkListItem,
  deleteCurrentArtwork,
  listCurrentArtworks,
  saveArtwork,
  updateCurrentArtwork,
} from "#/lib/artworks.functions.ts";
import { describeUploadFailures } from "#/lib/upload.ts";

const batchArtworkSchema = z.object({
  items: z
    .array(
      z.object({
        description: z.string().max(700),
        fileName: z.string(),
        forSale: z.boolean(),
        id: z.string(),
        imageKey: z.string().min(1),
        medium: z.string().max(80),
        previewUrl: z.string().optional(),
        price: z.string(),
        status: z.enum(["draft", "published"]),
        title: z.string().min(1, "Title is required").max(120),
        year: z.string().max(20),
      }),
    )
    .min(1, "Upload at least one artwork image."),
});

export const Route = createFileRoute("/dashboard/artworks")({
  beforeLoad: () => requireArtmakerDashboardUser(),
  component: DashboardArtworks,
  loader: () => listCurrentArtworks(),
});

function DashboardArtworks() {
  const initialArtworks = Route.useLoaderData();
  const save = useServerFn(saveArtwork);
  const remove = useServerFn(deleteCurrentArtwork);
  const updateArtwork = useServerFn(updateCurrentArtwork);
  const [artworks, setArtworks] = useState(initialArtworks);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadProgressRef = useRef(new Map<string, number>());

  // Edit artwork state
  const [editingArtwork, setEditingArtwork] = useState<ArtworkListItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMedium, setEditMedium] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editForSale, setEditForSale] = useState(false);
  const [editPrice, setEditPrice] = useState("");
  const [editStatus, setEditStatus] = useState<"draft" | "published">("published");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleOpenEdit = (artwork: ArtworkListItem) => {
    setEditingArtwork(artwork);
    setEditTitle(artwork.title);
    setEditMedium(artwork.medium || "");
    setEditYear(artwork.year || "");
    setEditDescription(artwork.description || "");
    setEditForSale(artwork.forSale);
    setEditPrice(artwork.priceCents ? (artwork.priceCents / 100).toFixed(2) : "");
    setEditStatus(artwork.status === "published" ? "published" : "draft");
  };

  const handleCloseEdit = () => {
    setEditingArtwork(null);
  };

  const handleSaveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingArtwork) {
      return;
    }

    if (!editTitle.trim()) {
      setError("Title is required.");
      return;
    }

    setIsUpdating(true);
    setError("");
    try {
      const res = await updateArtwork({
        data: {
          description: editDescription.trim() || undefined,
          forSale: editForSale,
          id: editingArtwork.id,
          medium: editMedium.trim() || undefined,
          price: editForSale ? editPrice : undefined,
          status: editStatus,
          title: editTitle.trim(),
          year: editYear.trim() || undefined,
        },
      });

      setArtworks((current) =>
        current.map((item) =>
          item.id === editingArtwork.id ? (res.artwork as ArtworkListItem) : item,
        ),
      );
      toast.success("Artwork updated successfully!");
      setEditingArtwork(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not update artwork.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this artwork? This cannot be undone.")) {
      return;
    }

    setDeletingId(id);
    setError("");
    try {
      await remove({ data: { id } });
      setArtworks((current) => current.filter((artwork) => artwork.id !== id));
      toast.success("Artwork deleted.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not delete artwork.");
    } finally {
      setDeletingId(null);
    }
  };

  const form = useForm({
    defaultValues: {
      items: [] as ArtworkDraft[],
    },
    validators: {
      onSubmit: batchArtworkSchema,
    },
    onSubmit: async ({ value }) => {
      setError("");
      try {
        for (const item of value.items) {
          await save({
            data: {
              description: item.description,
              forSale: item.forSale,
              imageKey: item.imageKey,
              medium: item.medium,
              price: item.price,
              status: item.status,
              title: item.title,
              year: item.year,
            },
          });
        }
        const refreshed = await listCurrentArtworks();
        setArtworks(refreshed);
        form.reset();
        toast.success("Artworks published to wall!");
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Could not save artwork.");
      }
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      uploadProgressRef.current.clear();
      const result = await uploadFiles({
        files,
        route: "artwork",
        onFileStateChange: ({ file }) => {
          const key = file.objectInfo?.key;

          if (key) {
            uploadProgressRef.current.set(
              key,
              file.status === "complete" ? 1 : (file.progress ?? 0),
            );
            const values = [...uploadProgressRef.current.values()];
            const average = values.reduce((sum, value) => sum + value, 0) / values.length;

            if (Number.isFinite(average)) {
              setUploadProgress(average);
            }
          }
        },
      });

      if (result.failedFiles.length > 0) {
        throw new Error(describeUploadFailures(result.failedFiles));
      }

      return result;
    },
    onError: (caughtError) => {
      setError(caughtError instanceof Error ? caughtError.message : "Artwork upload failed.");
    },
    onSuccess: (result) => {
      const uploadedFiles = (result.files ?? []) as unknown[];
      const drafts = createArtworkDrafts(uploadedFiles, result.metadata);

      form.setFieldValue("items", [...form.state.values.items, ...drafts]);
    },
  });

  return (
    <ArtmakerDashboardShell>
      <div className="mb-8">
        <p className="font-black text-[#7CFC00] text-xs uppercase tracking-[0.28em]">
          Artwork uploads
        </p>
        <h1 className="mt-3 font-black text-4xl tracking-tight">Your Artworks</h1>
        <p className="mt-3 max-w-2xl text-gray-400">
          Upload multiple pieces, then review the image preview and add metadata for each artwork
          before publishing to the exhibitions wall.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <section className="rounded-lg border border-gray-800 bg-[#111111] p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-md border border-[#7CFC00]/40 text-[#7CFC00]">
              <ImageUp className="size-5" />
            </div>
            <div>
              <h2 className="font-black text-xl">Batch artwork upload</h2>
              <p className="text-gray-500 text-sm">Cloudflare R2 via Better Upload.</p>
            </div>
          </div>

          <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-gray-700 bg-[#080808] p-6 text-center hover:border-[#7CFC00]">
            {uploadMutation.isPending ? (
              <Loader2 className="mb-3 size-8 animate-spin text-[#7CFC00]" />
            ) : (
              <Upload className="mb-3 size-8 text-[#7CFC00]" />
            )}
            <span className="font-black text-sm uppercase tracking-[0.18em]">
              {uploadMutation.isPending ? "Uploading" : "Choose artwork files"}
            </span>
            <span className="mt-2 text-gray-500 text-sm">
              PNG, JPG, GIF, WebP, or PDF. Up to 12 files.
            </span>
            {uploadMutation.isPending ? (
              <div className="mt-4 w-full max-w-xs">
                <div className="h-2 overflow-hidden bg-gray-800">
                  <div
                    className="h-full bg-[#7CFC00] transition-all"
                    style={{ width: `${Math.round(uploadProgress * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-gray-400 text-xs">
                  {Math.round(uploadProgress * 100)}% uploaded — keep this open
                </p>
              </div>
            ) : null}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif,application/pdf"
              multiple
              className="sr-only"
              disabled={uploadMutation.isPending}
              onChange={(event) => {
                const files = [...(event.target.files ?? [])];
                if (files.length > 0) {
                  uploadMutation.mutate(files);
                }
                event.target.value = "";
              }}
            />
          </label>

          <form
            className="mt-6"
            onSubmit={(event) => {
              event.preventDefault();
              form.handleSubmit();
            }}
          >
            <form.Field
              name="items"
              children={(field) => (
                <div className="grid gap-3">
                  {field.state.value.length > 0 ? (
                    field.state.value.map((item, index) => (
                      <details
                        key={item.id}
                        open={index === 0}
                        className="overflow-hidden rounded-lg border border-gray-800 bg-[#080808]"
                      >
                        <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 font-black text-sm uppercase tracking-[0.14em] hover:bg-neutral-900/60">
                          <div className="flex items-center gap-3 min-w-0">
                            {item.previewUrl ? (
                              <img
                                src={item.previewUrl}
                                alt={item.title || item.fileName}
                                className="size-12 shrink-0 rounded border border-neutral-700 bg-neutral-950 object-cover"
                              />
                            ) : (
                              <div className="grid size-12 shrink-0 place-items-center rounded border border-neutral-800 bg-neutral-900 text-[#7CFC00]">
                                <ImageUp className="size-5" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-white font-black">
                                {item.title || item.fileName}
                              </p>
                              <p className="truncate text-xs font-normal normal-case text-gray-400">
                                {item.fileName}
                              </p>
                            </div>
                          </div>
                          <span className="shrink-0 text-xs text-neutral-500 font-mono">
                            #{index + 1}
                          </span>
                        </summary>
                        <div className="grid gap-4 border-gray-800 border-t p-4">
                          <div className="grid gap-4 sm:grid-cols-[140px_minmax(0,1fr)] items-start">
                            {item.previewUrl ? (
                              <div className="overflow-hidden rounded-lg border border-neutral-700 bg-neutral-950">
                                <img
                                  src={item.previewUrl}
                                  alt={item.title || item.fileName}
                                  className="aspect-square w-full object-cover"
                                />
                                <p className="p-1.5 text-center text-[10px] text-gray-400 font-mono truncate">
                                  {item.fileName}
                                </p>
                              </div>
                            ) : null}
                            <div className="grid gap-4 flex-1">
                              <Field label="Title">
                                <Input
                                  value={item.title}
                                  placeholder="Artwork title"
                                  onChange={(event) => {
                                    const next = [...field.state.value];
                                    next[index] = { ...item, title: event.target.value };
                                    field.handleChange(next);
                                  }}
                                />
                              </Field>
                              <div className="grid gap-4 md:grid-cols-2">
                                <Field label="Medium">
                                  <Input
                                    value={item.medium}
                                    placeholder="e.g. Oil on Canvas"
                                    onChange={(event) => {
                                      const next = [...field.state.value];
                                      next[index] = { ...item, medium: event.target.value };
                                      field.handleChange(next);
                                    }}
                                  />
                                </Field>
                                <Field label="Year">
                                  <Input
                                    value={item.year}
                                    placeholder="e.g. 2026"
                                    onChange={(event) => {
                                      const next = [...field.state.value];
                                      next[index] = { ...item, year: event.target.value };
                                      field.handleChange(next);
                                    }}
                                  />
                                </Field>
                              </div>
                            </div>
                          </div>
                          <Field label="Description">
                            <Textarea
                              value={item.description}
                              rows={3}
                              placeholder="Brief statement or context about this piece..."
                              onChange={(event) => {
                                const next = [...field.state.value];
                                next[index] = { ...item, description: event.target.value };
                                field.handleChange(next);
                              }}
                            />
                          </Field>
                          <div className="grid gap-3 rounded-lg border border-gray-800 p-3">
                            <label className="flex items-center gap-3 text-gray-300 text-sm cursor-pointer">
                              <input
                                type="checkbox"
                                checked={item.forSale}
                                onChange={(event) => {
                                  const next = [...field.state.value];
                                  next[index] = { ...item, forSale: event.target.checked };
                                  field.handleChange(next);
                                }}
                                className="size-4 accent-[#7CFC00]"
                              />
                              Mark available for future sales
                            </label>
                            {item.forSale ? (
                              <Field label="Price (USD)">
                                <Input
                                  value={item.price}
                                  onChange={(event) => {
                                    const next = [...field.state.value];
                                    next[index] = { ...item, price: event.target.value };
                                    field.handleChange(next);
                                  }}
                                  placeholder="250"
                                />
                              </Field>
                            ) : null}
                          </div>
                          <Field label="Visibility">
                            <select
                              value={item.status}
                              onChange={(event) => {
                                const next = [...field.state.value];
                                next[index] = {
                                  ...item,
                                  status: event.target.value as "draft" | "published",
                                };
                                field.handleChange(next);
                              }}
                              className="h-10 rounded-md border border-gray-800 bg-[#0A0A0A] px-3 text-white"
                            >
                              <option value="published">Published</option>
                              <option value="draft">Draft</option>
                            </select>
                          </Field>
                        </div>
                      </details>
                    ))
                  ) : (
                    <p className="rounded-lg border border-gray-800 bg-[#080808] p-5 text-gray-400">
                      Upload one or more artwork images to start a batch.
                    </p>
                  )}
                </div>
              )}
            />

            {error ? (
              <div className="mt-5 rounded border border-red-500/50 bg-red-950/30 p-3 text-red-200 text-sm">
                {error}
              </div>
            ) : null}

            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting] as const}
              children={([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  disabled={!canSubmit || isSubmitting || form.state.values.items.length === 0}
                  className="mt-6 h-12 rounded-lg bg-[#7CFC00] px-6 font-black text-black text-xs uppercase tracking-[0.18em] hover:bg-[#a5ff43]"
                >
                  {isSubmitting
                    ? "Publishing"
                    : `Publish batch (${form.state.values.items.length})`}
                </Button>
              )}
            />
          </form>
        </section>

        <section className="rounded-lg border border-gray-800 bg-[#111111] p-6">
          <h2 className="font-black text-xl">Current wall</h2>
          <div className="mt-5 grid gap-4">
            {artworks.length > 0 ? (
              artworks.map((artwork) => (
                <article
                  key={artwork.id}
                  className="grid gap-4 rounded-lg border border-gray-800 bg-[#080808] p-4 sm:grid-cols-[112px_minmax(0,1fr)]"
                >
                  <Image
                    src={artwork.image}
                    alt={artwork.title}
                    width={112}
                    height={112}
                    className="aspect-square w-full rounded-md object-cover"
                  />
                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h3 className="font-black text-lg">{artwork.title}</h3>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded bg-[#7CFC00]/15 px-2 py-1 font-bold text-[#7CFC00] text-xs uppercase">
                          <CheckCircle2 className="size-3" />
                          {artwork.status}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(artwork)}
                          className="border-neutral-700 bg-neutral-900 text-gray-200 hover:border-[#7CFC00] hover:text-[#7CFC00]"
                          title="Edit artwork"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={deletingId === artwork.id}
                          onClick={() => handleDelete(artwork.id)}
                          title="Delete artwork"
                        >
                          {deletingId === artwork.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <p className="mt-2 text-gray-400 text-sm">
                      {artwork.medium ?? "Mixed practice"}
                    </p>
                    {artwork.description ? (
                      <p className="mt-2 line-clamp-2 text-gray-500 text-sm">
                        {artwork.description}
                      </p>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-lg border border-gray-800 bg-[#080808] p-5 text-gray-400">
                No artworks yet. Your first upload will appear here.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Edit Artwork Modal */}
      {editingArtwork ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-neutral-700 bg-[#111111] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-neutral-800 border-b pb-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-[#7CFC00]">
                  Edit Artwork
                </p>
                <h2 className="font-black text-xl text-white">{editingArtwork.title}</h2>
              </div>
              <button
                type="button"
                onClick={handleCloseEdit}
                className="rounded p-1 text-gray-400 hover:bg-neutral-800 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-5 space-y-4">
              <div className="flex items-center gap-4 rounded-lg border border-neutral-800 bg-[#080808] p-3">
                <Image
                  src={editingArtwork.image}
                  alt={editingArtwork.title}
                  width={80}
                  height={80}
                  className="size-20 rounded-md object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-black text-white truncate">{editingArtwork.title}</p>
                  <p className="text-gray-400 text-xs">
                    {editingArtwork.medium || "Mixed practice"}
                  </p>
                  <span className="mt-1 inline-flex items-center gap-1 rounded bg-[#7CFC00]/15 px-2 py-0.5 font-bold text-[#7CFC00] text-[10px] uppercase">
                    {editingArtwork.status}
                  </span>
                </div>
              </div>

              <Field label="Title">
                <Input
                  value={editTitle}
                  onChange={(event) => setEditTitle(event.target.value)}
                  placeholder="Artwork title"
                  required
                />
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Medium">
                  <Input
                    value={editMedium}
                    onChange={(event) => setEditMedium(event.target.value)}
                    placeholder="e.g. Acrylic on Canvas"
                  />
                </Field>
                <Field label="Year">
                  <Input
                    value={editYear}
                    onChange={(event) => setEditYear(event.target.value)}
                    placeholder="e.g. 2026"
                  />
                </Field>
              </div>

              <Field label="Description">
                <Textarea
                  value={editDescription}
                  rows={3}
                  onChange={(event) => setEditDescription(event.target.value)}
                  placeholder="Artwork description..."
                />
              </Field>

              <div className="grid gap-3 rounded-lg border border-neutral-800 p-3">
                <label className="flex items-center gap-3 text-gray-300 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForSale}
                    onChange={(event) => setEditForSale(event.target.checked)}
                    className="size-4 accent-[#7CFC00]"
                  />
                  Mark available for future sales
                </label>
                {editForSale ? (
                  <Field label="Price (USD)">
                    <Input
                      value={editPrice}
                      onChange={(event) => setEditPrice(event.target.value)}
                      placeholder="250.00"
                    />
                  </Field>
                ) : null}
              </div>

              <Field label="Visibility">
                <select
                  value={editStatus}
                  onChange={(event) => setEditStatus(event.target.value as "draft" | "published")}
                  className="h-10 rounded-md border border-neutral-800 bg-[#0A0A0A] px-3 text-white"
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </Field>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseEdit}
                  disabled={isUpdating}
                  className="border-neutral-700 text-gray-300 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUpdating || !editTitle.trim()}
                  className="bg-[#7CFC00] font-black text-black text-xs uppercase tracking-wider hover:bg-[#a5ff43]"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </ArtmakerDashboardShell>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="grid gap-2">
      <Label className="font-black text-xs uppercase tracking-[0.22em]">{label}</Label>
      {children}
    </label>
  );
}
