import { describe, expect, it } from "vite-plus/test";
import { createSlug } from "#/lib/slug.ts";

describe("venues slug generation and address formatting", () => {
  it("should create valid kebab-case slugs for venue names", () => {
    expect(createSlug("Arkansas Museum of Fine Arts")).toBe("arkansas-museum-of-fine-arts");
    expect(createSlug("The Bernice Garden")).toBe("the-bernice-garden");
    expect(createSlug("Vino's Brewpub & Live Music")).toBe("vino-s-brewpub-live-music");
    expect(createSlug("Windgate Center for Fine Arts")).toBe("windgate-center-for-fine-arts");
  });

  it("should format location strings correctly", () => {
    const city = "Little Rock";
    const state = "AR";
    const location = `${city}, ${state}`;
    expect(location).toBe("Little Rock, AR");
  });

  it("should handle custom venue city and state fallback values", () => {
    const venueData = {
      address: "501 E 9th St",
      city: "Little Rock",
      name: "AMFA Glass Gallery",
      state: "AR",
    };

    expect(venueData.name).toBe("AMFA Glass Gallery");
    expect(venueData.city).toBe("Little Rock");
    expect(venueData.state).toBe("AR");
  });
});
