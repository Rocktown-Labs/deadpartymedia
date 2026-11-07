import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { apiFetch } from "../lib/api";
import { getAbsoluteUrl, sanitizeDescription } from "../lib/seo";

interface ReleaseDetail {
  appleMusicUrl: string | null;
  artistName: string;
  artistSlug: string | null;
  bandcampUrl: string | null;
  content: string | null;
  coverArt: string | null;
  excerpt: string;
  featured: boolean;
  genre: string;
  id: number;
  releaseDate: string | null;
  releaseType: "Album" | "Single" | "EP";
  slug: string;
  spotifyUrl: string | null;
  title: string;
  youtubeUrl: string | null;
}

/**
 * Ported from apps/web/src/app/music/[slug]/page.tsx.
 */
export const Route = createFileRoute("/music/$slug")({
  component: ReleaseDetailPage,
  loader: async ({ params }) => {
    const release = await apiFetch<ReleaseDetail>(`/music/releases/${params.slug}`).catch(
      () => null,
    );
    if (!release) {
      throw notFound();
    }
    return { release };
  },
  head: ({ loaderData }) => {
    const release = loaderData?.release;
    if (!release) {
      return { meta: [{ title: "Release Not Found | Dead Party Media" }] };
    }
    const description = sanitizeDescription(
      release.excerpt,
      `${release.title} by ${release.artistName} on Dead Party Media`,
    );
    const url = getAbsoluteUrl(`/music/${release.slug}`);
    return {
      links: [{ href: url, rel: "canonical" }],
      meta: [
        { content: description, name: "description" },
        { content: description, property: "og:description" },
        { content: release.coverArt ?? "", property: "og:image" },
        { content: "music.song", property: "og:type" },
        { content: url, property: "og:url" },
        { content: "summary_large_image", name: "twitter:card" },
        { title: `${release.title} | Dead Party Media` },
      ],
    };
  },
});

function ReleaseDetailPage() {
  const { release } = Route.useLoaderData();

  const links = [
    release.spotifyUrl ? { href: release.spotifyUrl, label: "Spotify" } : null,
    release.appleMusicUrl ? { href: release.appleMusicUrl, label: "Apple Music" } : null,
    release.bandcampUrl ? { href: release.bandcampUrl, label: "Bandcamp" } : null,
    release.youtubeUrl ? { href: release.youtubeUrl, label: "YouTube" } : null,
  ].filter((link): link is { href: string; label: string } => link !== null);

  return (
    <main className="mx-auto max-w-3xl px-6 pt-24 pb-20">
      {release.coverArt ? (
        <img
          alt={release.title}
          className="mb-6 w-full max-w-sm rounded-md border border-white/10"
          src={release.coverArt}
        />
      ) : null}
      <p className="mb-1 text-sm text-[#7CFC00]">
        {release.releaseType}
        {release.releaseDate ? ` | ${release.releaseDate}` : ""}
      </p>
      <h1 className="mb-2 text-4xl font-black">{release.title}</h1>
      {release.artistSlug ? (
        <Link
          className="text-lg text-gray-300 hover:text-[#7CFC00]"
          params={{ slug: release.artistSlug }}
          to="/artists/$slug"
        >
          {release.artistName}
        </Link>
      ) : (
        <p className="text-lg text-gray-300">{release.artistName}</p>
      )}

      <p className="mt-6 max-w-2xl text-gray-300">{release.excerpt}</p>

      {links.length > 0 ? (
        <div className="mt-8 flex flex-wrap gap-3">
          {links.map((link) => (
            <a
              className="rounded-md border border-[#7CFC00]/40 px-4 py-2 text-sm text-[#7CFC00] hover:bg-[#7CFC00]/10"
              href={link.href}
              key={link.label}
              rel="noopener noreferrer"
              target="_blank"
            >
              {link.label}
            </a>
          ))}
        </div>
      ) : null}

      {release.content ? (
        <div
          className="prose-invert mt-8 max-w-none text-gray-200"
          dangerouslySetInnerHTML={{ __html: release.content }}
        />
      ) : null}
    </main>
  );
}
