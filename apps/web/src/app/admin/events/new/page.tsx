import { redirect } from "next/navigation";
import { canCreate } from "@/lib/auth/access";
import { EventForm } from "@/components/admin/event-form";
import { createEvent } from "../actions";
import type { Route } from "next";

export default async function NewEventPage() {
  if (!(await canCreate())) {
    redirect("/admin");
  }

  return (
    <div>
      <h1 className="text-3xl font-black mb-8">Create New Event</h1>
      <EventForm
        onSubmit={createEvent}
        cancelHref={"/admin/events" as Route}
        allowImageUrl={false}
      />
    </div>
  );
}
