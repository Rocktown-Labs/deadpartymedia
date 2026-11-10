import { describe, expect, it } from "vite-plus/test";
import { artistSchema } from "../src/artist";
import { artistOnboardingSchema } from "../src/onboarding";
import { venueSchema } from "../src/venue";

describe("contracts: artist onboarding schema", () => {
  it("accepts a valid artist onboarding payload", () => {
    const result = artistOnboardingSchema.safeParse({
      bio: "Punk band from Little Rock.",
      genre: "HARDCORE & ROCK",
      instagram: "@deadparty",
      location: "Little Rock, AR",
      name: "Dead Party",
      spotifyArtistId: "abc123",
      spotifyUrl: "https://open.spotify.com/artist/abc123",
    });
    expect(result.success).toBe(true);
    if (!result.success) throw new Error("Expected valid contract");
    expect(result.data.instagram).toBe("https://instagram.com/deadparty");
  });

  it("rejects an invalid genre", () => {
    const result = artistOnboardingSchema.safeParse({
      bio: "Punk band from Little Rock.",
      genre: "JAZZ",
      instagram: "@deadparty",
      location: "Little Rock, AR",
      name: "Dead Party",
      spotifyArtistId: "abc123",
      spotifyUrl: "https://open.spotify.com/artist/abc123",
    });
    expect(result.success).toBe(false);
  });
});

describe("contracts: artist schema", () => {
  it("normalizes an empty optional URL to undefined", () => {
    const result = artistSchema.safeParse({
      bio: "Bio",
      genre: "OTHER",
      location: "Little Rock",
      name: "Artist",
      website: "",
    });
    expect(result.success).toBe(true);
    if (!result.success) throw new Error("Expected valid contract");
    expect(result.data.website).toBeUndefined();
  });
});

describe("contracts: venue schema", () => {
  it("applies city and state defaults", () => {
    const result = venueSchema.safeParse({ name: "Vino's" });
    expect(result.success).toBe(true);
    if (!result.success) throw new Error("Expected valid contract");
    expect(result.data.city).toBe("Little Rock");
    expect(result.data.state).toBe("AR");
  });
});
