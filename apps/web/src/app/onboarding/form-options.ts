import { formOptions } from "@tanstack/react-form-nextjs";

// Fan form options - minimal fields (name only)
export const fanFormOptions = formOptions({
  defaultValues: {
    bio: "",
    genre: undefined as
      | "COUNTRY"
      | "EDM"
      | "HARDCORE & ROCK"
      | "HIP-HOP & R&B"
      | "OTHER"
      | undefined,
    image: "",
    instagram: "",
    location: "",
    name: "",
    phoneNumber: "",
    spotifyArtistId: "",
    spotifyUrl: "",
    tiktok: "",
    twitter: "",
    website: "",
  },
});

// Artist form options - all fields
export const artistFormOptions = formOptions({
  defaultValues: {
    bio: "",
    genre: "OTHER" as "COUNTRY" | "EDM" | "HARDCORE & ROCK" | "HIP-HOP & R&B" | "OTHER",
    image: "",
    instagram: "",
    location: "",
    name: "",
    phoneNumber: "",
    spotifyArtistId: "",
    spotifyUrl: "",
    tiktok: "",
    twitter: "",
    website: "",
  },
});

// Export types for use in components
export type FanFormData = typeof fanFormOptions.defaultValues;
export type ArtistFormData = typeof artistFormOptions.defaultValues;
