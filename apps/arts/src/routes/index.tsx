import { Show } from "@clerk/tanstack-react-start";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { ArrowRight, Instagram, MapPin } from "lucide-react";
import { listArtmakers } from "#/lib/artmakers.functions.ts";
import { MEDIUM_GROUPS } from "#/lib/mediums.ts";
import { createSeoMeta, siteName, siteUrl } from "#/lib/seo.ts";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    ...createSeoMeta({
      description:
        "Dead Party Arts is an Arkansas visual art directory and editorial home for painters, ceramicists, illustrators, tattooers, photographers, designers, and makers.",
      title: siteName,
    }),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          description:
            "An Arkansas visual art directory and editorial home for artists, events, and creative culture.",
          name: siteName,
          url: siteUrl,
        }),
      },
    ],
  }),
  loader: () => listArtmakers(),
});

function Home() {
  const artmakers = Route.useLoaderData();
  const featuredArtmakers = artmakers.slice(0, 6);

  return (
    <main className="pt-[calc(var(--navbar-offset)+1.25rem)]">
      <section className="relative overflow-hidden px-6 py-12 md:py-16">
        <div className="container relative mx-auto grid gap-10 lg:grid-cols-[minmax(0,0.96fr)_minmax(420px,0.74fr)] lg:items-center">
          <div>
            <h1 className="max-w-4xl font-black text-5xl leading-[0.92] tracking-tighter md:text-7xl xl:text-8xl">
              Arkansas artists deserve a louder wall.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-neutral-300 leading-8 md:text-xl">
              Dead Party Arts is a living index for painters, ceramicists, illustrators, tattooers,
              designers, photographers, muralists, and every Arkansas maker building the scene in
              full color.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/exhibitions"
                className="inline-flex h-12 items-center gap-2 rounded-lg border border-[#7CFC00] bg-[#7CFC00] px-5 font-black text-black text-xs uppercase tracking-[0.18em] no-underline transition-colors hover:bg-[#a5ff43]"
              >
                View Exhibitions
                <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/artmakers"
                className="inline-flex h-12 items-center rounded-lg border border-gray-800 px-5 font-black text-white text-xs uppercase tracking-[0.18em] no-underline transition-colors hover:border-[#7CFC00]"
              >
                Browse Artists
              </Link>
              <Show when="signed-in">
                <Link
                  to="/onboarding"
                  className="inline-flex h-12 items-center rounded-lg border border-gray-800 px-5 font-black text-white text-xs uppercase tracking-[0.18em] no-underline transition-colors hover:border-[#7CFC00]"
                >
                  Build Profile
                </Link>
              </Show>
              <Show when="signed-out">
                <Link
                  to="/onboarding"
                  className="inline-flex h-12 items-center rounded-lg border border-gray-800 px-5 font-black text-white text-xs uppercase tracking-[0.18em] no-underline transition-colors hover:border-[#7CFC00]"
                >
                  Create Artist Profile
                </Link>
              </Show>
            </div>
          </div>

          <div className="relative">
            <div className="-top-8 -left-8 absolute hidden size-28 border border-[#7CFC00]/30 lg:block" />
            <div className="-right-8 -bottom-8 absolute hidden size-36 border border-fuchsia-500/25 lg:block" />
            <div className="relative rounded-xl border border-gray-800 bg-[#101010]/95 p-4 shadow-[0_30px_80px_rgba(0,0,0,0.32)]">
              <div className="mb-4 flex items-center justify-between border-gray-800 border-b pb-4">
                <div>
                  <p className="font-black text-[#7CFC00] text-[10px] uppercase tracking-[0.28em]">
                    Mediums
                  </p>
                  <h2 className="mt-1 font-black text-xl tracking-tight">What Arkansas makes</h2>
                </div>
                <Image
                  src="/images/deadpartyarts-trans.png"
                  alt=""
                  width={56}
                  height={56}
                  className="size-14 object-contain"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {MEDIUM_GROUPS.map((group, index) => (
                  <Link
                    key={group.slug}
                    to="/exhibitions"
                    search={{ medium: group.slug }}
                    className="min-h-20 rounded-lg border border-gray-800 bg-[#080808] p-3 transition-colors hover:border-[#7CFC00]/60"
                  >
                    <span className="text-gray-600 text-[10px]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <p className="mt-3 font-black text-sm text-white uppercase tracking-[0.12em]">
                      {group.label}
                    </p>
                    <p className="mt-2 line-clamp-2 text-gray-500 text-xs">{group.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-gray-800 border-t px-6 py-14">
        <div className="container mx-auto">
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
            <div className="rounded-xl border border-gray-800 bg-[#101010] p-8">
              <p className="text-neutral-300">
                The directory is ready for imported sheet rows and the first wave of artist
                profiles.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
