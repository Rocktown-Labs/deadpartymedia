import { createFileRoute, notFound } from "@tanstack/react-router";
import { EntityForm, type EntityField } from "../components/admin/entity-form";
import { apiFetchWithAuth } from "../lib/api.server";

const fields: EntityField[] = [
  { key: "name", label: "Name", placeholder: "Artist name" },
  { key: "slug", label: "Slug" },
  {
    key: "genre",
    label: "Genre",
    options: ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"],
  },
  { key: "bio", label: "Bio", textarea: true },
  { key: "location", label: "Location" },
  { key: "image", label: "Image URL" },
  { key: "spotifyUrl", label: "Spotify URL" },
  { key: "spotifyArtistId", label: "Spotify artist ID" },
  { key: "instagram", label: "Instagram" },
  { key: "twitter", label: "Twitter" },
  { key: "tiktok", label: "TikTok" },
  { key: "website", label: "Website" },
  { key: "email", label: "Email" },
  { key: "phoneNumber", label: "Phone" },
];

/** Edit artist — loads the full row then renders the form. */
export const Route = createFileRoute("/admin/artists/$id")({
  component: () => {
    const { row } = Route.useLoaderData();
    return (
      <EntityForm
        endpoint="/music/admin/artists"
        fields={fields}
        id={row.id}
        initial={row}
        title="Artist"
      />
    );
  },
  head: () => ({ meta: [{ title: "Edit Artist | Dead Party Media" }] }),
  loader: async ({ params }) => {
    const data = await apiFetchWithAuth<{ artist: Record<string, unknown> }>(
      "/music/admin/artists/" + params.id,
    ).catch(() => null);
    if (!data?.artist) {
      throw notFound();
    }
    return { row: data.artist as Record<string, unknown> & { id: number } };
  },
});
