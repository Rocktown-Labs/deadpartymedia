import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PageTitleHeader } from "#/components/page-title-header.tsx";
import { listArtmakers } from "#/lib/artmakers.functions.ts";
import { listMediumGroupArtworks } from "#/lib/artworks.functions.ts";
import { getMediumGroup } from "#/lib/mediums.ts";
import { createSeoMeta } from "#/lib/seo.ts";

export const Route = createFileRoute("/mediums/$slug")({
  component: MediumPage,
  head: ({ loaderData }) =>
    createSeoMeta({
      description: `${loaderData.group.description} Browse Arkansas ${loaderData.group.label.toLowerCase()} artists and artworks on Dead Party Arts.`,
      path: `/mediums/${loaderData.group.slug}`,
      title: `${loaderData.group.label} Artists`,
    }),
  loader: async ({ params }) => {
    const group = getMediumGroup(params.slug);

    if (!group) {
      throw notFound();
    }

    const [artmakers, artworks] = await Promise.all([
      listArtmakers(),
      listMediumGroupArtworks({ data: { slug: params.slug } }),
    ]);

    const matchingArtmakers = artmakers.filter((artmaker) =>
      artmaker.medium.some((medium) =>
        group.mediums.some((candidate) => medium.toLowerCase().includes(candidate.toLowerCase())),
      ),
    );

    return { artmakers: matchingArtmakers, artworks, group };
  },
});

function MediumPage() {
  const { artmakers, artworks, group } = Route.useLoaderData();
  const Icon = group.icon;

  return (
    <main className="px-6 pt-[calc(var(--navbar-offset)+2rem)] pb-20">
      <div className="container mx-auto">
        <Link
          to="/"
          className="mb-8 inline-flex items-center text-[#7CFC00] no-underline transition-transform duration-300 hover:scale-105 hover:text-[#7CFC00]/80"
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to Home
        </Link>
        <div className="mb-6 grid size-16 place-items-center rounded-lg border border-[#7CFC00]/40 text-[#7CFC00]">
          <Icon className="size-8" />
        </div>
        <PageTitleHeader
          eyebrow="Medium"
          title={group.label.toUpperCase()}
          description={group.description}
        />

        <section className="mb-14">
          <div className="mb-5 flex items-end justify-between gap-4">
            <h2 className="font-black text-2xl">Artists</h2>
            <p className="text-gray-500 text-sm">{artmakers.length} listed</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {artmakers.length > 0 ? (
              artmakers.map((artmaker) => (
                <Link
                  key={artmaker.id}
                  to="/artmakers/$slug"
                  params={{ slug: artmaker.slug }}
                  className="rounded-lg border border-gray-800 bg-[#111111] p-5 text-white no-underline hover:border-[#7CFC00]"
                >
                  <h3 className="font-black text-xl">{artmaker.name}</h3>
                  <p className="mt-2 text-gray-400 text-sm">
                    {artmaker.city}, {artmaker.state}
                  </p>
                  <p className="mt-4 line-clamp-2 text-gray-500 text-sm">
                    {artmaker.medium.join(", ")}
                  </p>
                </Link>
              ))
            ) : (
              <p className="rounded-lg border border-gray-800 bg-[#111111] p-6 text-gray-400 md:col-span-2 xl:col-span-3">
                No artmakers are tagged to this category yet.
              </p>
            )}
          </div>
        </section>

        <section>
          <div className="mb-5 flex items-end justify-between gap-4">
            <h2 className="font-black text-2xl">Artwork</h2>
            <p className="text-gray-500 text-sm">{artworks.length} pieces</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {artworks.length > 0 ? (
              artworks.map((artwork) => (
                <article
                  key={artwork.id}
                  className="overflow-hidden rounded-lg border border-gray-800 bg-[#111111]"
                >
                  <img
                    src={artwork.image}
                    alt={artwork.title}
                    className="aspect-square w-full object-cover"
                  />
                  <div className="p-5">
                    <h3 className="font-black text-xl">{artwork.title}</h3>
                    <p className="mt-2 text-gray-400 text-sm">{artwork.artmakerName}</p>
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-lg border border-gray-800 bg-[#111111] p-6 text-gray-400 sm:col-span-2 xl:col-span-3">
                Artwork for this category will appear as artists upload it.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
