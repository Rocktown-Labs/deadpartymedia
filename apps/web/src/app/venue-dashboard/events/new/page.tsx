import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { db } from "@/lib/db";
import { venues } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { EventForm } from "@/components/admin/event-form";
import { createVenueEvent } from "../actions";

export default async function VenueNewEventPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }

  const [userVenue] = await db.select().from(venues).where(eq(venues.claimedById, userId)).limit(1);

  const initialLocation = userVenue
    ? [userVenue.address, userVenue.city, `${userVenue.state} ${userVenue.zip || ""}`.trim()]
        .filter(Boolean)
        .join(", ")
    : "";

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-black mb-2">Submit New Show</h1>
            <p className="text-zinc-400 text-sm">
              List an upcoming concert or event hosted at {userVenue?.name || "your venue"}.
            </p>
          </div>

          <EventForm
            initialData={{
              location: initialLocation,
              venue: userVenue?.name || "",
              venueId: userVenue?.id,
            }}
            onSubmit={createVenueEvent}
            cancelHref={"/venue-dashboard" as Route}
          />
        </div>
      </main>
    </div>
  );
}
