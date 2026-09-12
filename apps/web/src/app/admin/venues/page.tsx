import Link from "next/link";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { auth } from "@clerk/nextjs/server";
import { asc, count, desc } from "drizzle-orm";
import { Button } from "@/components/ui/button";
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
import { venues } from "@/lib/db/schema";
import { VenuesTable } from "./venues-table";

const VENUE_SORT_FIELDS = ["name", "city", "createdAt"] as const;
type VenueSortField = (typeof VENUE_SORT_FIELDS)[number];

interface VenuesSearchParams {
  order?: string;
  page?: string;
  sort?: string;
}

export default async function AdminVenuesPage({
  searchParams,
}: {
  searchParams: Promise<VenuesSearchParams>;
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
  const sort = parseSortParam<VenueSortField>(params.sort, VENUE_SORT_FIELDS, "name");
  const order = parseSortOrderParam(params.order, "asc");
  const offset = getOffsetFromPage(page, ADMIN_PAGE_SIZE);

  const totalQuery = db.select({ total: count() }).from(venues);
  const rowsQuery = db.select().from(venues);

  const [totalRows, pagedVenues] = await Promise.all([
    totalQuery,
    rowsQuery
      .orderBy(
        sort === "name"
          ? order === "asc"
            ? asc(venues.name)
            : desc(venues.name)
          : sort === "city"
            ? order === "asc"
              ? asc(venues.city)
              : desc(venues.city)
            : order === "asc"
              ? asc(venues.createdAt)
              : desc(venues.createdAt),
      )
      .limit(ADMIN_PAGE_SIZE)
      .offset(offset),
  ]);

  const totalCount = Number(totalRows[0]?.total ?? 0);
  const currentSearchParams = buildSearchParams(
    params as Record<string, string | string[] | undefined>,
  );

  const venueRows = pagedVenues.map((v) => ({
    address: v.address,
    bookingEmail: v.bookingEmail,
    bookingRates: v.bookingRates,
    capacity: v.capacity,
    city: v.city,
    createdAt: v.createdAt.toISOString(),
    genres: v.genres,
    id: v.id,
    image: v.image,
    name: v.name,
    phone: v.phone,
    slug: v.slug,
    state: v.state,
    website: v.website,
    zip: v.zip,
  }));

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Venues</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage concert venues, stages, booking rates, and production specs.
          </p>
        </div>
        <Link href={"/admin/venues/new" as Route}>
          <Button className="bg-[#7CFC00] text-black hover:bg-[#7CFC00]/90 font-bold">
            Add New Venue
          </Button>
        </Link>
      </div>

      <VenuesTable
        currentOrder={order}
        currentSearchParams={currentSearchParams.toString()}
        currentSort={params.sort}
        isSuperAdmin={isSuperAdmin}
        page={page}
        totalCount={totalCount}
        venues={venueRows}
      />
    </div>
  );
}
