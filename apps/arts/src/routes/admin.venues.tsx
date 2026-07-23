import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Edit, MapPin, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ArtsAdminShell } from "#/components/arts-admin-shell.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { requireArtsStaff } from "#/lib/artmakers.functions.ts";
import {
  createArtsVenue,
  deleteArtsVenue,
  listArtsVenues,
  updateArtsVenue,
  type VenueListItem,
} from "#/lib/venues.functions.ts";

export const Route = createFileRoute("/admin/venues")({
  beforeLoad: () => requireArtsStaff(),
  component: AdminVenues,
  loader: () => listArtsVenues(),
});

function AdminVenues() {
  const staff = Route.useRouteContext();
  const initialVenues = Route.useLoaderData();
  const [venues, setVenues] = useState<VenueListItem[]>(initialVenues);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<VenueListItem | null>(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Little Rock");
  const [stateName, setStateName] = useState("AR");
  const [zip, setZip] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createVenueFn = useServerFn(createArtsVenue);
  const updateVenueFn = useServerFn(updateArtsVenue);
  const deleteVenueFn = useServerFn(deleteArtsVenue);

  const openNewModal = () => {
    setEditingVenue(null);
    setName("");
    setAddress("");
    setCity("Little Rock");
    setStateName("AR");
    setZip("");
    setWebsite("");
    setPhone("");
    setIsModalOpen(true);
  };

  const openEditModal = (venue: VenueListItem) => {
    setEditingVenue(venue);
    setName(venue.name);
    setAddress(venue.address || "");
    setCity(venue.city);
    setStateName(venue.state);
    setZip(venue.zip || "");
    setWebsite(venue.website || "");
    setPhone(venue.phone || "");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !city.trim()) {
      toast.error("Venue name and City are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingVenue) {
        await updateVenueFn({
          data: {
            address,
            city,
            id: editingVenue.id,
            name,
            phone,
            state: stateName,
            website,
            zip,
          },
        });
        toast.success("Venue updated successfully");
      } else {
        await createVenueFn({
          data: {
            address,
            city,
            name,
            phone,
            state: stateName,
            website,
            zip,
          },
        });
        toast.success("Venue created successfully");
      }

      setIsModalOpen(false);
      const updated = await listArtsVenues();
      setVenues(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save venue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this venue?")) {
      return;
    }
    try {
      await deleteVenueFn({ data: { id } });
      toast.success("Venue deleted");
      setVenues((prev) => prev.filter((v) => v.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete venue");
    }
  };

  return (
    <ArtsAdminShell role={staff.role}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-black text-4xl tracking-tight">Venues</h1>
          <p className="mt-3 max-w-2xl text-gray-400">
            Log and manage exhibition spaces, galleries, and event venues across Arkansas.
          </p>
        </div>
        <Button
          type="button"
          onClick={openNewModal}
          className="rounded-lg bg-[#7CFC00] font-black text-black text-xs uppercase tracking-[0.18em] hover:bg-[#7CFC00]/90"
        >
          <Plus className="mr-2 size-4" />
          Add Venue
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-800 bg-[#111111]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-[#0A0A0A] text-gray-300 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Venue Name</th>
                <th className="px-6 py-4">Address</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Website</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {venues.length > 0 ? (
                venues.map((venue) => (
                  <tr key={venue.id} className="border-gray-800 border-t hover:bg-gray-900/50">
                    <td className="px-6 py-4 font-bold text-white">
                      <div className="flex items-center gap-2">
                        <MapPin className="size-4 text-[#7CFC00]" />
                        <span>{venue.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">{venue.address || "—"}</td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {venue.city}, {venue.state}
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {venue.website ? (
                        <a
                          href={
                            venue.website.startsWith("http")
                              ? venue.website
                              : `https://${venue.website}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#7CFC00] hover:underline"
                        >
                          Visit Site ↗
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(venue)}
                          title="Edit Venue"
                        >
                          <Edit className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(venue.id)}
                          title="Delete Venue"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">
                    No venues logged yet. Click "Add Venue" to create one!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Venue Modal */}
      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
          <div className="my-8 w-full max-w-lg rounded-xl border border-gray-800 bg-[#111111] p-6 space-y-6">
            <div className="flex items-center justify-between border-gray-800 border-b pb-4">
              <h2 className="font-black text-2xl text-white">
                {editingVenue ? "Edit Venue" : "Log New Venue"}
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
                  htmlFor="venue-name"
                  className="text-xs font-bold text-gray-400 uppercase tracking-wider"
                >
                  Venue / Gallery Name
                </Label>
                <Input
                  id="venue-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Arkansas Museum of Fine Arts"
                  className="font-bold"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="venue-address"
                  className="text-xs font-bold text-gray-400 uppercase tracking-wider"
                >
                  Street Address
                </Label>
                <Input
                  id="venue-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 501 E 9th St"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label
                    htmlFor="venue-city"
                    className="text-xs font-bold text-gray-400 uppercase tracking-wider"
                  >
                    City
                  </Label>
                  <Input
                    id="venue-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Little Rock"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="venue-state"
                    className="text-xs font-bold text-gray-400 uppercase tracking-wider"
                  >
                    State
                  </Label>
                  <Input
                    id="venue-state"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    placeholder="AR"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="venue-zip"
                    className="text-xs font-bold text-gray-400 uppercase tracking-wider"
                  >
                    ZIP Code
                  </Label>
                  <Input
                    id="venue-zip"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="72202"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="venue-website"
                    className="text-xs font-bold text-gray-400 uppercase tracking-wider"
                  >
                    Website URL
                  </Label>
                  <Input
                    id="venue-website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="venue-phone"
                    className="text-xs font-bold text-gray-400 uppercase tracking-wider"
                  >
                    Phone Number
                  </Label>
                  <Input
                    id="venue-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(501) 372-4000"
                  />
                </div>
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
                  {isSubmitting ? "Saving..." : editingVenue ? "Update Venue" : "Save Venue"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </ArtsAdminShell>
  );
}
