import { uploadFiles } from "@better-upload/client";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Edit, Eye, EyeOff, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ArtsAdminShell } from "#/components/arts-admin-shell.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import { MEDIUM_OPTIONS } from "#/lib/artmakers.ts";
import {
  createArtsArtmakerStub,
  deleteArtsArtmaker,
  requireArtsStaff,
  toggleArtsArtmakerVisibility,
  updateArtsArtmaker,
} from "#/lib/artmakers.functions.ts";
import { getUploadedObjectKey } from "#/lib/artwork-drafts.ts";
import { getPublicUploadUrl } from "#/lib/upload.ts";
import { listAdminArtmakers } from "#/lib/admin.functions.ts";

export const Route = createFileRoute("/admin/artmakers")({
  beforeLoad: () => requireArtsStaff(),
  component: AdminArtmakers,
  loader: () => listAdminArtmakers(),
});

type ArtmakerRow = Awaited<ReturnType<typeof listAdminArtmakers>>[number];

function AdminArtmakers() {
  const staff = Route.useRouteContext();
  const initialArtmakers = Route.useLoaderData();
  const [artmakers, setArtmakers] = useState<ArtmakerRow[]>(initialArtmakers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArtmaker, setEditingArtmaker] = useState<ArtmakerRow | null>(null);

  const [name, setName] = useState("");
  const [city, setCity] = useState("Little Rock");
  const [stateName, setStateName] = useState("AR");
  const [bio, setBio] = useState("");
  const [image, setImage] = useState("");
  const [instagram, setInstagram] = useState("");
  const [medium, setMedium] = useState<string[]>(["Visual Art"]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createStubFn = useServerFn(createArtsArtmakerStub);
  const updateArtmakerFn = useServerFn(updateArtsArtmaker);
  const toggleVisibilityFn = useServerFn(toggleArtsArtmakerVisibility);
  const deleteArtmakerFn = useServerFn(deleteArtsArtmaker);

  const profileImageUploadMutation = useMutation({
    mutationFn: async (files: File[]) =>
      uploadFiles({
        files,
        route: "profileImages",
      }),
    onError: (caughtError) => {
      toast.error(caughtError instanceof Error ? caughtError.message : "Image upload failed");
    },
    onSuccess: (result) => {
      const [uploadedFile] = (result.files ?? []) as unknown[];
      const key = uploadedFile ? getUploadedObjectKey(uploadedFile) : "";

      if (!key) {
        toast.error("The image uploaded, but no object key came back from storage.");
        return;
      }

      setImage(getPublicUploadUrl(key));
    },
  });

  const openNewModal = () => {
    setEditingArtmaker(null);
    setName("");
    setCity("Little Rock");
    setStateName("AR");
    setBio("");
    setImage("");
    setInstagram("");
    setMedium(["Visual Art"]);
    setIsModalOpen(true);
  };

  const openEditModal = (artmaker: ArtmakerRow) => {
    setEditingArtmaker(artmaker);
    setName(artmaker.name);
    setCity(artmaker.city);
    setStateName(artmaker.state);
    setBio(artmaker.bio ?? "");
    setImage(artmaker.image ?? "");
    setInstagram(artmaker.instagramUsername || "");
    setMedium(artmaker.medium.length ? artmaker.medium : ["Visual Art"]);
    setIsModalOpen(true);
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

      setIsModalOpen(false);
      const updated = await listAdminArtmakers();
      setArtmakers(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save artmaker");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMedium = (value: string) => {
    setMedium((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
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

      <div className="overflow-hidden rounded-lg border border-gray-800 bg-[#111111]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className="bg-[#0A0A0A] text-gray-300 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">City</th>
                <th className="px-6 py-4">Instagram</th>
                <th className="px-6 py-4">Medium</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {artmakers.map((artmaker) => (
                <tr key={artmaker.id} className="border-gray-800 border-t hover:bg-gray-900/50">
                  <td className="px-6 py-4">
                    <Link
                      to="/artmakers/$slug"
                      params={{ slug: artmaker.slug }}
                      className="font-bold text-white no-underline hover:text-[#7CFC00]"
                    >
                      {artmaker.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {artmaker.city}, {artmaker.state}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {artmaker.instagramUsername ? `@${artmaker.instagramUsername}` : "—"}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {artmaker.medium.slice(0, 3).join(", ") || "Visual Art"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded px-2 py-1 font-bold text-xs uppercase ${
                        artmaker.hidden
                          ? "bg-red-500/15 text-red-400"
                          : "bg-[#7CFC00]/15 text-[#7CFC00]"
                      }`}
                    >
                      {artmaker.hidden ? "hidden" : artmaker.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleVisibility(artmaker.id)}
                        title={artmaker.hidden ? "Unhide Profile" : "Hide Profile"}
                      >
                        {artmaker.hidden ? (
                          <Eye className="size-4" />
                        ) : (
                          <EyeOff className="size-4" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(artmaker)}
                        title="Edit Artmaker"
                      >
                        <Edit className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(artmaker.id)}
                        title="Delete Artmaker"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Artmaker Modal */}
      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
          <div className="my-8 w-full max-w-3xl rounded-xl border border-gray-800 bg-[#111111] p-6 space-y-6">
            <div className="flex items-center justify-between border-gray-800 border-b pb-4">
              <h2 className="font-black text-2xl text-white">
                {editingArtmaker ? "Edit Artmaker Profile" : "Add New Artmaker"}
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
                <Label
                  htmlFor="artmaker-medium"
                  className="text-xs font-bold text-gray-400 uppercase tracking-wider"
                >
                  Mediums
                </Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {MEDIUM_OPTIONS.map((option) => {
                    const selected = medium.includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => toggleMedium(option)}
                        className={`flex min-h-10 items-center justify-between gap-3 border px-3 text-left text-sm ${
                          selected
                            ? "border-[#7CFC00] bg-[#7CFC00] text-black"
                            : "border-gray-800 bg-[#080808] text-gray-300 hover:border-gray-600"
                        }`}
                      >
                        <span>{option}</span>
                        {selected ? <Check className="size-4" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="artmaker-image"
                  className="text-xs font-bold text-gray-400 uppercase tracking-wider"
                >
                  Profile Image
                </Label>
                {image ? (
                  <img
                    src={image}
                    alt=""
                    className="aspect-video w-full rounded-lg border border-gray-800 object-cover"
                  />
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Input
                    id="artmaker-image"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    placeholder="https://..."
                    className="min-w-64 flex-1"
                  />
                  <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-gray-800 px-3 font-black text-white text-xs uppercase tracking-[0.14em] hover:border-[#7CFC00] hover:text-[#7CFC00]">
                    {profileImageUploadMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={profileImageUploadMutation.isPending}
                      onChange={(event) => {
                        const files = [...(event.target.files ?? [])];
                        if (files.length > 0) {
                          profileImageUploadMutation.mutate(files);
                        }
                        event.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>

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
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#7CFC00] font-black text-black hover:bg-[#7CFC00]/90"
                >
                  {isSubmitting
                    ? "Saving..."
                    : editingArtmaker
                      ? "Update Profile"
                      : "Create Profile"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </ArtsAdminShell>
  );
}
