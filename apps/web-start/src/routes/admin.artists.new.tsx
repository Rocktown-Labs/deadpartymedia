import { createFileRoute } from "@tanstack/react-router";
import { EntityForm, type EntityField } from "../components/admin/entity-form";

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

/** New artist — create form. */
export const Route = createFileRoute("/admin/artists/new")({
  component: () => (
    <EntityForm endpoint="/music/admin/artists" fields={fields} initial={{}} title="Artist" />
  ),
  head: () => ({ meta: [{ title: "New Artist | Dead Party Media" }] }),
});
