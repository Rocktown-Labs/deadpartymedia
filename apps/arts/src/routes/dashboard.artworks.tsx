import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, ImageUp } from "lucide-react";
import { useState } from "react";
import { ArtmakerDashboardShell } from "#/components/artmaker-dashboard-shell.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import { requireArtmakerDashboardUser } from "#/lib/artmakers.functions.ts";
import { listCurrentArtworks, saveArtwork } from "#/lib/artworks.functions.ts";

export const Route = createFileRoute("/dashboard/artworks")({
  beforeLoad: () => requireArtmakerDashboardUser(),
  component: DashboardArtworks,
  loader: () => listCurrentArtworks(),
});

function DashboardArtworks() {
  const initialArtworks = Route.useLoaderData();
  const save = useServerFn(saveArtwork);
  const [artworks, setArtworks] = useState(initialArtworks);
  const [title, setTitle] = useState("");
  const [image, setImage] = useState("");
  const [medium, setMedium] = useState("");
  const [year, setYear] = useState("");
  const [description, setDescription] = useState("");
  const [forSale, setForSale] = useState(false);
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("published");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    try {
      await save({
        data: {
          description,
          forSale,
          image,
          medium,
          price,
          status,
          title,
          year,
        },
      });
      const refreshed = await listCurrentArtworks();
      setArtworks(refreshed);
      setTitle("");
      setImage("");
      setMedium("");
      setYear("");
      setDescription("");
      setForSale(false);
      setPrice("");
      setStatus("published");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not save artwork.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ArtmakerDashboardShell>
      <div className="mb-8">
        <p className="font-black text-[#7CFC00] text-xs uppercase tracking-[0.28em]">
          Artwork uploads
        </p>
        <h1 className="mt-3 font-black text-4xl tracking-tight">Your Artworks</h1>
        <p className="mt-3 max-w-2xl text-gray-400">
          Add pieces to the public exhibitions wall. Direct file uploads and Stripe Connect sale
          flow can plug into this same screen next.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <form onSubmit={submit} className="rounded-lg border border-gray-800 bg-[#111111] p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-md border border-[#7CFC00]/40 text-[#7CFC00]">
              <ImageUp className="size-5" />
            </div>
            <div>
              <h2 className="font-black text-xl">Submit artwork</h2>
              <p className="text-gray-500 text-sm">
                Use a hosted image URL for this first version.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <Field label="Title">
              <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
            </Field>
            <Field label="Image URL">
              <Input
                value={image}
                onChange={(event) => setImage(event.target.value)}
                placeholder="https://..."
                required
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Medium">
                <Input
                  value={medium}
                  onChange={(event) => setMedium(event.target.value)}
                  placeholder="Acrylic, digital, ceramic..."
                />
              </Field>
              <Field label="Year">
                <Input value={year} onChange={(event) => setYear(event.target.value)} />
              </Field>
            </div>
            <Field label="Description">
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={5}
              />
            </Field>

            <div className="grid gap-3 rounded-lg border border-gray-800 bg-[#080808] p-4">
              <label className="flex items-center gap-3 text-gray-300 text-sm">
                <input
                  type="checkbox"
                  checked={forSale}
                  onChange={(event) => setForSale(event.target.checked)}
                  className="size-4 accent-[#7CFC00]"
                />
                Mark as available for future sales
              </label>
              {forSale ? (
                <Field label="Price">
                  <Input
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    placeholder="250"
                  />
                </Field>
              ) : null}
            </div>

            <Field label="Visibility">
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as "draft" | "published")}
                className="h-10 rounded-md border border-gray-800 bg-[#0A0A0A] px-3 text-white"
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </Field>
          </div>

          {error ? (
            <div className="mt-5 rounded border border-red-500/50 bg-red-950/30 p-3 text-red-200 text-sm">
              {error}
            </div>
          ) : null}

          <Button
            type="submit"
            disabled={isSaving}
            className="mt-6 h-12 rounded-lg bg-[#7CFC00] px-6 font-black text-black text-xs uppercase tracking-[0.18em] hover:bg-[#a5ff43]"
          >
            {isSaving ? "Saving" : "Publish artwork"}
          </Button>
        </form>

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
