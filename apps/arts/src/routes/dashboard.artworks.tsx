import { uploadFiles } from "@better-upload/client";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, ImageUp, Loader2, Upload } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { ArtmakerDashboardShell } from "#/components/artmaker-dashboard-shell.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import { requireArtmakerDashboardUser } from "#/lib/artmakers.functions.ts";
import { listCurrentArtworks, saveArtwork } from "#/lib/artworks.functions.ts";

interface ArtworkDraft {
  id: string;
  fileName: string;
  imageKey: string;
  title: string;
  medium: string;
  year: string;
  description: string;
  forSale: boolean;
  price: string;
  status: "draft" | "published";
}

const batchArtworkSchema = z.object({
  items: z
    .array(
      z.object({
        description: z.string().max(700).optional(),
        fileName: z.string(),
        forSale: z.boolean(),
        id: z.string(),
        imageKey: z.string().min(1),
        medium: z.string().max(80).optional(),
        price: z.string().optional(),
        status: z.enum(["draft", "published"]),
        title: z.string().min(1, "Title is required").max(120),
        year: z.string().max(20).optional(),
      }),
    )
    .min(1, "Upload at least one artwork image."),
});

export const Route = createFileRoute("/dashboard/artworks")({
  beforeLoad: () => requireArtmakerDashboardUser(),
  component: DashboardArtworks,
  loader: () => listCurrentArtworks(),
});

function getUploadedObjectKey(file: unknown) {
  const candidate = file as {
    objectInfo?: { key?: string };
    uploadedObject?: { key?: string };
    key?: string;
  };
  return candidate.objectInfo?.key ?? candidate.uploadedObject?.key ?? candidate.key ?? "";
}

function titleFromFileName(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replaceAll(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function DashboardArtworks() {
  const initialArtworks = Route.useLoaderData();
  const save = useServerFn(saveArtwork);
  const [artworks, setArtworks] = useState(initialArtworks);
  const [error, setError] = useState("");

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
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Could not save artwork.");
      }
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) =>
      uploadFiles({
        files,
        route: "artwork",
      }),
    onError: (caughtError) => {
      setError(caughtError instanceof Error ? caughtError.message : "Artwork upload failed.");
    },
    onSuccess: (result) => {
      const uploadedFiles = (result.files ?? []) as unknown[];
      const drafts = uploadedFiles
        .map((file, index) => {
          const sourceFile = (file as { file?: File }).file;
          const fileName = sourceFile?.name ?? `Artwork ${index + 1}`;
          const imageKey = getUploadedObjectKey(file);

          if (!imageKey) {
            return null;
          }

          return {
            description: "",
            fileName,
            forSale: false,
            id: crypto.randomUUID(),
            imageKey,
            medium: "",
            price: "",
            status: "published" as const,
            title: titleFromFileName(fileName),
            year: "",
          };
        })
        .filter((draft): draft is ArtworkDraft => Boolean(draft));

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
          Upload multiple pieces, then add the metadata for each artwork before publishing to the
          exhibitions wall.
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
              {uploadMutation.isPending ? "Uploading" : "Choose artwork images"}
            </span>
            <span className="mt-2 text-gray-500 text-sm">PNG, JPG, GIF, WebP. Up to 12 files.</span>
            <input
              type="file"
              accept="image/*"
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
                        className="rounded-lg border border-gray-800 bg-[#080808]"
                      >
                        <summary className="cursor-pointer px-4 py-3 font-black text-sm uppercase tracking-[0.14em]">
                          {item.title || item.fileName}
                        </summary>
                        <div className="grid gap-4 border-gray-800 border-t p-4">
                          <Field label="Title">
                            <Input
                              value={item.title}
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
                                onChange={(event) => {
                                  const next = [...field.state.value];
                                  next[index] = { ...item, year: event.target.value };
                                  field.handleChange(next);
                                }}
                              />
                            </Field>
                          </div>
                          <Field label="Description">
                            <Textarea
                              value={item.description}
                              rows={4}
                              onChange={(event) => {
                                const next = [...field.state.value];
                                next[index] = { ...item, description: event.target.value };
                                field.handleChange(next);
                              }}
                            />
                          </Field>
                          <div className="grid gap-3 rounded-lg border border-gray-800 p-3">
                            <label className="flex items-center gap-3 text-gray-300 text-sm">
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
                              <Field label="Price">
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
                  <img
                    src={artwork.image}
                    alt={artwork.title}
                    className="aspect-square w-full rounded-md object-cover"
                  />
                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h3 className="font-black text-lg">{artwork.title}</h3>
                      <span className="inline-flex items-center gap-1 rounded bg-[#7CFC00]/15 px-2 py-1 font-bold text-[#7CFC00] text-xs uppercase">
                        <CheckCircle2 className="size-3" />
                        {artwork.status}
                      </span>
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
