import { formOptions } from "@tanstack/react-form-nextjs";

// Fan form options - minimal fields (name only)
export const fanFormOptions = formOptions({
  defaultValues: {
    name: "",
    location: "",
    genre: undefined as
      | "COUNTRY"
      | "EDM"
      | "HARDCORE & ROCK"
      | "HIP-HOP & R&B"
      | "OTHER"
      | undefined,
    bio: "",
    spotifyUrl: "",
    spotifyArtistId: "",
    instagram: "",
    twitter: "",
    tiktok: "",
    website: "",
    image: "",
  },
});

// Artist form options - all fields
export const artistFormOptions = formOptions({
  defaultValues: {
    name: "",
    location: "",
    genre: "OTHER" as "COUNTRY" | "EDM" | "HARDCORE & ROCK" | "HIP-HOP & R&B" | "OTHER",
    bio: "",
    spotifyUrl: "",
    spotifyArtistId: "",
    instagram: "",
    twitter: "",
    tiktok: "",
    website: "",
    image: "",
  },
});

// Export types for use in components
export type FanFormData = typeof fanFormOptions.defaultValues;
export type ArtistFormData = typeof artistFormOptions.defaultValues;
