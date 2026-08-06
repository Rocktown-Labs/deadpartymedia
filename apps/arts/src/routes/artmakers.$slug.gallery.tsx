import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { ArrowLeft, BadgeDollarSign } from "lucide-react";
import { getArtmakerBySlug } from "#/lib/artmakers.functions.ts";
import { listPublishedArtworksByArtmakerSlug } from "#/lib/artworks.functions.ts";
import { createSeoMeta } from "#/lib/seo.ts";

export const Route = createFileRoute("/artmakers/$slug/gallery")({
  component: ArtmakerGallery,
  head: ({ loaderData }) =>
    createSeoMeta({
      description: loaderData?.artmaker
        ? `Full artwork gallery for ${loaderData.artmaker.name} on Dead Party Arts.`
        : "Artmaker gallery on Dead Party Arts.",
      image: loaderData?.artworks[0]?.image ?? loaderData?.artmaker?.image,
      path: loaderData?.artmaker ? `/artmakers/${loaderData.artmaker.slug}/gallery` : "/artmakers",
      title: loaderData?.artmaker ? `${loaderData.artmaker.name} Gallery` : "Artmaker Gallery",
      type: "profile",
    }),
  loader: async ({ params }) => {
    const [artmaker, artworks] = await Promise.all([
      getArtmakerBySlug({ data: { slug: params.slug } }),
      listPublishedArtworksByArtmakerSlug({ data: { slug: params.slug } }),
    ]);

    if (!artmaker) {
      throw notFound();
    }

    return { artmaker, artworks };
  },
});

function ArtmakerGallery() {
  const { artmaker, artworks } = Route.useLoaderData();

  return (
    <main className="px-5 pt-32 pb-20">
      <div className="mx-auto max-w-7xl">
        <Link
          to="/artmakers/$slug"
          params={{ slug: artmaker.slug }}
          className="mb-8 inline-flex items-center gap-2 font-black text-[#7CFC00] text-xs uppercase tracking-[0.22em] no-underline"
        >
          <ArrowLeft className="size-4" />
          Back to profile
        </Link>

        <div className="mb-8">
          <p className="font-black text-[#7CFC00] text-xs uppercase tracking-[0.24em]">
            Full gallery
          </p>
          <h1 className="mt-3 font-black text-5xl leading-none tracking-tight">{artmaker.name}</h1>
          <p className="mt-3 text-neutral-400">
            {artworks.length} published artwork{artworks.length === 1 ? "" : "s"}
          </p>
        </div>

        {artworks.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {artworks.map((artwork) => (
              <article key={artwork.id} className="border border-neutral-800 bg-[#101010]">
                <Image
                  src={artwork.image}
                  alt={artwork.title}
                  width={720}
                  height={720}
                  className="aspect-square w-full object-cover"
                />
                <div className="p-5">
                  <p className="text-[#7CFC00] text-xs uppercase tracking-[0.2em]">
                    {artwork.medium ?? "Mixed practice"}
                  </p>
                  <h2 className="mt-2 font-black text-xl">{artwork.title}</h2>
                  {artwork.description ? (
                    <p className="mt-3 text-neutral-400 text-sm leading-6">{artwork.description}</p>
                  ) : null}
                  {artwork.forSale ? (
                    <p className="mt-4 inline-flex items-center gap-2 text-neutral-400 text-xs uppercase tracking-[0.14em]">
                      <BadgeDollarSign className="size-4 text-[#7CFC00]" />
                      Available
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="border border-neutral-800 bg-[#101010] p-8 text-center text-neutral-400">
            No public artwork has been added yet.
          </div>
        )}
      </div>
    </main>
  );
}
