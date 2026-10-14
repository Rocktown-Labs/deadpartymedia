import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Image as UniImage } from "@unpic/react";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Edit,
  Eye,
  EyeOff,
  LayoutGrid,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
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
import { getMediumGroupForMedium, MEDIUM_GROUPS } from "#/lib/mediums.ts";

export const Route = createFileRoute("/admin/exhibitions")({
  beforeLoad: () => requireArtsStaff(),
  validateSearch: (search: Record<string, unknown>) => {
    if (search.form === "new") {
      return { form: "new" as const };
    }
    if (typeof search.form === "string" && /^\d+$/.test(search.form)) {
      return { form: Number(search.form) };
    }
    return {};
  },
  component: AdminExhibitions,
  loader: async () => {
    const [artworks, artmakers] = await Promise.all([listAdminArtworks(), listAdminArtmakers()]);
    return { artmakers, artworks };
  },
});

type AdminExhibitionsLoader = Awaited<ReturnType<typeof Route.useLoaderData>>;
type AdminArtmaker = AdminExhibitionsLoader["artmakers"][number];

interface ArtworkCardProps {
  artwork: ArtworkListItem;
  onToggleStatus: (id: number) => void;
  onEdit: (artwork: ArtworkListItem) => void;
  onDelete: (id: number) => void;
}

function ArtworkCard({ artwork, onToggleStatus, onEdit, onDelete }: ArtworkCardProps) {
  return (
    <article className="group flex flex-col justify-between overflow-hidden rounded-xl border border-gray-800 bg-[#111111]">
      <div>
        <div className="relative aspect-square overflow-hidden bg-black">
          <UniImage
            src={artwork.image}
            alt={artwork.title}
            width={640}
            height={640}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>

        <div className="p-4 space-y-1">
          <h3 className="font-black text-base text-white tracking-tight">{artwork.title}</h3>
          <p className="text-gray-400 text-xs">{artwork.medium ?? "Mixed practice"}</p>
          {artwork.forSale && artwork.priceCents ? (
            <p className="font-black text-[#7CFC00] text-xs">
              ${(artwork.priceCents / 100).toFixed(2)} USD
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between border-gray-800 border-t px-4 py-3">
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
            onClick={() => onToggleStatus(artwork.id)}
            title={artwork.status === "published" ? "Move to drafts" : "Publish to wall"}
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
            onClick={() => onEdit(artwork)}
            title="Edit Artwork"
          >
            <Edit className="size-4" />
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => onDelete(artwork.id)}
            title="Delete Artwork"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </article>
  );
}

function AdminExhibitions() {
  const staff = Route.useRouteContext();
  const { artmakers: initialArtmakers, artworks: initialArtworks } =
    Route.useLoaderData<AdminExhibitionsLoader>();
  const [artworks, setArtworks] = useState<ArtworkListItem[]>(initialArtworks);
  const [artmakers, setArtmakers] = useState<AdminArtmaker[]>(initialArtmakers);
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const isModalOpen = search.form !== undefined;
  const closeForm = () => {
    navigate({ search: { form: undefined } });
  };
  const [editingArtwork, setEditingArtwork] = useState<ArtworkListItem | null>(null);

  // Grouped views: by artist (default) or by medium category.
  const [view, setView] = useState<"artists" | "mediums">("artists");
  const [expandedArtistId, setExpandedArtistId] = useState<number | null>(null);

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
    navigate({ search: { form: "new" } });
    setEditingArtwork(null);
    setTitle("");
    setArtmakerId(artmakers[0]?.id ?? 0);
    setImageUrl("");
    setMedium("Oil on Canvas");
    setYear(new Date().getFullYear().toString());
    setDescription("");
    setForSale(false);
    setPrice("");
  };

  const openEditModal = (artwork: ArtworkListItem) => {
    navigate({ search: { form: artwork.id } });
    setEditingArtwork(artwork);
    setTitle(artwork.title);
    setArtmakerId(artwork.artmakerId);
    setImageUrl(artwork.image);
    setMedium(artwork.medium || "");
    setYear(artwork.year || "");
    setDescription(artwork.description || "");
    setForSale(artwork.forSale);
    setPrice(artwork.priceCents ? (artwork.priceCents / 100).toFixed(2) : "");
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

      closeForm();
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

  // Artist view: group by artmaker, largest collections first. Uses the
  // artmaker name from the artwork row so deleted/renamed artists stay accurate.
  const artistGroups = useMemo(() => {
    const groups = new Map<
      number,
      { artmakerId: number; artmakerName: string; works: ArtworkListItem[] }
    >();
    for (const artwork of artworks) {
      const existing = groups.get(artwork.artmakerId);
      if (existing) {
        existing.works.push(artwork);
      } else {
        groups.set(artwork.artmakerId, {
          artmakerId: artwork.artmakerId,
          artmakerName: artwork.artmakerName,
          works: [artwork],
        });
      }
    }
    return [...groups.values()].sort(
      (a, b) => b.works.length - a.works.length || a.artmakerName.localeCompare(b.artmakerName),
    );
  }, [artworks]);

  // Medium view: same exclusive grouping the public wall uses, so an artwork
  // appears in exactly one category.
  const mediumGroups = useMemo(() => {
    const groups = new Map<string, { label: string; works: ArtworkListItem[] }>();
    for (const artwork of artworks) {
      const group = getMediumGroupForMedium(artwork.medium ?? "");
      const existing = groups.get(group.slug);
      if (existing) {
        existing.works.push(artwork);
      } else {
        groups.set(group.slug, { label: group.label, works: [artwork] });
      }
    }
    return MEDIUM_GROUPS.flatMap((group) => {
      const entry = groups.get(group.slug);
      return entry ? [{ slug: group.slug, label: entry.label, works: entry.works }] : [];
    });
  }, [artworks]);

  const artworkActions = {
    onToggleStatus: handleToggleStatus,
    onEdit: openEditModal,
    onDelete: handleDelete,
  };

  const toggleClasses = (active: boolean) =>
    `flex items-center gap-1.5 rounded-lg px-3 py-2 font-black text-xs uppercase tracking-[0.14em] transition-colors ${
      active
        ? "bg-[#7CFC00] text-black"
        : "border border-gray-800 bg-[#111111] text-gray-400 hover:text-white"
    }`;

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

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2" role="group" aria-label="Group artworks by">
          <button
            type="button"
            onClick={() => setView("artists")}
            className={toggleClasses(view === "artists")}
          >
            <Users className="size-4" />
            By Artist
          </button>
          <button
            type="button"
            onClick={() => setView("mediums")}
            className={toggleClasses(view === "mediums")}
          >
            <LayoutGrid className="size-4" />
            By Medium
          </button>
        </div>
        <p className="text-gray-500 text-xs">
          {artworks.length} artwork{artworks.length === 1 ? "" : "s"} on the wall
        </p>
      </div>

      {artworks.length === 0 ? (
        <div className="rounded-lg border border-gray-800 bg-[#111111] p-8 text-center text-gray-400">
          No artworks exhibit on the wall yet. Click "Add Artwork" to curate one!
        </div>
      ) : view === "artists" ? (
        <div className="space-y-3">
          {artistGroups.map((group) => {
            const isExpanded = expandedArtistId === group.artmakerId;
            return (
              <section
                key={group.artmakerId}
                className="overflow-hidden rounded-xl border border-gray-800 bg-[#111111]"
              >
                <button
                  type="button"
                  onClick={() => setExpandedArtistId(isExpanded ? null : group.artmakerId)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-gray-900/40 sm:px-5"
                  aria-expanded={isExpanded}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="size-4 shrink-0 text-[#7CFC00]" />
                    ) : (
                      <ChevronRight className="size-4 shrink-0 text-gray-500" />
                    )}
                    <Building2 className="hidden size-4 shrink-0 text-gray-500 sm:block" />
                    <span className="truncate font-bold text-white">{group.artmakerName}</span>
                  </span>
                  <span className="shrink-0 rounded bg-[#7CFC00]/15 px-2 py-1 font-bold text-[#7CFC00] text-xs">
                    {group.works.length} work{group.works.length === 1 ? "" : "s"}
                  </span>
                </button>
                {isExpanded ? (
                  <div className="border-gray-800 border-t p-4 sm:p-5">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {group.works.map((artwork) => (
                        <ArtworkCard key={artwork.id} artwork={artwork} {...artworkActions} />
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="space-y-6">
          {mediumGroups.map((group) => (
            <section key={group.slug}>
              <div className="mb-3 flex items-center gap-3">
                <h2 className="font-bold text-lg text-white">{group.label}</h2>
                <span className="rounded bg-[#7CFC00]/15 px-2 py-1 font-bold text-[#7CFC00] text-xs">
                  {group.works.length}
                </span>
              </div>
              <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-3">
                {group.works.map((artwork) => (
                  <div key={artwork.id} className="w-60 shrink-0 sm:w-64">
                    <ArtworkCard artwork={artwork} {...artworkActions} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Artwork Modal */}
      {isModalOpen ? (
        <div className="mx-auto mt-8 max-w-xl rounded-xl border border-gray-800 bg-[#111111] p-6 space-y-6">
          <div className="flex items-center justify-between border-gray-800 border-b pb-4">
            <h2 className="font-black text-2xl text-white">
              {editingArtwork ? "Edit Artwork" : "Add Artwork to Exhibition"}
            </h2>
            <button type="button" onClick={closeForm} className="text-gray-400 hover:text-white">
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
                  className="h-10 w-full rounded-lg border border-gray-800 bg-[#0A0A0A] px-3 font-bold text-sm text-white"
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
              <Label htmlFor="forSale" className="cursor-pointer font-bold text-sm text-white">
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
              <Button type="button" variant="outline" onClick={closeForm}>
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
