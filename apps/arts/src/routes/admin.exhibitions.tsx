import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Image } from "@unpic/react";
import { Edit, Eye, EyeOff, Plus, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ArtsAdminShell } from "#/components/arts-admin-shell.tsx";
import { ArtsImageUploader } from "#/components/arts-image-uploader.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import { listAdminArtmakers } from "#/lib/admin.functions.ts";
import { createArtsArtmakerStub, requireArtsStaff } from "#/lib/artmakers.functions.ts";
import {
  createArtsArtwork,
  deleteArtsArtwork,
  listAdminArtworks,
  toggleArtsArtworkStatus,
  updateArtsArtwork,
  type ArtworkListItem,
} from "#/lib/artworks.functions.ts";

export const Route = createFileRoute("/admin/exhibitions")({
  beforeLoad: () => requireArtsStaff(),
  component: AdminExhibitions,
  loader: async () => {
    const [artworks, artmakers] = await Promise.all([listAdminArtworks(), listAdminArtmakers()]);
    return { artmakers, artworks };
  },
});

function AdminExhibitions() {
  const staff = Route.useRouteContext();
  const { artmakers: initialArtmakers, artworks: initialArtworks } = Route.useLoaderData();
  const [artworks, setArtworks] = useState<ArtworkListItem[]>(initialArtworks);
  const [artmakers, setArtmakers] = useState(initialArtmakers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState<ArtworkListItem | null>(null);

  const [title, setTitle] = useState("");
  const [artmakerId, setArtmakerId] = useState<number>(artmakers[0]?.id ?? 0);
  const [imageUrl, setImageUrl] = useState("");
  const [medium, setMedium] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [description, setDescription] = useState("");
  const [forSale, setForSale] = useState(false);
  const [price, setPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inline Quick Artmaker Creation
  const [isArtmakerModalOpen, setIsArtmakerModalOpen] = useState(false);
  const [newArtmakerName, setNewArtmakerName] = useState("");
  const [newArtmakerCity, setNewArtmakerCity] = useState("Little Rock");

  const createArtworkFn = useServerFn(createArtsArtwork);
  const updateArtworkFn = useServerFn(updateArtsArtwork);
  const toggleStatusFn = useServerFn(toggleArtsArtworkStatus);
  const deleteArtworkFn = useServerFn(deleteArtsArtwork);
  const createArtmakerStubFn = useServerFn(createArtsArtmakerStub);

  const handleQuickCreateArtmaker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArtmakerName.trim()) {
      toast.error("Artmaker name is required");
      return;
    }

    try {
      const res = await createArtmakerStubFn({
        data: {
          city: newArtmakerCity,
          name: newArtmakerName,
          state: "AR",
        },
      });
      toast.success("Artmaker profile created on the fly!");
      const updatedArtmakers = await listAdminArtmakers();
      setArtmakers(updatedArtmakers);
      setArtmakerId(res.artmaker.id);
      setIsArtmakerModalOpen(false);
      setNewArtmakerName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create artmaker");
    }
  };

  const openNewModal = () => {
    setEditingArtwork(null);
    setTitle("");
    setArtmakerId(artmakers[0]?.id ?? 0);
    setImageUrl("");
    setMedium("Oil on Canvas");
    setYear(new Date().getFullYear().toString());
    setDescription("");
    setForSale(false);
    setPrice("");
    setIsModalOpen(true);
  };

  const openEditModal = (artwork: ArtworkListItem) => {
    setEditingArtwork(artwork);
    setTitle(artwork.title);
    setArtmakerId(artwork.artmakerId);
    setImageUrl(artwork.image);
    setMedium(artwork.medium || "");
    setYear(artwork.year || "");
    setDescription(artwork.description || "");
    setForSale(artwork.forSale);
    setPrice(artwork.priceCents ? (artwork.priceCents / 100).toFixed(2) : "");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !imageUrl.trim()) {
      toast.error("Title and Image URL are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const priceCents = forSale && price ? Math.round(Number(price) * 100) : undefined;

      if (editingArtwork) {
        await updateArtworkFn({
          data: {
            description,
            forSale,
            id: editingArtwork.id,
            image: imageUrl,
            medium,
            priceCents,
            status: editingArtwork.status,
            title,
            year,
          },
        });
        toast.success("Artwork updated");
      } else {
        await createArtworkFn({
          data: {
            artmakerId: artmakerId || artmakers[0]?.id || 1,
            description,
            forSale,
            image: imageUrl,
            medium,
            priceCents,
            status: "published",
            title,
            year,
          },
        });
        toast.success("Artwork added to exhibitions");
      }

      setIsModalOpen(false);
      const updated = await listAdminArtworks();
      setArtworks(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save artwork");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      await toggleStatusFn({ data: { id } });
      toast.success("Artwork status updated");
      const updated = await listAdminArtworks();
      setArtworks(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle status");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to remove this artwork?")) {
      return;
    }
    try {
      await deleteArtworkFn({ data: { id } });
      toast.success("Artwork deleted");
      setArtworks((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete artwork");
    }
  };

  return (
    <ArtsAdminShell role={staff.role}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-black text-4xl tracking-tight">Exhibitions</h1>
          <p className="mt-3 max-w-2xl text-gray-400">
            Curate and manage featured artworks on the Dead Party Arts exhibition wall.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            onClick={openNewModal}
            className="rounded-lg bg-[#7CFC00] font-black text-black text-xs uppercase tracking-[0.18em] hover:bg-[#7CFC00]/90"
          >
            <Plus className="mr-2 size-4" />
            Add Artwork
          </Button>
          <Link
            to="/exhibitions"
            className="rounded-lg border border-gray-800 px-4 py-3 font-black text-white text-xs uppercase tracking-[0.18em] no-underline hover:border-[#7CFC00] hover:text-[#7CFC00]"
          >
            View Public Wall
          </Link>
        </div>
      </div>

      {artworks.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {artworks.map((artwork) => (
            <article
              key={artwork.id}
              className="group flex flex-col justify-between overflow-hidden rounded-xl border border-gray-800 bg-[#111111]"
            >
              <div>
                <div className="relative aspect-square overflow-hidden bg-black">
                  <Image
                    src={artwork.image}
                    alt={artwork.title}
                    width={640}
                    height={640}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-3 left-3 rounded bg-black/80 backdrop-blur-md px-2.5 py-1 font-bold text-[10px] text-gray-300 uppercase">
                    {artwork.artmakerName}
                  </div>
                </div>

                <div className="p-5 space-y-2">
                  <h2 className="font-black text-xl text-white tracking-tight">{artwork.title}</h2>
                  <p className="text-gray-400 text-sm">{artwork.medium ?? "Mixed practice"}</p>
                  {artwork.forSale && artwork.priceCents ? (
                    <p className="font-black text-[#7CFC00] text-sm">
                      ${(artwork.priceCents / 100).toFixed(2)} USD
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-gray-800 border-t p-5 pt-0">
                <span
                  className={`rounded px-2 py-0.5 font-bold text-xs uppercase ${
                    artwork.status === "published"
                      ? "bg-[#7CFC00]/15 text-[#7CFC00]"
                      : "bg-yellow-500/15 text-yellow-400"
                  }`}
                >
                  {artwork.status}
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleStatus(artwork.id)}
                    title={artwork.status === "published" ? "Draft" : "Publish"}
                  >
                    {artwork.status === "published" ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(artwork)}
                    title="Edit Artwork"
                  >
                    <Edit className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(artwork.id)}
                    title="Delete Artwork"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-800 bg-[#111111] p-8 text-center text-gray-400">
          No artworks exhibit on the wall yet. Click "Add Artwork" to curate one!
        </div>
      )}

      {/* Artwork Modal */}
      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
          <div className="my-8 w-full max-w-xl rounded-xl border border-gray-800 bg-[#111111] p-6 space-y-6">
            <div className="flex items-center justify-between border-gray-800 border-b pb-4">
              <h2 className="font-black text-2xl text-white">
                {editingArtwork ? "Edit Artwork" : "Add Artwork to Exhibition"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {!editingArtwork ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="artmaker-select"
                      className="text-xs font-bold text-gray-400 uppercase tracking-wider"
                    >
                      Select Artmaker / Artist
                    </Label>
                    <button
                      type="button"
                      onClick={() => setIsArtmakerModalOpen(true)}
                      className="inline-flex items-center text-xs text-[#7CFC00] hover:underline"
                    >
                      <UserPlus className="mr-1 size-3" /> Quick Add Artmaker
                    </button>
                  </div>
                  <select
                    id="artmaker-select"
                    value={artmakerId}
                    onChange={(e) => setArtmakerId(Number(e.target.value))}
                    className="w-full h-10 rounded-lg border border-gray-800 bg-[#0A0A0A] px-3 font-bold text-white text-sm"
                  >
                    {artmakers.map((am) => (
                      <option key={am.id} value={am.id}>
                        {am.name} ({am.city})
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label
                  htmlFor="artwork-title"
                  className="text-xs font-bold text-gray-400 uppercase tracking-wider"
                >
                  Artwork Title
                </Label>
                <Input
                  id="artwork-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Neon Reflection No. 4"
                  className="font-bold"
                />
              </div>

              {/* Artwork Photo Uploader */}
              <ArtsImageUploader
                label="Artwork Photo / Image"
                value={imageUrl}
                onChange={setImageUrl}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="artwork-medium"
                    className="text-xs font-bold text-gray-400 uppercase tracking-wider"
                  >
                    Medium
                  </Label>
                  <Input
                    id="artwork-medium"
                    value={medium}
                    onChange={(e) => setMedium(e.target.value)}
                    placeholder="Acrylic on Canvas"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="artwork-year"
                    className="text-xs font-bold text-gray-400 uppercase tracking-wider"
                  >
                    Year Created
                  </Label>
                  <Input
                    id="artwork-year"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="2026"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  id="forSale"
                  checked={forSale}
                  onChange={(e) => setForSale(e.target.checked)}
                  className="size-4 rounded border-gray-800 bg-[#0A0A0A] text-[#7CFC00]"
                />
                <Label htmlFor="forSale" className="font-bold text-sm text-white cursor-pointer">
                  Available for Sale / Price Attached
                </Label>
              </div>

              {forSale ? (
                <div className="space-y-2">
                  <Label
                    htmlFor="artwork-price"
                    className="text-xs font-bold text-gray-400 uppercase tracking-wider"
                  >
                    Price (USD $)
                  </Label>
                  <Input
                    id="artwork-price"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="250.00"
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <Label
                  htmlFor="artwork-desc"
                  className="text-xs font-bold text-gray-400 uppercase tracking-wider"
                >
                  Description / Curator Statement
                </Label>
                <Textarea
                  id="artwork-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Notes on composition, inspiration, or gallery display..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 border-gray-800 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#7CFC00] font-black text-black hover:bg-[#7CFC00]/90"
                >
                  {isSubmitting ? "Saving..." : editingArtwork ? "Update Artwork" : "Save Artwork"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Quick Artmaker Modal */}
      {isArtmakerModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-800 bg-[#111111] p-6 space-y-4">
            <h3 className="font-black text-xl text-white">Add Artmaker On-The-Fly</h3>
            <form onSubmit={handleQuickCreateArtmaker} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="qa-name" className="text-xs font-bold text-gray-400 uppercase">
                  Artist / Studio Name
                </Label>
                <Input
                  id="qa-name"
                  value={newArtmakerName}
                  onChange={(e) => setNewArtmakerName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qa-city" className="text-xs font-bold text-gray-400 uppercase">
                  City
                </Label>
                <Input
                  id="qa-city"
                  value={newArtmakerCity}
                  onChange={(e) => setNewArtmakerCity(e.target.value)}
                  placeholder="Little Rock"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsArtmakerModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#7CFC00] font-black text-black hover:bg-[#7CFC00]/90"
                >
                  Save Artmaker
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </ArtsAdminShell>
  );
}
