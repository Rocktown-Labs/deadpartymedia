import { getMusicApi } from "@/lib/api.server";
import { readResponse } from "@dpmedia/api-client";
import { Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
export const loadPage = createServerFn({ method: "GET" })
  .validator((input: { params: Record<string, string>; search: Record<string, string> }) => input)
  .handler(async ({ data: input }) =>
    readResponse(await getMusicApi().pages["admin"]["venues"].$get({ query: input.search })),
  );

import { Button } from "@/components/ui/button";
import { VenuesTable } from "./venues-table";

export default function AdminVenuesPage({ data }: { data: Awaited<ReturnType<typeof loadPage>> }) {
  const { isSuperAdmin, params, page, order, totalCount, currentSearchParamsString, venueRows } =
    data;
  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Venues</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage concert venues, stages, booking rates, and production specs.
          </p>
        </div>
        <Link to={"/admin/venues/new"}>
          <Button className="bg-[#7CFC00] text-black hover:bg-[#7CFC00]/90 font-bold">
            Add New Venue
          </Button>
        </Link>
      </div>

      <VenuesTable
        currentOrder={order}
        currentSearchParams={currentSearchParamsString}
        currentSort={params.sort}
        isSuperAdmin={isSuperAdmin}
        page={page}
        totalCount={totalCount}
        venues={venueRows}
      />
    </div>
  );
}
