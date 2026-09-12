import { redirect } from "next/navigation";
import { canCreate } from "@/lib/auth/access";
import { VenueForm } from "@/components/admin/venue-form";
import { createVenue } from "../actions";
import type { Route } from "next";

export default async function NewVenuePage() {
  if (!(await canCreate())) {
    redirect("/admin");
  }

  return (
    <div>
      <h1 className="text-3xl font-black mb-8">Add New Venue</h1>
      <VenueForm onSubmit={createVenue} cancelHref={"/admin/venues" as Route} />
    </div>
  );
}
