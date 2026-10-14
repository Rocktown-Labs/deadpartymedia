import {
  createColumnHelper,
  createFilteredRowModel,
  createSortedRowModel,
  columnFilteringFeature,
  filterFn_equalsString,
  filterFn_includesString,
  rowSortingFeature,
  sortFn_alphanumeric,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Edit,
  Eye,
  EyeOff,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArtsAdminShell } from "#/components/arts-admin-shell.tsx";
import { ArtsImageUploader } from "#/components/arts-image-uploader.tsx";
import { MultiSelect } from "#/components/multi-select.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import { listAdminArtmakers } from "#/lib/admin.functions.ts";
import { MEDIUM_OPTIONS } from "#/lib/artmakers.ts";
import {
  createArtsArtmakerStub,
  deleteArtsArtmaker,
  requireArtsStaff,
  toggleArtsArtmakerVisibility,
  updateArtsArtmaker,
} from "#/lib/artmakers.functions.ts";

export const Route = createFileRoute("/admin/artmakers")({
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
  component: AdminArtmakers,
  loader: () => listAdminArtmakers(),
});

type ArtmakerRow = Awaited<ReturnType<typeof listAdminArtmakers>>[number];

const adminTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric },
  columnFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  filterFns: {
    includesString: filterFn_includesString,
    equalsString: filterFn_equalsString,
  },
});

const columnHelper = createColumnHelper<typeof adminTableFeatures, ArtmakerRow>();

interface AdminTableMeta {
  onToggleVisibility: (id: number) => void;
  onEdit: (artmaker: ArtmakerRow) => void;
  onDelete: (id: number) => void;
}

const statusFilterOptions = [
  { label: "All statuses", value: "" },
  { label: "Published", value: "published" },
  { label: "Draft", value: "draft" },
  { label: "Hidden", value: "hidden" },
];

const adminColumns = columnHelper.columns([
  columnHelper.accessor("name", {
    header: "Name",
    filterFn: "includesString",
    cell: (context) => {
      const artmaker = context.row.original;
      return (
        <Link
          to="/artmakers/$slug"
          params={{ slug: artmaker.slug }}
          className="font-bold text-white no-underline hover:text-[#7CFC00]"
        >
          {artmaker.name}
        </Link>
      );
    },
  }),
  columnHelper.accessor((row) => `${row.city}, ${row.state}`, {
    id: "city",
    header: "City",
    filterFn: "includesString",
    cell: (context) => <span className="text-gray-400 text-sm">{context.getValue()}</span>,
  }),
  columnHelper.accessor((row) => row.instagramUsername ?? "", {
    id: "instagram",
    header: "Instagram",
    filterFn: "includesString",
    cell: (context) => (
      <span className="text-gray-400 text-sm">
        {context.row.original.instagramUsername
          ? `@${context.row.original.instagramUsername}`
          : "—"}
      </span>
    ),
  }),
  columnHelper.accessor((row) => row.medium.join(", ") || "Visual Art", {
    id: "medium",
    header: "Medium",
    filterFn: "includesString",
    cell: (context) => <span className="text-gray-400 text-sm">{context.getValue()}</span>,
  }),
  columnHelper.accessor((row) => (row.hidden ? "hidden" : row.status), {
    id: "status",
    header: "Status",
    filterFn: "equalsString",
    cell: (context) => {
      const artmaker = context.row.original;
      return (
        <span
          className={`rounded px-2 py-1 font-bold text-xs uppercase ${
            artmaker.hidden ? "bg-red-500/15 text-red-400" : "bg-[#7CFC00]/15 text-[#7CFC00]"
          }`}
        >
          {artmaker.hidden ? "hidden" : artmaker.status}
        </span>
      );
    },
  }),
  columnHelper.display({
    id: "actions",
    header: "Actions",
    cell: (context) => {
      const meta = context.table.options.meta as AdminTableMeta;
      const artmaker = context.row.original;
      return (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => meta.onToggleVisibility(artmaker.id)}
            title={artmaker.hidden ? "Unhide Profile" : "Hide Profile"}
          >
            {artmaker.hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => meta.onEdit(artmaker)}
            title="Edit Artmaker"
          >
            <Edit className="size-4" />
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => meta.onDelete(artmaker.id)}
            title="Delete Artmaker"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      );
    },
  }),
]);

function AdminArtmakers() {
  const staff = Route.useRouteContext();
  const initialArtmakers = Route.useLoaderData();
  const [artmakers, setArtmakers] = useState<ArtmakerRow[]>(initialArtmakers);
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const isModalOpen = search.form !== undefined;
  const closeForm = () => {
    navigate({ search: { form: undefined } });
  };
  const [editingArtmaker, setEditingArtmaker] = useState<ArtmakerRow | null>(null);

  const [name, setName] = useState("");
  const [city, setCity] = useState("Little Rock");
  const [stateName, setStateName] = useState("AR");
  const [bio, setBio] = useState("");
  const [image, setImage] = useState("");
  const [instagram, setInstagram] = useState("");
  const [medium, setMedium] = useState<string[]>(["Visual Art"]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // The search box narrows the rows before TanStack's column filters and
  // sorting run, so the two compose.
  const [query, setQuery] = useState("");

  const createStubFn = useServerFn(createArtsArtmakerStub);
  const updateArtmakerFn = useServerFn(updateArtsArtmaker);
  const toggleVisibilityFn = useServerFn(toggleArtsArtmakerVisibility);
  const deleteArtmakerFn = useServerFn(deleteArtsArtmaker);

  const openNewModal = () => {
    navigate({ search: { form: "new" } });
    setEditingArtmaker(null);
    setName("");
    setCity("Little Rock");
    setStateName("AR");
    setBio("");
    setImage("");
    setInstagram("");
    setMedium(["Visual Art"]);
  };

  const openEditModal = (artmaker: ArtmakerRow) => {
    navigate({ search: { form: artmaker.id } });
    setEditingArtmaker(artmaker);
    setName(artmaker.name);
    setCity(artmaker.city);
    setStateName(artmaker.state);
    setBio(artmaker.bio ?? "");
    setImage(artmaker.image ?? "");
    setInstagram(artmaker.instagramUsername || "");
    setMedium(artmaker.medium.length ? artmaker.medium : ["Visual Art"]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !city.trim()) {
      toast.error("Name and City are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingArtmaker) {
        await updateArtmakerFn({
          data: {
            bio,
            city,
            hidden: editingArtmaker.hidden,
            id: editingArtmaker.id,
            image,
            instagramUsername: instagram.replace(/^@/, ""),
            medium,
            name,
            state: stateName,
            status: editingArtmaker.status,
          },
        });
        toast.success("Artmaker profile updated");
      } else {
        await createStubFn({
          data: {
            city,
            image,
            instagramUsername: instagram.replace(/^@/, ""),
            medium,
            name,
            state: stateName,
          },
        });
        toast.success("Artmaker profile created");
      }

      closeForm();
      const updated = await listAdminArtmakers();
      setArtmakers(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save artmaker");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleVisibility = async (id: number) => {
    try {
      await toggleVisibilityFn({ data: { id } });
      toast.success("Artmaker visibility updated");
      const updated = await listAdminArtmakers();
      setArtmakers(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle visibility");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this artmaker profile?")) {
      return;
    }
    try {
      await deleteArtmakerFn({ data: { id } });
      toast.success("Artmaker profile deleted");
      setArtmakers((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete artmaker");
    }
  };

  const meta: AdminTableMeta = {
    onToggleVisibility: handleToggleVisibility,
    onEdit: openEditModal,
    onDelete: handleDelete,
  };

  const searchedArtmakers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return artmakers;
    }
    return artmakers.filter((artmaker) =>
      [
        artmaker.name,
        artmaker.city,
        artmaker.state,
        artmaker.instagramUsername ?? "",
        artmaker.medium.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [artmakers, query]);

  const table = useTable({
    features: adminTableFeatures,
    columns: adminColumns,
    data: searchedArtmakers,
    getRowId: (row) => String(row.id),
    meta,
  });

  const totalRows = artmakers.length;
  const visibleRows = table.getFilteredRowModel().rows.length;

  return (
    <ArtsAdminShell role={staff.role}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-black text-4xl tracking-tight">Artmakers</h1>
          <p className="mt-3 max-w-2xl text-gray-400">
            Manage Arkansas visual artmakers, medium tags, and profile visibility.
          </p>
        </div>
        <Button
          type="button"
          onClick={openNewModal}
          className="rounded-lg bg-[#7CFC00] font-black text-black text-xs uppercase tracking-[0.18em] hover:bg-[#7CFC00]/90"
        >
          <Plus className="mr-2 size-4" />
          Add Artmaker
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-500" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, city, Instagram, medium…"
            className="pl-9"
            aria-label="Search artmakers"
          />
        </div>
        <p className="text-gray-500 text-xs">
          Showing {visibleRows} of {totalRows} artmakers
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-800 bg-[#111111]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-[#0A0A0A] text-gray-300 text-xs uppercase tracking-wider">
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  {group.headers.map((header) => {
                    const column = header.column;
                    const sortable = column.getCanSort?.() ?? false;
                    const sorted = sortable ? column.getIsSorted?.() : false;
                    return (
                      <th key={header.id} className="px-4 py-3">
                        {header.isPlaceholder ? null : (
                          <button
                            type="button"
                            onClick={sortable ? column.getToggleSortingHandler?.() : undefined}
                            className={`flex items-center gap-1 font-bold uppercase tracking-wider ${
                              sortable ? "cursor-pointer hover:text-white" : "cursor-default"
                            } ${sorted ? "text-[#7CFC00]" : ""}`}
                          >
                            <table.FlexRender header={header} />
                            {sorted === "asc" ? (
                              <ArrowUp className="size-3" />
                            ) : sorted === "desc" ? (
                              <ArrowDown className="size-3" />
                            ) : sortable ? (
                              <ArrowUpDown className="size-3 text-gray-600" />
                            ) : null}
                          </button>
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-gray-800 border-t">
                {table.getFlatHeaders().map((header) => {
                  const column = header.column;
                  if (!(column.getCanFilter?.() ?? false)) {
                    return <th key={header.id} className="px-4 py-2" />;
                  }
                  const filterValue = (column.getFilterValue?.() as string) ?? "";
                  return (
                    <th key={header.id} className="px-4 py-2">
                      {column.id === "status" ? (
                        <select
                          value={filterValue}
                          onChange={(e) => column.setFilterValue?.(e.target.value)}
                          className="h-7 w-full rounded border border-gray-800 bg-[#111111] px-1.5 text-xs text-gray-300"
                          aria-label="Filter by status"
                        >
                          {statusFilterOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={filterValue}
                          onChange={(e) => column.setFilterValue?.(e.target.value)}
                          placeholder="Filter…"
                          className="h-7 w-full rounded border border-gray-800 bg-[#111111] px-2 text-xs text-gray-200 placeholder:text-gray-600"
                          aria-label={`Filter by ${header.column.id}`}
                        />
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    No artmakers match these filters.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-gray-800 border-t hover:bg-gray-900/50">
                    {row.getAllCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-4 align-middle">
                        <table.FlexRender cell={cell} />
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Artmaker form — rendered as a full page via ?form=new or ?form=<id> */}
      {isModalOpen ? (
        <div className="mx-auto max-w-3xl rounded-xl border border-gray-800 bg-[#111111] p-6 space-y-6">
          <div className="flex items-center justify-between border-gray-800 border-b pb-4">
            <h2 className="font-black text-2xl text-white">
              {editingArtmaker ? "Edit Artmaker Profile" : "Add New Artmaker"}
            </h2>
            <button type="button" onClick={closeForm} className="text-gray-400 hover:text-white">
              ✕
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="artmaker-name"
                className="text-xs font-bold text-gray-400 uppercase tracking-wider"
              >
                Full Name / Studio Name
              </Label>
              <Input
                id="artmaker-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="font-bold"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label
                  htmlFor="artmaker-city"
                  className="text-xs font-bold text-gray-400 uppercase tracking-wider"
                >
                  City
                </Label>
                <Input
                  id="artmaker-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Little Rock"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="artmaker-state"
                  className="text-xs font-bold text-gray-400 uppercase tracking-wider"
                >
                  State
                </Label>
                <Input
                  id="artmaker-state"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  placeholder="AR"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="artmaker-ig"
                className="text-xs font-bold text-gray-400 uppercase tracking-wider"
              >
                Instagram Handle
              </Label>
              <Input
                id="artmaker-ig"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@janedoeart"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Mediums
              </Label>
              <MultiSelect
                options={MEDIUM_OPTIONS.map((option) => ({ label: option, value: option }))}
                selected={medium}
                onChange={(next) => setMedium(next.map(String))}
                placeholder="Select mediums"
              />
            </div>

            <ArtsImageUploader
              label="Profile / Avatar Image"
              value={image}
              onChange={setImage}
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            />

            <div className="space-y-2">
              <Label
                htmlFor="artmaker-bio"
                className="text-xs font-bold text-gray-400 uppercase tracking-wider"
              >
                Artist Bio
              </Label>
              <Textarea
                id="artmaker-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Short bio..."
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
                {isSubmitting ? "Saving..." : editingArtmaker ? "Update Profile" : "Create Profile"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </ArtsAdminShell>
  );
}
