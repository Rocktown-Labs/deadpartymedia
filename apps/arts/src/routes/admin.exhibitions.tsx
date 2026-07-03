import { createFileRoute, Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { ArtsAdminShell } from "#/components/arts-admin-shell.tsx";
import { requireArtsStaff } from "#/lib/artmakers.functions.ts";
import { listPublishedArtworks } from "#/lib/artworks.functions.ts";

export const Route = createFileRoute("/admin/exhibitions")({
  beforeLoad: () => requireArtsStaff(),
  component: AdminExhibitions,
  loader: () => listPublishedArtworks(),
});

function AdminExhibitions() {
  const staff = Route.useRouteContext();
  const artworks = Route.useLoaderData();

  return (
    <ArtsAdminShell role={staff.role}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-black text-4xl tracking-tight">Exhibitions</h1>
          <p className="mt-3 max-w-2xl text-gray-400">
            Curate the public artwork wall from artist uploads. Full moderation controls come next.
          </p>
        </div>
        <Link
          to="/exhibitions"
          className="rounded-lg border border-gray-800 px-4 py-3 font-black text-white text-xs uppercase tracking-[0.18em] no-underline hover:border-[#7CFC00] hover:text-[#7CFC00]"
        >
          View Public Wall
        </Link>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {artworks.map((artwork) => (
          <article
            key={artwork.id}
            className="overflow-hidden rounded-lg border border-gray-800 bg-[#111111]"
          >
            <div className="grid aspect-square place-items-center bg-black">
              <Image
                src={artwork.image}
                alt={artwork.title}
                width={640}
                height={640}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="p-5">
              <h2 className="font-black text-xl">{artwork.title}</h2>
              <p className="mt-2 text-gray-400 text-sm">
                {artwork.artmakerName} - {artwork.medium ?? "Mixed practice"}
              </p>
              <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-wider">
                <span className="text-[#7CFC00]">{artwork.status}</span>
                <span className="text-gray-500">
                  {new Date(artwork.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </ArtsAdminShell>
  );
}
