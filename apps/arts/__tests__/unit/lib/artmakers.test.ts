import { describe, expect, it } from "vite-plus/test";
import { artmakerOnboardingSchema, fanOnboardingSchema } from "#/lib/artmakers.ts";
import { createSlug } from "#/lib/slug.ts";

describe("createSlug", () => {
  it("should convert artist names into lowercase kebab-case slugs", () => {
    expect(createSlug("John Doe Art")).toBe("john-doe-art");
  });

  it("should strip special characters and punctuation", () => {
    expect(createSlug("Jane & The Art-Makers!!!")).toBe("jane-the-art-makers");
  });

  it("should handle multiple spaces and trim edges", () => {
    expect(createSlug("   Creative   Studio   ")).toBe("creative-studio");
  });
});

describe("arts onboarding schemas", () => {
  it("should allow fans to finish onboarding with a display name", () => {
    expect(fanOnboardingSchema.parse({ name: "  Casey Collector  " })).toEqual({
      name: "Casey Collector",
    });
  });

  it("should preserve uploaded profile image keys for artmakers", () => {
    const parsed = artmakerOnboardingSchema.parse({
      bio: "Painter and muralist.",
      city: "Little Rock",
      customMedium: "",
      image: "",
      imageKey: "artmaker-profiles/profile.png",
      instagramUsername: "@studio.test",
      medium: ["Painting"],
      name: "Studio Test",
      phoneNumber: "(501) 555-0101",
      pronouns: "",
      showPronouns: false,
      state: "ar",
    });

    expect(parsed.imageKey).toBe("artmaker-profiles/profile.png");
    expect(parsed.instagramUsername).toBe("studio.test");
    expect(parsed.phoneNumber).toBe("+15015550101");
    expect(parsed.state).toBe("AR");
  });
});
