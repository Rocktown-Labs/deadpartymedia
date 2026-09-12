"use client";

import Link from "next/link";
import type { Route } from "next";
import { useMemo } from "react";
import { toast } from "sonner";
import { FilePenLine, ExternalLink, MapPin, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminSortHeader } from "@/components/admin/admin-sort-header";
import { DeleteConfirm } from "@/components/admin/delete-confirm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteVenue } from "./actions";

export interface AdminVenueRow {
  id: number;
  name: string;
  slug: string;
  address: string | null;
  city: string;
  state: string;
  zip: string | null;
  phone: string | null;
  website: string | null;
  capacity: string | null;
  genres: string | null;
  bookingRates: string | null;
  bookingEmail: string | null;
  image: string | null;
  createdAt: string;
}

interface VenuesTableProps {
  currentOrder: "asc" | "desc";
  currentSearchParams: string;
  currentSort?: string;
  isSuperAdmin: boolean;
  page: number;
  venues: AdminVenueRow[];
  totalCount: number;
}

export function VenuesTable({
  currentOrder,
  currentSearchParams,
  currentSort,
  isSuperAdmin,
  page,
  venues: venueRows,
  totalCount,
}: VenuesTableProps) {
  const router = useRouter();
  const searchParams = useMemo(
    () => new URLSearchParams(currentSearchParams),
    [currentSearchParams],
  );

  const handleDelete = async (id: number) => {
    try {
      await deleteVenue(id);
      toast.success("Venue deleted successfully");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete venue");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-900/50">
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="w-[300px]">
                <AdminSortHeader
                  field="name"
                  label="Venue"
                  currentSort={currentSort}
                  currentOrder={currentOrder}
                  defaultSort="createdAt"
                  pathname="/admin/venues"
                  searchParams={searchParams}
                />
              </TableHead>
              <TableHead>
                <AdminSortHeader
                  field="city"
                  label="Location"
                  currentSort={currentSort}
                  currentOrder={currentOrder}
                  defaultSort="createdAt"
                  pathname="/admin/venues"
                  searchParams={searchParams}
                />
              </TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Booking Rates</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {venueRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-zinc-500">
                  No venues found. Click &quot;Add New Venue&quot; to get started.
                </TableCell>
              </TableRow>
            ) : (
              venueRows.map((venue) => (
                <TableRow key={venue.id} className="border-zinc-800 hover:bg-zinc-900/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {venue.image ? (
                        <img
                          src={venue.image}
                          alt={venue.name}
                          className="w-10 h-10 rounded object-cover border border-zinc-800 bg-zinc-900"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
                          <Building2 className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <Link
                          href={`/admin/venues/${venue.id}` as Route}
                          className="font-medium text-zinc-100 hover:text-[#7CFC00] transition-colors"
                        >
                          {venue.name}
                        </Link>
                        {venue.website && (
                          <a
                            href={venue.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 mt-0.5"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Website
                          </a>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-zinc-300">
                      {venue.city}, {venue.state}
                    </div>
                    {venue.address && (
                      <div className="text-xs text-zinc-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {venue.address}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {venue.capacity ? (
                      <Badge variant="outline" className="font-mono text-xs border-zinc-700">
                        {venue.capacity} cap
                      </Badge>
                    ) : (
                      <span className="text-xs text-zinc-500">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-zinc-300">
                      {venue.bookingRates || (
                        <span className="text-zinc-500 text-xs">Unspecified</span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-zinc-400 space-y-0.5">
                      {venue.phone && <div>{venue.phone}</div>}
                      {venue.bookingEmail && <div>{venue.bookingEmail}</div>}
                      {!venue.phone && !venue.bookingEmail && (
                        <span className="text-zinc-600">None</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/venues/${venue.id}` as Route}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
                        >
                          <FilePenLine className="w-4 h-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                      </Link>
                      {isSuperAdmin && (
                        <DeleteConfirm
                          title={`Delete venue "${venue.name}"?`}
                          description="This action cannot be undone. Any linked events will be unlinked from this venue."
                          action={() => handleDelete(venue.id)}
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
        pathname="/admin/venues"
        searchParams={searchParams}
        page={page}
        totalItems={totalCount}
      />
    </div>
  );
}
