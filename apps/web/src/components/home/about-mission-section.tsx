"use client";

import Link from "next/link";
import { Users, MapPin, Calendar, HeartHandshake, ArrowRight, PlusCircle } from "lucide-react";
import type { Route } from "next";

interface AboutMissionSectionProps {
  onOpenSubmitModal?: () => void;
  bandsCount?: number | string;
  showsCount?: number | string;
  articlesCount?: number | string;
}

export function AboutMissionSection({
  onOpenSubmitModal,
  bandsCount = "—",
  showsCount = "—",
  articlesCount = "—",
}: AboutMissionSectionProps) {
  return (
    <section className="relative py-16 px-4 sm:px-6 border-t border-zinc-900 bg-zinc-950/70">
      <div className="container mx-auto">
        {/* Editorial Introduction Header */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-linear-to-b from-zinc-900/60 to-zinc-950 p-6 sm:p-10 lg:p-12 mb-8 shadow-2xl">
          {/* Subtle Accent Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#7CFC00]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7CFC00]/10 border border-[#7CFC00]/20 text-[#7CFC00] text-xs font-mono font-bold tracking-widest uppercase mb-4">
              What is Dead Party Media?
            </div>

            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white leading-tight mb-4">
              Arkansas&apos; Independent Hub for Live Music, Underground Bands &amp; Scene Culture.
            </h2>

            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed mb-6">
              We are your premier destination for all things music across Arkansas. Whether
              you&apos;re looking for hardcore bands, local rappers, country singers, indie acts, or
              EDM producers — we celebrate it all. Our mission is to shine an equal spotlight on
              every artist, stage, and fan in the local scene, ensuring Arkansas talent gets seen,
              heard, and documented.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/about"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-black font-black text-xs uppercase tracking-wider hover:bg-zinc-200 transition-colors shadow-lg"
              >
                Read Our Story &amp; Mission <ArrowRight className="w-4 h-4" />
              </Link>
              {onOpenSubmitModal && (
                <button
                  onClick={onOpenSubmitModal}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#7CFC00] text-[#7CFC00] hover:bg-[#7CFC00] hover:text-black font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" /> Submit an Upcoming Show
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 4 Core Scene Pillars / Quick Navigation Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {/* Pillar 1: Artists */}
          <Link href="/artists" className="group block">
            <div className="h-full p-5 rounded-xl border border-zinc-800/90 bg-zinc-900/40 hover:bg-zinc-900/80 hover:border-[#7CFC00] transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-purple-400 group-hover:text-[#7CFC00] transition-colors mb-3">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-white group-hover:text-[#7CFC00] transition-colors mb-1">
                  Arkansas Bands &amp; Artists
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Search claimed local artist profiles, discographies, and social links across all
                  genres.
                </p>
              </div>
              <div className="flex items-center justify-between text-xs font-mono font-bold text-zinc-500 group-hover:text-white pt-4 mt-2 border-t border-zinc-800/50">
                <span>Browse Artists</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Pillar 2: Venues */}
          <Link href={"/venues" as Route} className="group block">
            <div className="h-full p-5 rounded-xl border border-zinc-800/90 bg-zinc-900/40 hover:bg-zinc-900/80 hover:border-[#7CFC00] transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#7CFC00] group-hover:scale-110 transition-transform mb-3">
                  <MapPin className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-white group-hover:text-[#7CFC00] transition-colors mb-1">
                  Local Venues &amp; Stages
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Capacities, stages, addresses, and booking contacts for live music rooms across
                  Arkansas.
                </p>
              </div>
              <div className="flex items-center justify-between text-xs font-mono font-bold text-zinc-500 group-hover:text-white pt-4 mt-2 border-t border-zinc-800/50">
                <span>View Venues</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Pillar 3: Shows Schedule & Submissions */}
          <Link href="/events" className="group block">
            <div className="h-full p-5 rounded-xl border border-zinc-800/90 bg-zinc-900/40 hover:bg-zinc-900/80 hover:border-[#7CFC00] transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-400 group-hover:text-[#7CFC00] transition-colors mb-3">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-white group-hover:text-[#7CFC00] transition-colors mb-1">
                  Live Shows &amp; Tickets
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Full calendar of upcoming live gigs, flyers, door times, and advance ticket links.
                </p>
              </div>
              <div className="flex items-center justify-between text-xs font-mono font-bold text-zinc-500 group-hover:text-white pt-4 mt-2 border-t border-zinc-800/50">
                <span>View Calendar</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Pillar 4: Scene Journalism & Writers */}
          <Link href={"/donate" as Route} className="group block">
            <div className="h-full p-5 rounded-xl border border-zinc-800/90 bg-zinc-900/40 hover:bg-zinc-900/80 hover:border-purple-500 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform mb-3">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-white group-hover:text-purple-400 transition-colors mb-1">
                  Tip Writers &amp; Photographers
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Direct Cash App tipping for independent journalists covering underground music.
                </p>
              </div>
              <div className="flex items-center justify-between text-xs font-mono font-bold text-zinc-500 group-hover:text-purple-400 pt-4 mt-2 border-t border-zinc-800/50">
                <span>Tip the Scene</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        </div>

        {/* Scene Activity Snapshot Bar */}
        <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#7CFC00] animate-ping" />
            <span className="text-zinc-300 font-bold uppercase tracking-wider">
              Arkansas Scene Live Tracker:
            </span>
          </div>
          <div className="flex items-center gap-6">
            <div>
              <span className="text-zinc-500 uppercase">Claimed Bands: </span>
              <span className="text-white font-bold text-sm">{bandsCount}</span>
            </div>
            <div>
              <span className="text-zinc-500 uppercase">Documented Shows: </span>
              <span className="text-[#7CFC00] font-bold text-sm">{showsCount}</span>
            </div>
            <div>
              <span className="text-zinc-500 uppercase">Scene Stories: </span>
              <span className="text-white font-bold text-sm">{articlesCount}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
