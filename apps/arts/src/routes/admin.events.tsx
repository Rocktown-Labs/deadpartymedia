import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Edit, Eye, EyeOff, Plus, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ArtsAdminShell } from "#/components/arts-admin-shell.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import { requireArtsStaff } from "#/lib/artmakers.functions.ts";
import {
  createArtsEvent,
  deleteArtsEvent,
  listArtsAdminEvents,
  toggleArtsEventStatus,
  type ArtsEventListItem,
} from "#/lib/content.functions.ts";

export const Route = createFileRoute("/admin/events")({
  beforeLoad: () => requireArtsStaff(),
  component: AdminEvents,
  loader: () => listArtsAdminEvents(),
});

function AdminEvents() {
  const staff = Route.useRouteContext();
  const initialEvents = Route.useLoaderData();
  const [events, setEvents] = useState<ArtsEventListItem[]>(initialEvents);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [venue, setVenue] = useState("");
  const [location, setLocation] = useState("Little Rock, AR");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("7:00 PM");
  const [price, setPrice] = useState("Free");
  const [ticketLink, setTicketLink] = useState("");
  const [image, setImage] = useState("");

  const createEventFn = useServerFn(createArtsEvent);
  const toggleStatusFn = useServerFn(toggleArtsEventStatus);
  const deleteEventFn = useServerFn(deleteArtsEvent);

  const isSuperAdmin = staff.role === "super_admin" || staff.role === "admin";

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
          {/* AI Flyer Import Button Guarded for Super Admin */}
          {isSuperAdmin ? (
            <Link
              to="/admin/events/import"
              className="inline-flex items-center gap-2 rounded-lg border border-[#7CFC00] bg-[#7CFC00] px-4 py-3 font-black text-black text-xs uppercase tracking-[0.18em] no-underline hover:bg-[#a5ff43]"
            >
              <Sparkles className="size-4" />
              AI Flyer Import
            </Link>
          ) : null}
          <Button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="rounded-lg bg-white font-black text-black text-xs uppercase tracking-[0.18em] hover:bg-gray-200"
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
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="event-venue"
                    className="text-xs font-bold text-gray-400 uppercase tracking-wider"
                  >
                    Venue
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
    </ArtsAdminShell>
  );
}
