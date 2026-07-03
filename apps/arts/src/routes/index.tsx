import { Show } from "@clerk/tanstack-react-start";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Instagram, MapPin, Sparkles } from "lucide-react";
import { MEDIUM_OPTIONS } from "#/lib/artmakers.ts";
import { listArtmakers } from "#/lib/artmakers.functions.ts";

export const Route = createFileRoute("/")({
  component: Home,
  loader: () => listArtmakers(),
});

function Home() {
  const artmakers = Route.useLoaderData();
  const featuredArtmakers = artmakers.slice(0, 6);
  const featuredMediums = MEDIUM_OPTIONS.slice(0, 12);

  return (
    <main className="pt-36">
      <section className="relative overflow-hidden px-5 py-16 md:py-24">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-14 left-[8%] h-40 w-40 border border-[#7CFC00]/40" />
          <div className="absolute right-[10%] bottom-10 h-52 w-52 border border-fuchsia-400/30" />
          <div className="absolute top-40 right-[28%] h-px w-56 rotate-[-18deg] bg-[#7CFC00]/50" />
        </div>
        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 border border-neutral-800 bg-neutral-950 px-3 py-2 font-black text-[#7CFC00] text-[10px] uppercase tracking-[0.28em]">
              <Sparkles className="size-3.5" />
              Arkansas artist index
            </div>
            <h1 className="max-w-4xl font-black text-5xl leading-[0.92] tracking-tighter md:text-7xl lg:text-8xl">
              Visual artists deserve a louder wall.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-neutral-300 leading-8">
              Dead Party Arts is the sibling archive for painters, ceramicists, illustrators,
              tattooers, designers, photographers, muralists, and every Arkansas maker working
              between categories.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/artmakers"
                className="inline-flex h-12 items-center gap-2 border border-[#7CFC00] bg-[#7CFC00] px-5 font-black text-black text-xs uppercase tracking-[0.2em] no-underline hover:bg-[#a5ff43]"
              >
                Browse Artmakers
                <ArrowRight className="size-4" />
              </Link>
              <Show when="signed-in">
                <Link
                  to="/onboarding"
                  className="inline-flex h-12 items-center border border-neutral-700 px-5 font-black text-white text-xs uppercase tracking-[0.2em] no-underline hover:border-[#7CFC00]"
                >
                  Build Profile
                </Link>
              </Show>
              <Show when="signed-out">
                <Link
                  to="/onboarding"
                  className="inline-flex h-12 items-center border border-neutral-700 px-5 font-black text-white text-xs uppercase tracking-[0.2em] no-underline hover:border-[#7CFC00]"
                >
                  Join the List
                </Link>
              </Show>
            </div>
          </div>

          <div className="border border-neutral-800 bg-[#101010] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.32)]">
            <div className="grid grid-cols-2 gap-3">
              {featuredMediums.map((medium, index) => (
                <div key={medium} className="min-h-20 border border-neutral-800 bg-[#080808] p-3">
                  <span className="text-neutral-600 text-[10px]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="mt-3 font-black text-sm uppercase tracking-[0.12em]">{medium}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-neutral-800 border-t px-5 py-14">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="font-black text-[#7CFC00] text-xs uppercase tracking-[0.28em]">
                First wall
              </p>
              <h2 className="mt-2 font-black text-3xl tracking-tight">Recent Artmakers</h2>
            </div>
            <Link
              to="/artmakers"
              className="inline-flex items-center gap-2 font-black text-[#7CFC00] text-xs uppercase tracking-[0.22em] no-underline"
            >
              View all
              <ArrowRight className="size-4" />
            </Link>
          </div>

          {featuredArtmakers.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {featuredArtmakers.map((artmaker) => (
                <Link
                  key={artmaker.id}
                  to="/artmakers/$slug"
                  params={{ slug: artmaker.slug }}
                  className="group border border-neutral-800 bg-[#101010] p-5 no-underline transition-colors hover:border-[#7CFC00]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-black text-2xl text-white tracking-tight group-hover:text-[#7CFC00]">
                        {artmaker.name}
                      </h3>
                      <p className="mt-2 flex items-center gap-2 text-neutral-400 text-sm">
                        <MapPin className="size-4" />
                        {artmaker.city}, {artmaker.state}
                      </p>
                    </div>
                    <Instagram className="size-5 text-neutral-500" />
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {artmaker.medium.slice(0, 4).map((medium) => (
                      <span
                        key={medium}
                        className="border border-neutral-800 px-2 py-1 text-neutral-300 text-xs"
                      >
                        {medium}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="border border-neutral-800 bg-[#101010] p-8">
              <p className="text-neutral-300">
                The arts directory is ready for the first imported sheet rows and artist signups.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
