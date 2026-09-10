"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type ColumnDef,
  flexRender,
} from "@tanstack/react-table";
import { PageTitleHeader } from "@/components/page-title-header";
import { ArrowLeft, Search, MapPin, Phone, Globe, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VenueItem {
  id: string;
  name: string;
  city: string;
  address?: string;
  phone?: string;
  website?: string;
  capacity?: string;
  genres?: string;
}

const DEFAULT_VENUES: VenueItem[] = [
  {
    id: "vinos",
    name: "Vino's Pizza-Pub-Brewery",
    city: "Little Rock",
    address: "923 W 7th St",
    phone: "501-375-8466",
    website: "https://vinosbrewpub.com",
    capacity: "250",
    genres: "Punk, Hardcore, Indie, Metal",
  },
  {
    id: "full-moon-records",
    name: "Full Moon Records",
    city: "Conway",
    address: "1104 Front St",
    phone: "501-287-7452",
    website: "https://thefullmoonrecords.com",
    capacity: "80",
    genres: "Punk, Underground, DIY Shows, Vinyl Shop",
  },
];

interface VenuesClientProps {
  initialVenues?: VenueItem[];
}

export function VenuesClient({ initialVenues }: VenuesClientProps) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedCity, setSelectedCity] = useState("ALL");

  const venuesSource = initialVenues && initialVenues.length > 0 ? initialVenues : DEFAULT_VENUES;

  const filteredData = useMemo(() => {
    let list = [...venuesSource];
    if (selectedCity !== "ALL") {
      list = list.filter((v) => v.city.toUpperCase() === selectedCity.toUpperCase());
    }
    return list;
  }, [venuesSource, selectedCity]);

  const columns = useMemo<ColumnDef<VenueItem>[]>(
    () => [
      {
        accessorKey: "name",
        header: "VENUE NAME",
        cell: ({ row }) => (
          <div className="py-1">
            <span className="font-bold text-sm sm:text-base text-white hover:text-[#7CFC00] transition-colors block">
              {row.original.name}
            </span>
            {row.original.genres && (
              <span className="text-[11px] text-[#7CFC00]/90 font-mono tracking-wide">
                {row.original.genres}
              </span>
            )}
            <div className="sm:hidden mt-1 text-xs text-zinc-400">
              {row.original.city}, AR {row.original.address ? `• ${row.original.address}` : ""}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "city",
        header: "LOCATION",
        cell: ({ row }) => (
          <div className="py-1 hidden sm:block">
            <span className="text-xs font-semibold text-zinc-200 block">
              {row.original.city}, AR
            </span>
            {row.original.address && (
              <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {row.original.address}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "capacity",
        header: "CAPACITY",
        cell: ({ row }) => (
          <div className="py-1 hidden md:block font-mono text-xs text-zinc-400">
            {row.original.capacity ? `${row.original.capacity} cap` : "-"}
          </div>
        ),
      },
      {
        accessorKey: "phone",
        header: "PHONE",
        cell: ({ row }) => (
          <div className="py-1 hidden md:block">
            {row.original.phone ? (
              <a
                href={`tel:${row.original.phone}`}
                className="text-xs text-zinc-400 hover:text-[#7CFC00] flex items-center gap-1 font-mono"
              >
                <Phone className="w-3 h-3" />
                {row.original.phone}
              </a>
            ) : (
              <span className="text-xs text-zinc-600">-</span>
            )}
          </div>
        ),
      },
      {
        id: "website",
        header: "WEBSITE",
        cell: ({ row }) => (
          <div className="py-1 text-right">
            {row.original.website ? (
              <a
                href={row.original.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs font-bold font-mono uppercase tracking-wider text-[#7CFC00] hover:underline"
              >
                <Globe className="w-3 h-3 mr-1" />
                Visit Site
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            ) : (
              <span className="text-xs text-zinc-600">-</span>
            )}
          </div>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const v of venuesSource) {
      if (v.city) set.add(v.city);
    }
    return ["ALL", ...Array.from(set)];
  }, [venuesSource]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <main className="pt-40 pb-20">
        <div className="container mx-auto px-6">
          <Link
            href="/"
            className="inline-flex items-center text-[#7CFC00] hover:text-[#7CFC00]/80 mb-8 transition-all duration-300 transform hover:scale-110"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>

          <PageTitleHeader
            title="VENUES"
            description="Directory of Arkansas live music venues, dive bars, stages, and concert halls"
          />

          {/* Search & City Filter */}
          <div className="mb-6 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
              {cities.map((city) => (
                <button
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-colors cursor-pointer",
                    selectedCity === city
                      ? "border-[#7CFC00] bg-[#7CFC00]/10 text-[#7CFC00]"
                      : "border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700",
                  )}
                >
                  {city}
                </button>
              ))}
            </div>

            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={globalFilter ?? ""}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search venue name, address, or city..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#7CFC00] transition-colors"
              />
            </div>
          </div>

          {/* TanStack Table */}
          <div className="w-full bg-[#0D0D0D] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr
                      key={headerGroup.id}
                      className="border-b border-zinc-800 bg-zinc-950/80 text-[10px] sm:text-xs font-mono text-zinc-400 uppercase tracking-widest"
                    >
                      {headerGroup.headers.map((header) => (
                        <th key={header.id} className="px-4 py-3.5 font-semibold">
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className="bg-[#0D0D0D] hover:bg-zinc-900/60 transition-colors duration-150"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-4 py-3 align-middle">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="h-32 text-center text-zinc-500 text-sm"
                      >
                        No venues found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t border-zinc-800 bg-zinc-950 text-xs text-zinc-500 flex justify-between items-center">
              <span>{filteredData.length} venues found across Arkansas</span>
              <span className="font-mono text-[11px]">Independent Scene Directory</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
