import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Route } from "next";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { venues, events } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Calendar,
  MapPin,
  Phone,
  Globe,
  Plus,
  DollarSign,
  Mail,
  ExternalLink,
} from "lucide-react";

export default async function VenueDashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }

  const [venue] = await db.select().from(venues).where(eq(venues.claimedById, userId)).limit(1);

  if (!venue) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#111111] border border-zinc-800 rounded-xl p-8 text-center">
          <Building2 className="w-12 h-12 text-[#7CFC00] mx-auto mb-4" />
          <h1 className="text-2xl font-black mb-2">No Venue Claimed</h1>
          <p className="text-sm text-zinc-400 mb-6">
            You don&apos;t have a venue associated with your account yet. Complete venue setup to
            manage shows and booking info.
          </p>
          <Link href={"/onboarding" as Route}>
            <Button className="w-full bg-[#7CFC00] text-black hover:bg-[#7CFC00]/90 font-bold">
              Complete Venue Setup
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Fetch events for this venue (by venueId or matching venue name)
  const venueEvents = await db
    .select()
    .from(events)
    .where(eq(events.venueId, venue.id))
    .orderBy(desc(events.date))
    .limit(20);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <main className="pt-36 pb-20">
        <div className="container mx-auto px-6 max-w-6xl">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-zinc-800">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7CFC00]/10 border border-[#7CFC00]/20 text-[#7CFC00] text-xs font-mono font-bold uppercase tracking-widest mb-3">
                <Building2 className="w-3.5 h-3.5" /> Venue Dashboard
              </div>
              <h1 className="text-3xl sm:text-4xl font-black">{venue.name}</h1>
              <p className="text-zinc-400 text-sm mt-1 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#7CFC00]" />
                {venue.address ? `${venue.address}, ` : ""}
                {venue.city}, {venue.state} {venue.zip || ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href={"/venue-dashboard/events/new" as Route}>
                <Button className="bg-[#7CFC00] text-black hover:bg-[#7CFC00]/90 font-bold gap-2">
                  <Plus className="w-4 h-4" /> Submit New Show
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-[#111111] border border-zinc-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-zinc-400 uppercase">Capacity</span>
                <Building2 className="w-5 h-5 text-[#7CFC00]" />
              </div>
              <div className="text-2xl font-black">{venue.capacity || "N/A"}</div>
            </div>

            <div className="bg-[#111111] border border-zinc-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-zinc-400 uppercase">Documented Shows</span>
                <Calendar className="w-5 h-5 text-[#9400D3]" />
              </div>
              <div className="text-2xl font-black">{venueEvents.length}</div>
            </div>

            <div className="bg-[#111111] border border-zinc-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-zinc-400 uppercase">Booking Rates</span>
                <DollarSign className="w-5 h-5 text-[#7CFC00]" />
              </div>
              <div className="text-lg font-bold truncate">
                {venue.bookingRates || (
                  <span className="text-zinc-500 font-normal">Not listed</span>
                )}
              </div>
            </div>
          </div>

          {/* Main Grid: Details + Events */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Venue Details Card */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-[#111111] border border-zinc-800 rounded-xl p-6">
                <h2 className="text-lg font-bold mb-4">Venue Profile</h2>
                {venue.image && (
                  <div className="relative w-full h-44 rounded-lg overflow-hidden mb-4 border border-zinc-800">
                    <Image src={venue.image} alt={venue.name} fill className="object-cover" />
                  </div>
                )}
                {venue.description && (
                  <p className="text-sm text-zinc-300 mb-4">{venue.description}</p>
                )}
                <div className="space-y-3 pt-3 border-t border-zinc-800 text-sm">
                  {venue.bookingEmail && (
                    <div className="flex items-center gap-2 text-zinc-300">
                      <Mail className="w-4 h-4 text-zinc-400 shrink-0" />
                      <span className="truncate">{venue.bookingEmail}</span>
                    </div>
                  )}
                  {venue.phone && (
                    <div className="flex items-center gap-2 text-zinc-300">
                      <Phone className="w-4 h-4 text-zinc-400 shrink-0" />
                      <span>{venue.phone}</span>
                    </div>
                  )}
                  {venue.website && (
                    <div className="flex items-center gap-2 text-zinc-300">
                      <Globe className="w-4 h-4 text-zinc-400 shrink-0" />
                      <a
                        href={venue.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#7CFC00] hover:underline flex items-center gap-1 truncate"
                      >
                        {venue.website.replace(/^https?:\/\//, "")}
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Upcoming & Past Shows */}
            <div className="lg:col-span-2">
              <div className="bg-[#111111] border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Upcoming &amp; Past Shows</h2>
                  <Link href={"/venue-dashboard/events/new" as Route}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-zinc-700 text-zinc-300 gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Show
                    </Button>
                  </Link>
                </div>

                {venueEvents.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500">
                    <Calendar className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                    <p className="text-sm">No shows scheduled for this venue yet.</p>
                    <p className="text-xs text-zinc-600 mt-1">
                      Submit your upcoming live shows to get featured.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {venueEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-white text-base hover:text-[#7CFC00] transition-colors">
                              {evt.title}
                            </span>
                            <Badge
                              variant="outline"
                              className={
                                evt.status === "published"
                                  ? "border-[#7CFC00]/40 text-[#7CFC00] text-[10px]"
                                  : "border-zinc-700 text-zinc-400 text-[10px]"
                              }
                            >
                              {evt.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-zinc-400 flex items-center gap-3">
                            <span>
                              {new Date(evt.date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                            {evt.time && <span>• {evt.time}</span>}
                            <span>• {evt.genre}</span>
                          </div>
                        </div>
                        <Link href={`/events/${evt.slug}` as Route}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-[#7CFC00] hover:bg-[#7CFC00]/10"
                          >
                            View Public Event
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
