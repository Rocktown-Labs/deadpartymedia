import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { events, eventArtists } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { canEdit } from "@/lib/auth/access";
import { EventForm } from "@/components/admin/event-form";
import { updateEvent } from "../actions";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const eventId = Number.parseInt(id, 10);

  if (Number.isNaN(eventId)) {
    redirect("/admin/events");
  }

  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);

  if (!event) {
    redirect("/admin/events");
  }

  if (!(await canEdit(event.createdById))) {
    redirect("/admin/events");
  }

  // Load artist relations for this event
  const eventArtistRelations = await db
    .select({ artistId: eventArtists.artistId })
    .from(eventArtists)
    .where(eq(eventArtists.eventId, eventId));

  const artistIds = eventArtistRelations.map((rel) => rel.artistId);

  return (
    <div>
      <h1 className="text-3xl font-black mb-8">Edit Event</h1>
      <EventForm
        initialData={{
          title: event.title,
          slug: event.slug,
          description: event.description,
          image: event.image || undefined,
          venue: event.venue,
          location: event.location,
          date: event.date,
          time: event.time || undefined,
          ticketLink: event.ticketLink || undefined,
          price: event.price || undefined,
          genre: event.genre,
          status: event.status,
          artistIds,
        }}
        onSubmit={(formData) => updateEvent(eventId, formData)}
        onCancel={() => redirect("/admin/events")}
      />
    </div>
  );
}
