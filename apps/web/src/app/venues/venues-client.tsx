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

const ARKANSAS_VENUES: VenueItem[] = [
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
    id: "white-water-tavern",
    name: "White Water Tavern",
    city: "Little Rock",
    address: "2500 W 7th St",
    phone: "501-375-8400",
    website: "https://whitewatertavern.com",
    capacity: "150",
    genres: "Folk, Country, Rock, Americana",
  },
  {
    id: "the-hall",
    name: "The Hall",
    city: "Little Rock",
    address: "721 W 9th St",
    phone: "501-406-1364",
    website: "https://littlerockhall.com",
    capacity: "1,300",
    genres: "Touring Acts, Rock, Hip-Hop, Pop",
  },
  {
    id: "stickyz",
    name: "Stickyz Rock 'n' Roll Chicken Shack",
    city: "Little Rock",
    address: "107 River Market Ave",
    phone: "501-372-7707",
    website: "https://stickyz.com",
    capacity: "350",
    genres: "Rock, Jam, Indie, Roots",
  },
  {
    id: "the-rev-room",
    name: "The Rev Room (Revolution Music Room)",
    city: "Little Rock",
    address: "300 President Clinton Ave",
    phone: "501-823-0091",
    website: "https://revroom.com",
    capacity: "800",
    genres: "Rock, Metal, Hip-Hop, EDM",
  },
  {
    id: "four-quarter-bar",
    name: "Four Quarter Bar",
    city: "North Little Rock",
    address: "415 Main St",
    phone: "501-313-4704",
    website: "https://fourquarterbar.com",
    capacity: "120",
    genres: "Blues, Funk, Rock, Singer-Songwriter",
  },
  {
    id: "kings-live-music",
    name: "Kings Live Music",
    city: "Conway",
    address: "1020 Front St",
    phone: "501-205-8512",
    website: "https://kingslivemusic.com",
    capacity: "250",
    genres: "Rock, Country, Local Bands",
  },
  {
    id: "full-moon-records",
    name: "Full Moon Records",
    city: "Conway",
    address: "1164 Front St",
    phone: "501-287-7452",
    website: "https://thefullmoonrecords.com",
    capacity: "80",
    genres: "Indie, Punk, Acoustic, DIY",
  },
  {
    id: "maxines",
    name: "Maxine's Live",
    city: "Hot Springs",
    address: "700 Central Ave",
    phone: "501-321-0909",
    website: "https://maxineslive.com",
    capacity: "180",
    genres: "Eclectic, Rock, Jazz, Indie",
  },
  {
    id: "simmons-bank-arena",
    name: "Simmons Bank Arena",
    city: "North Little Rock",
    address: "1 Simmons Bank Arena Dr",
    phone: "501-340-5660",
    website: "https://simmonsbankarena.com",
    capacity: "18,000",
    genres: "Arena Tours, Major Headliners",
  },
];

export function VenuesClient() {
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedCity, setSelectedCity] = useState("ALL");

  const filteredData = useMemo(() => {
    let list = [...ARKANSAS_VENUES];
    if (selectedCity !== "ALL") {
      list = list.filter((v) => v.city.toUpperCase() === selectedCity.toUpperCase());
    }
    return list;
  }, [selectedCity]);

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
            {row.original.address && (
              <span className="text-xs text-zinc-400 block sm:hidden">
                {row.original.address}, {row.original.city}
              </span>
            )}
            {row.original.genres && (
              <span className="text-[10px] text-zinc-500 block uppercase font-mono mt-0.5">
                {row.original.genres}
              </span>
            )}
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
              <span className="text-xs text-zinc-600">—</span>
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
              <span className="text-xs text-zinc-600">—</span>
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

  const cities = ["ALL", "Little Rock", "North Little Rock", "Conway", "Hot Springs"];

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
