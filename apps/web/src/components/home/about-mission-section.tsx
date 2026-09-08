"use client";

import Image from "next/image";
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
  bandsCount = 0,
  showsCount = 0,
  articlesCount = 0,
}: AboutMissionSectionProps) {
  return (
    <section className="relative py-16 px-4 sm:px-6 border-t border-zinc-900 bg-zinc-950/70">
      <div className="container mx-auto">
        {/* Editorial Introduction Header featuring the Dead Party Logo */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-linear-to-b from-zinc-900/70 to-zinc-950 p-6 sm:p-10 lg:p-12 mb-8 shadow-2xl">
          {/* Subtle Accent Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#7CFC00]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8 lg:gap-10">
            {/* Prominent Dead Party Logo */}
            <div className="shrink-0 flex items-center justify-center p-4 sm:p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl group">
              <Image
                src="/images/dead-party-logo.png"
                alt="Dead Party Media Logo"
                width={140}
                height={140}
                className="w-24 h-24 sm:w-32 sm:h-32 object-contain group-hover:scale-105 transition-transform duration-300"
              />
            </div>

            {/* Clear, Informative Mission Copy (No em dashes) */}
            <div className="flex-1 max-w-3xl text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7CFC00]/10 border border-[#7CFC00]/20 text-[#7CFC00] text-xs font-mono font-bold tracking-widest uppercase mb-3">
                What is Dead Party Media?
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tight text-white leading-tight mb-3">
                Arkansas Music Documented With Zero Gatekeeping.
              </h2>

              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed mb-4">
                Dead Party Media is a grassroots collective of local Arkansas artists, writers,
                photographers, musicians, and scene creators. We exist to spotlight the state&apos;s
                underground culture with equal dedication across hardcore, metal, hip-hop, indie
                rock, country, and electronic music.
              </p>

              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-6">
                Use this platform to discover upcoming live concerts, submit your show flyers,
                explore claimed local artist discographies, check venue specs, and read independent
                scene journalism.
              </p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-1">
                <Link
                  href="/about"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-black font-black text-xs uppercase tracking-wider hover:bg-zinc-200 transition-colors shadow-lg"
                >
                  Read Full Story &amp; Mission <ArrowRight className="w-4 h-4" />
                </Link>
                {onOpenSubmitModal && (
                  <button
                    onClick={onOpenSubmitModal}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#7CFC00] text-[#7CFC00] hover:bg-[#7CFC00] hover:text-black font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" /> Submit a Show Flyer
                  </button>
                )}
              </div>
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

        {/* Scene Activity Snapshot Bar (No em dashes) */}
        <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#7CFC00]" />
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
