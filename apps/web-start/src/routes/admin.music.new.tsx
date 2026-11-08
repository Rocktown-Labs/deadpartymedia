import { createFileRoute } from "@tanstack/react-router";
import { EntityForm, type EntityField } from "../components/admin/entity-form";

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

/** New music release — create form. */
export const Route = createFileRoute("/admin/music/new")({
  component: () => (
    <EntityForm endpoint="/music/admin/music" fields={fields} initial={{}} title="Music Release" />
  ),
  head: () => ({ meta: [{ title: "New Music Release | Dead Party Media" }] }),
});
