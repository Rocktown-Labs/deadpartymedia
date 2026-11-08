import { createFileRoute, notFound } from "@tanstack/react-router";
import { EntityForm, type EntityField } from "../components/admin/entity-form";
import { apiFetchWithAuth } from "../lib/api";

const fields: EntityField[] = [
  { key: "title", label: "Title" },
  { key: "slug", label: "Slug" },
  { key: "artistName", label: "Artist name" },
  { key: "artistId", label: "Artist ID (optional)" },
  { key: "releaseType", label: "Release type", options: ["Single", "Album", "EP"] },
  {
    key: "genre",
    label: "Genre",
    options: ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"],
  },
  { key: "status", label: "Status", options: ["draft", "published", "archived"] },
  { key: "releaseDate", label: "Release date" },
  { key: "featured", label: "Featured", type: "checkbox" },
  { key: "excerpt", label: "Excerpt", textarea: true },
  { key: "coverArt", label: "Cover art URL" },
  { key: "spotifyUrl", label: "Spotify URL" },
  { key: "appleMusicUrl", label: "Apple Music URL" },
  { key: "bandcampUrl", label: "Bandcamp URL" },
  { key: "youtubeUrl", label: "YouTube URL" },
];

/** Edit music release — loads the full row then renders the form. */
export const Route = createFileRoute("/admin/music/$id")({
  component: () => {
    const { row } = Route.useLoaderData();
    return (
      <EntityForm
        endpoint="/music/admin/music"
        fields={fields}
        id={row.id}
        initial={row}
        title="Music Release"
      />
    );
  },
  head: () => ({ meta: [{ title: "Edit Music Release | Dead Party Media" }] }),
  loader: async ({ params }) => {
    const data = await apiFetchWithAuth<{ release: Record<string, unknown> }>(
      "/music/admin/music/" + params.id,
    ).catch(() => null);
    if (!data?.release) {
      throw notFound();
    }
    return { row: data.release as Record<string, unknown> & { id: number } };
  },
});
