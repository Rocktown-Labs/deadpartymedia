import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { events, eventArtists } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { canEdit } from "@/lib/auth/access";
import { EventForm } from "@/components/admin/event-form";
import { updateEvent } from "../actions";
import type { Route } from "next";

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
          artistIds,
          date: event.date,
          description: event.description,
          genre: event.genre,
          image: event.image || undefined,
          location: event.location,
          price: event.price || undefined,
          slug: event.slug,
          status: event.status,
          ticketLink: event.ticketLink || undefined,
          time: event.time || undefined,
          title: event.title,
          venue: event.venue,
        }}
        onSubmit={updateEvent.bind(null, eventId)}
        cancelHref={"/admin/events" as Route}
      />
    </div>
  );
}
