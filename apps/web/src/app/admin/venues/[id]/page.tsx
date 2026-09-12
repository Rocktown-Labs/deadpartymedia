import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { venues } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { checkRole } from "@/lib/auth/roles";
import { VenueForm } from "@/components/admin/venue-form";
import { updateVenue } from "../actions";
import type { Route } from "next";

interface EditVenuePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditVenuePage({ params }: EditVenuePageProps) {
  const { id } = await params;
  const venueId = Number.parseInt(id, 10);

  if (Number.isNaN(venueId)) {
    notFound();
  }

  const isSuperAdmin = await checkRole("super_admin");
  const isWriter = await checkRole("writer");
  if (!isSuperAdmin && !isWriter) {
    redirect("/admin");
  }

  const [venue] = await db.select().from(venues).where(eq(venues.id, venueId)).limit(1);

  if (!venue) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-3xl font-black mb-8">Edit Venue</h1>
      <VenueForm
        initialData={{
          address: venue.address,
          bookingEmail: venue.bookingEmail,
          bookingRates: venue.bookingRates,
          capacity: venue.capacity,
          city: venue.city,
          description: venue.description,
          genres: venue.genres,
          id: venue.id,
          image: venue.image,
          name: venue.name,
          phone: venue.phone,
          slug: venue.slug,
          state: venue.state,
          website: venue.website,
          zip: venue.zip,
        }}
        onSubmit={updateVenue.bind(null, venueId)}
        cancelHref={"/admin/venues" as Route}
      />
    </div>
  );
}
