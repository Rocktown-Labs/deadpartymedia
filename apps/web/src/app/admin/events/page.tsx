import { getMusicApi } from "@/lib/api.server";
import { readResponse } from "@dpmedia/api-client";
import { Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
export const loadPage = createServerFn({ method: "GET" })
  .validator((input: { params: Record<string, string>; search: Record<string, string> }) => input)
  .handler(async ({ data: input }) =>
    readResponse(await getMusicApi().pages["admin"]["events"].$get({ query: input.search })),
  );

import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminSortHeader } from "@/components/admin/admin-sort-header";
import { DeleteConfirm } from "@/components/admin/delete-confirm";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteEvent } from "./actions";

export default function EventsPage({ data }: { data: Awaited<ReturnType<typeof loadPage>> }) {
  const {
    isSuperAdmin,
    isWriter,
    params,
    page,
    order,
    filteredEvents,
    totalCount,
    currentSearchParamsString,
  } = data;
  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-black">Events</h1>
        <div className="flex flex-wrap gap-3">
          {(isSuperAdmin || isWriter) && (
            <Link to="/admin/events/import">
              <Button variant="outline">AI Flyer Import</Button>
            </Link>
          )}
          <Link to="/admin/events/new">
            <Button>Create New Event</Button>
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-800 bg-[#111111]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-[#0A0A0A]">
              <TableRow className="border-gray-800 hover:bg-transparent">
                <TableHead>
                  <AdminSortHeader
                    currentOrder={order}
                    currentSort={params.sort}
                    defaultSort="createdAt"
                    field="title"
                    label="Title"
                    pathname="/admin/events"
                    searchParams={new URLSearchParams(currentSearchParamsString)}
                  />
                </TableHead>
                <TableHead>
                  <AdminSortHeader
                    currentOrder={order}
                    currentSort={params.sort}
                    defaultSort="createdAt"
                    field="venue"
                    label="Venue"
                    pathname="/admin/events"
                    searchParams={new URLSearchParams(currentSearchParamsString)}
                  />
                </TableHead>
                <TableHead>
                  <AdminSortHeader
                    currentOrder={order}
                    currentSort={params.sort}
                    defaultSort="createdAt"
                    field="date"
                    label="Date"
                    pathname="/admin/events"
                    searchParams={new URLSearchParams(currentSearchParamsString)}
                  />
                </TableHead>
                <TableHead>
                  <AdminSortHeader
                    currentOrder={order}
                    currentSort={params.sort}
                    defaultSort="createdAt"
                    field="genre"
                    label="Genre"
                    pathname="/admin/events"
                    searchParams={new URLSearchParams(currentSearchParamsString)}
                  />
                </TableHead>
                <TableHead>
                  <AdminSortHeader
                    currentOrder={order}
                    currentSort={params.sort}
                    defaultSort="createdAt"
                    field="status"
                    label="Status"
                    pathname="/admin/events"
                    searchParams={new URLSearchParams(currentSearchParamsString)}
                  />
                </TableHead>
                <TableHead>
                  <AdminSortHeader
                    currentOrder={order}
                    currentSort={params.sort}
                    defaultSort="createdAt"
                    field="createdAt"
                    label="Created"
                    pathname="/admin/events"
                    searchParams={new URLSearchParams(currentSearchParamsString)}
                  />
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-gray-300">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.length === 0 ? (
                <TableRow className="border-gray-800">
                  <TableCell colSpan={7} className="px-6 py-4 text-center text-gray-400">
                    No events found
                  </TableCell>
                </TableRow>
              ) : (
                filteredEvents.map((event) => (
                  <TableRow key={event.id} className="border-gray-800 hover:bg-gray-900">
                    <TableCell className="px-6 py-4">
                      <Link
                        to="/admin/events/$id"
                        params={{ id: String(event.id) }}
                        className="font-bold transition-colors hover:text-[#7CFC00]"
                      >
                        {event.title}
                      </Link>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-gray-400">{event.venue}</TableCell>
                    <TableCell className="px-6 py-4 text-sm text-gray-400">
                      {new Date(event.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-gray-400">{event.genre}</TableCell>
                    <TableCell className="px-6 py-4">
                      <span
                        className={`rounded px-2 py-1 text-xs font-bold ${
                          event.status === "published"
                            ? "bg-green-500/20 text-green-400"
                            : event.status === "draft"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        {event.status}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-gray-400">
                      {new Date(event.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link to="/admin/events/$id" params={{ id: String(event.id) }}>
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </Link>
                        {isSuperAdmin && (
                          <DeleteConfirm
                            action={deleteEvent.bind(null, event.id)}
                            title="Delete Event"
                            description={`Are you sure you want to delete "${event.title}"? This action cannot be undone.`}
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <AdminPagination
          pathname="/admin/events"
          searchParams={new URLSearchParams(currentSearchParamsString)}
          page={page}
          totalItems={totalCount}
        />
      </div>
    </div>
  );
}
