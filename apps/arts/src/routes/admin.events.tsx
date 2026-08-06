import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff, Plus, Trash2, UserPlus } from "lucide-react";
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
  createArtsEvent,
  deleteArtsEvent,
  listArtsAdminEvents,
  toggleArtsEventStatus,
  type ArtsEventListItem,
} from "#/lib/content.functions.ts";
import { createArtsVenue, listArtsVenues, type VenueListItem } from "#/lib/venues.functions.ts";

export const Route = createFileRoute("/admin/events")({
  beforeLoad: () => requireArtsStaff(),
  component: AdminEvents,
  loader: async () => {
    const [events, artmakers, venues] = await Promise.all([
      listArtsAdminEvents(),
      listAdminArtmakers(),
      listArtsVenues(),
    ]);
    return { artmakers, events, venues };
  },
});

function AdminEvents() {
  const staff = Route.useRouteContext();
  const {
    artmakers: initialArtmakers,
    events: initialEvents,
    venues: initialVenues,
  } = Route.useLoaderData();
  const [events, setEvents] = useState<ArtsEventListItem[]>(initialEvents);
  const [artmakers, setArtmakers] = useState(initialArtmakers);
  const [venues, setVenues] = useState<VenueListItem[]>(initialVenues);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedVenueId, setSelectedVenueId] = useState<string>("custom");
  const [venue, setVenue] = useState("");
  const [location, setLocation] = useState("Little Rock, AR");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("7:00 PM");
  const [price, setPrice] = useState("Free");
  const [ticketLink, setTicketLink] = useState("");
  const [image, setImage] = useState("");
  const [selectedArtmakerIds, setSelectedArtmakerIds] = useState<number[]>([]);

  // Inline Quick Creation Modals
  const [isVenueModalOpen, setIsVenueModalOpen] = useState(false);
  const [newVenueName, setNewVenueName] = useState("");
  const [newVenueCity, setNewVenueCity] = useState("Little Rock");

  const [isArtmakerModalOpen, setIsArtmakerModalOpen] = useState(false);
  const [newArtmakerName, setNewArtmakerName] = useState("");
  const [newArtmakerCity, setNewArtmakerCity] = useState("Little Rock");

  const createEventFn = useServerFn(createArtsEvent);
  const toggleStatusFn = useServerFn(toggleArtsEventStatus);
  const deleteEventFn = useServerFn(deleteArtsEvent);
  const createVenueFn = useServerFn(createArtsVenue);
  const createArtmakerStubFn = useServerFn(createArtsArtmakerStub);

  const handleVenueSelect = (id: string) => {
    setSelectedVenueId(id);
    if (id !== "custom") {
      const found = venues.find((v) => String(v.id) === id);
      if (found) {
        setVenue(found.name);
        setLocation(`${found.city}, ${found.state}`);
      }
    }
  };

  const handleQuickCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVenueName.trim()) {
      toast.error("Venue name is required");
      return;
    }

    try {
      const res = await createVenueFn({
        data: {
          city: newVenueCity,
          name: newVenueName,
          state: "AR",
        },
      });
      toast.success("Venue created on the fly!");
      const updatedVenues = await listArtsVenues();
      setVenues(updatedVenues);
      setVenue(res.venue.name);
      setLocation(`${res.venue.city}, ${res.venue.state}`);
      setSelectedVenueId(String(res.venue.id));
      setIsVenueModalOpen(false);
      setNewVenueName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create venue");
    }
  };

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
      setSelectedArtmakerIds((prev) => [...prev, res.artmaker.id]);
      setIsArtmakerModalOpen(false);
      setNewArtmakerName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create artmaker");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date.trim() || !venue.trim()) {
      toast.error("Title, Date, and Venue are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createEventFn({
        data: {
          artmakerIds: selectedArtmakerIds,
          date,
          description,
          image,
          location,
          price,
          status: "published",
          ticketLink,
          time,
          title,
          venue,
        },
      });
      toast.success("Arts event created successfully!");
      setIsFormOpen(false);
      const updated = await listArtsAdminEvents();
      setEvents(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      await toggleStatusFn({ data: { id } });
      toast.success("Event status updated");
      const updated = await listArtsAdminEvents();
      setEvents(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle status");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this event?")) {
      return;
    }
    try {
      await deleteEventFn({ data: { id } });
      toast.success("Event deleted");
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete event");
    }
  };

  return (
    <ArtsAdminShell role={staff.role}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-black text-4xl tracking-tight">Events</h1>
          <p className="mt-3 max-w-2xl text-gray-400">
            Manage creative exhibitions, gallery openings, and arts community events.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="rounded-lg bg-[#7CFC00] font-black text-black text-xs uppercase tracking-[0.18em] hover:bg-[#7CFC00]/90"
          >
            <Plus className="mr-2 size-4" />
            Create Event
          </Button>
        </div>
      </div>

      {/* Events List */}
      <div className="overflow-hidden rounded-lg border border-gray-800 bg-[#111111]">
        {events.length > 0 ? (
          <div className="divide-y divide-gray-800">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-4 p-5 hover:bg-gray-900/50"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h2 className="font-bold text-lg text-white">{event.title}</h2>
                    <span
                      className={`rounded px-2 py-0.5 font-bold text-xs uppercase ${
                        event.status === "published"
                          ? "bg-[#7CFC00]/15 text-[#7CFC00]"
                          : "bg-yellow-500/15 text-yellow-400"
                      }`}
                    >
                      {event.status}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm">
                    {event.venue}, {event.location} •{" "}
                    {new Date(`${event.date}T00:00:00`).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleStatus(event.id)}
                    title={event.status === "published" ? "Unpublish" : "Publish"}
                  >
                    {event.status === "published" ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(event.id)}
                    title="Delete Event"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-8 text-center text-gray-400">
            No arts events created yet. Click "Create Event" to add one!
          </p>
        )}
      </div>

      {/* Create Event Modal */}
      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
          <div className="my-8 w-full max-w-2xl rounded-xl border border-gray-800 bg-[#111111] p-6 space-y-6">
            <div className="flex items-center justify-between border-gray-800 border-b pb-4">
              <h2 className="font-black text-2xl text-white">Create New Arts Event</h2>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="event-title"
                  className="text-xs font-bold text-gray-400 uppercase tracking-wider"
                >
                  Event Title
                </Label>
                <Input
                  id="event-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Gallery Night Little Rock"
                  className="font-bold"
                />
              </div>

              {/* Venue Selection & Quick Create */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="venue-select"
                    className="text-xs font-bold text-gray-400 uppercase tracking-wider"
                  >
                    Select Venue or Log New
                  </Label>
                  <button
                    type="button"
                    onClick={() => setIsVenueModalOpen(true)}
                    className="inline-flex items-center text-xs text-[#7CFC00] hover:underline"
                  >
                    <Plus className="mr-1 size-3" /> Quick Add Venue
                  </button>
                </div>
                <select
                  id="venue-select"
                  value={selectedVenueId}
                  onChange={(e) => handleVenueSelect(e.target.value)}
                  className="w-full h-10 rounded-lg border border-gray-800 bg-[#0A0A0A] px-3 font-bold text-white text-sm"
                >
                  <option value="custom">Custom Venue / Manual Input</option>
                  {venues.map((v) => (
                    <option key={v.id} value={String(v.id)}>
                      {v.name} ({v.city}, {v.state})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="event-venue"
                    className="text-xs font-bold text-gray-400 uppercase tracking-wider"
                  >
                    Venue Name
                  </Label>
                  <Input
                    id="event-venue"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="e.g. Arkansas Museum of Fine Arts"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="event-location"
                    className="text-xs font-bold text-gray-400 uppercase tracking-wider"
                  >
                    City, State
                  </Label>
                  <Input
                    id="event-location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Little Rock, AR"
                  />
                </div>
              </div>

              {/* Featured Artmakers Selection & Quick Create */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Featured Artmakers / Artists
                  </Label>
                  <button
                    type="button"
                    onClick={() => setIsArtmakerModalOpen(true)}
                    className="inline-flex items-center text-xs text-[#7CFC00] hover:underline"
                  >
                    <UserPlus className="mr-1 size-3" /> Quick Add Artmaker
                  </button>
                </div>
                <div className="max-h-36 overflow-y-auto rounded-lg border border-gray-800 bg-[#0A0A0A] p-3 space-y-2">
                  {artmakers.map((am) => {
                    const isSelected = selectedArtmakerIds.includes(am.id);
                    return (
                      <label
                        key={am.id}
                        className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedArtmakerIds((prev) => [...prev, am.id]);
                            } else {
                              setSelectedArtmakerIds((prev) => prev.filter((id) => id !== am.id));
                            }
                          }}
                          className="size-4 rounded border-gray-800 bg-[#111111] text-[#7CFC00]"
                        />
                        <span>{am.name}</span>
                        <span className="text-xs text-gray-500">({am.city})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label
                    htmlFor="event-date"
                    className="text-xs font-bold text-gray-400 uppercase tracking-wider"
                  >
                    Date
                  </Label>
                  <Input
                    id="event-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="event-time"
                    className="text-xs font-bold text-gray-400 uppercase tracking-wider"
                  >
                    Time
                  </Label>
                  <Input
                    id="event-time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="7:00 PM"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="event-price"
                    className="text-xs font-bold text-gray-400 uppercase tracking-wider"
                  >
                    Price
                  </Label>
                  <Input
                    id="event-price"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Free / $10"
                  />
                </div>
              </div>

              {/* Flyer / Image Upload */}
              <ArtsImageUploader label="Event Flyer / Image" value={image} onChange={setImage} />

              <div className="space-y-2">
                <Label
                  htmlFor="event-ticket"
                  className="text-xs font-bold text-gray-400 uppercase tracking-wider"
                >
                  Ticket Link (Optional)
                </Label>
                <Input
                  id="event-ticket"
                  value={ticketLink}
                  onChange={(e) => setTicketLink(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="event-desc"
                  className="text-xs font-bold text-gray-400 uppercase tracking-wider"
                >
                  Description
                </Label>
                <Textarea
                  id="event-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the event, featured artists, and exhibition details..."
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-3 border-gray-800 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#7CFC00] font-black text-black hover:bg-[#7CFC00]/90"
                >
                  {isSubmitting ? "Creating..." : "Save Event"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Quick Venue Modal */}
      {isVenueModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-800 bg-[#111111] p-6 space-y-4">
            <h3 className="font-black text-xl text-white">Log New Venue On-The-Fly</h3>
            <form onSubmit={handleQuickCreateVenue} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="qv-name" className="text-xs font-bold text-gray-400 uppercase">
                  Venue Name
                </Label>
                <Input
                  id="qv-name"
                  value={newVenueName}
                  onChange={(e) => setNewVenueName(e.target.value)}
                  placeholder="e.g. AMFA Glass Gallery"
                  className="font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qv-city" className="text-xs font-bold text-gray-400 uppercase">
                  City
                </Label>
                <Input
                  id="qv-city"
                  value={newVenueCity}
                  onChange={(e) => setNewVenueCity(e.target.value)}
                  placeholder="Little Rock"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsVenueModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#7CFC00] font-black text-black hover:bg-[#7CFC00]/90"
                >
                  Save Venue
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
