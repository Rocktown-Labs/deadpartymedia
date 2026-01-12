import { redirect } from "next/navigation";
import { checkRole } from "@/lib/auth/roles";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DeleteConfirm } from "@/components/admin/delete-confirm";
import { deleteEvent } from "./actions";

export default async function EventsPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const isSuperAdmin = await checkRole("super_admin");
  const isWriter = await checkRole("writer");

  if (!isSuperAdmin && !isWriter) {
    redirect("/");
  }

  // Filter events based on role
  const allEvents = await db.select().from(events).orderBy(desc(events.createdAt));

  const filteredEvents = isSuperAdmin
    ? allEvents
    : allEvents.filter((event) => event.createdById === userId);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black">Events</h1>
        <Link href="/admin/events/new">
          <Button>Create New Event</Button>
        </Link>
      </div>

      <div className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#0A0A0A] border-b border-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">
                Venue
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">
                Genre
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-400">
                  No events found
                </td>
              </tr>
            ) : (
              filteredEvents.map((event) => (
                <tr key={event.id} className="hover:bg-gray-900">
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/events/${event.id}`}
                      className="font-bold hover:text-[#7CFC00] transition-colors"
                    >
                      {event.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">{event.venue}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {new Date(event.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">{event.genre}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        event.status === "published"
                          ? "bg-green-500/20 text-green-400"
                          : event.status === "draft"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-gray-500/20 text-gray-400"
                      }`}
                    >
                      {event.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <Link href={`/admin/events/${event.id}`}>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </Link>
                      {isSuperAdmin && (
                        <DeleteConfirm
                          onConfirm={async () => {
                            await deleteEvent(event.id);
                          }}
                          title="Delete Event"
                          description={`Are you sure you want to delete "${event.title}"? This action cannot be undone.`}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
