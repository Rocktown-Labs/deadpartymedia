import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Instagram, MapPin } from "lucide-react";
import { getArtmakerBySlug } from "#/lib/artmakers.functions.ts";
import { createSeoMeta, getAbsoluteUrl } from "#/lib/seo.ts";

export const Route = createFileRoute("/artmakers/$slug")({
  component: ArtmakerProfile,
  head: ({ loaderData }) => {
    const description = loaderData
      ? `${loaderData.name} is an Arkansas artmaker in ${loaderData.city}, ${loaderData.state}, working in ${loaderData.medium.join(", ")}.`
      : "Arkansas artmaker profile on Dead Party Arts.";

    return {
      ...createSeoMeta({
        description,
        image: loaderData?.image,
        path: loaderData ? `/artmakers/${loaderData.slug}` : "/artmakers",
        title: loaderData?.name ?? "Artmaker",
        type: "profile",
      }),
      scripts: loaderData
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Person",
                description,
                image: loaderData.image ?? undefined,
                name: loaderData.name,
                sameAs: [loaderData.instagramUrl],
                url: getAbsoluteUrl(`/artmakers/${loaderData.slug}`),
                workLocation: {
                  "@type": "Place",
                  address: {
                    "@type": "PostalAddress",
                    addressLocality: loaderData.city,
                    addressRegion: loaderData.state,
                  },
                },
              }),
            },
          ]
        : [],
    };
  },
  loader: async ({ params }) => {
    const artmaker = await getArtmakerBySlug({ data: { slug: params.slug } });

    if (!artmaker) {
      throw notFound();
    }

    return artmaker;
  },
});

function ArtmakerProfile() {
  const artmaker = Route.useLoaderData();

  return (
    <main className="px-5 pt-40 pb-20">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/artmakers"
          className="mb-8 inline-flex items-center gap-2 font-black text-[#7CFC00] text-xs uppercase tracking-[0.22em] no-underline"
        >
          <ArrowLeft className="size-4" />
          Back to Artmakers
        </Link>

        <section className="border border-neutral-800 bg-[#101010]">
          <div className="grid gap-8 p-5 md:grid-cols-[220px_1fr] md:p-8">
            <div className="grid aspect-square place-items-center border border-neutral-800 bg-[#080808]">
              <span className="font-black text-7xl text-[#7CFC00]">
                {artmaker.name.slice(0, 1).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                <div>
                  <h1 className="font-black text-5xl leading-none tracking-tighter">
                    {artmaker.name}
                  </h1>
                  {artmaker.showPronouns && artmaker.pronouns ? (
                    <p className="mt-3 text-neutral-400">{artmaker.pronouns}</p>
                  ) : null}
                </div>
                <a
                  href={artmaker.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2 border border-neutral-700 px-4 font-black text-white text-xs uppercase tracking-[0.18em] no-underline hover:border-[#7CFC00] hover:text-[#7CFC00]"
                >
                  <Instagram className="size-4" />@{artmaker.instagramUsername}
                </a>
              </div>

              <p className="mt-5 flex items-center gap-2 text-neutral-400">
                <MapPin className="size-4 text-[#7CFC00]" />
                {artmaker.city}, {artmaker.state}
              </p>

              {artmaker.bio ? (
                <p className="mt-6 max-w-3xl text-neutral-300 leading-7">{artmaker.bio}</p>
              ) : (
                <p className="mt-6 max-w-3xl text-neutral-500 leading-7">
                  This profile is live. Artwork uploads, featured posts, and events are queued for
                  the next phase.
                </p>
              )}

              <div className="mt-8 flex flex-wrap gap-2">
                {artmaker.medium.map((medium) => (
                  <span
                    key={medium}
                    className="border border-[#7CFC00]/40 bg-[#7CFC00]/10 px-3 py-2 text-[#7CFC00] text-sm"
                  >
                    {medium}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="border border-neutral-800 bg-[#101010] p-5">
            <p className="font-black text-3xl text-[#7CFC00]">{artmaker.artworkCount}</p>
            <p className="mt-2 text-neutral-500 text-sm uppercase tracking-[0.18em]">Artworks</p>
          </div>
          <div className="border border-neutral-800 bg-[#101010] p-5 md:col-span-2">
            <h2 className="font-black text-xl">Artwork wall coming next</h2>
            <p className="mt-2 text-neutral-400 text-sm leading-6">
              The schema is ready for uploads, sale flags, and future Stripe Connect pricing. This
              first profile pass keeps Instagram as the public discovery link.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
