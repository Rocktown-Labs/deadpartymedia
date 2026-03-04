import Link from "next/link";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { auth } from "@clerk/nextjs/server";
import { asc, count, desc, eq } from "drizzle-orm";
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
import {
  ADMIN_PAGE_SIZE,
  buildSearchParams,
  getOffsetFromPage,
  parsePageParam,
  parseSortOrderParam,
  parseSortParam,
} from "@/lib/admin/table-state";
import { checkRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { deleteEvent } from "./actions";

const EVENT_SORT_FIELDS = ["title", "venue", "date", "genre", "status", "createdAt"] as const;

type EventSortField = (typeof EVENT_SORT_FIELDS)[number];

interface EventsSearchParams {
  order?: string;
  page?: string;
  sort?: string;
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<EventsSearchParams>;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }

  const isSuperAdmin = await checkRole("super_admin");
  const isWriter = await checkRole("writer");

  if (!isSuperAdmin && !isWriter) {
    redirect("/");
  }

  const params = await searchParams;
  const page = parsePageParam(params.page);
  const sort = parseSortParam<EventSortField>(params.sort, EVENT_SORT_FIELDS, "createdAt");
  const order = parseSortOrderParam(params.order, "desc");
  const offset = getOffsetFromPage(page, ADMIN_PAGE_SIZE);

  const whereClause = isSuperAdmin ? undefined : eq(events.createdById, userId);

  const totalQuery = db.select({ total: count() }).from(events);
  const rowsQuery = db.select().from(events);

  const [totalRows, filteredEvents] = await Promise.all([
    whereClause ? totalQuery.where(whereClause) : totalQuery,
    (whereClause ? rowsQuery.where(whereClause) : rowsQuery)
      .orderBy(
        sort === "title"
          ? (order === "asc"
            ? asc(events.title)
            : desc(events.title))
          : sort === "venue"
            ? order === "asc"
              ? asc(events.venue)
              : desc(events.venue)
            : sort === "date"
              ? order === "asc"
                ? asc(events.date)
                : desc(events.date)
              : sort === "genre"
                ? order === "asc"
                  ? asc(events.genre)
                  : desc(events.genre)
                : sort === "status"
                  ? order === "asc"
                    ? asc(events.status)
                    : desc(events.status)
                  : order === "asc"
                    ? asc(events.createdAt)
                    : desc(events.createdAt),
        desc(events.createdAt),
      )
      .limit(ADMIN_PAGE_SIZE)
      .offset(offset),
  ]);

  const totalCount = Number(totalRows[0]?.total ?? 0);
  const currentSearchParams = buildSearchParams(params as Record<string, string | string[] | undefined>);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-black">Events</h1>
        <Link href="/admin/events/new">
          <Button>Create New Event</Button>
        </Link>
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
                    searchParams={currentSearchParams}
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
                    searchParams={currentSearchParams}
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
                    searchParams={currentSearchParams}
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
                    searchParams={currentSearchParams}
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
                    searchParams={currentSearchParams}
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
                    searchParams={currentSearchParams}
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
                        href={`/admin/events/${event.id}`}
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
                            : (event.status === "draft"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-gray-500/20 text-gray-400")
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
                        <Link href={`/admin/events/${event.id}`}>
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
          searchParams={currentSearchParams}
          page={page}
          totalItems={totalCount}
        />
      </div>
    </div>
  );
}
