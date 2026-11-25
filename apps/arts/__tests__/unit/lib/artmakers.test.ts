import { describe, expect, it } from "vite-plus/test";
import {
  artmakerOnboardingSchema,
  fanOnboardingSchema,
  normalizePhoneNumber,
  usernameSchema,
} from "#/lib/artmakers.ts";
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

  it("should reject letters and too-short values in phone numbers", () => {
    expect(normalizePhoneNumber("501-abc-1234")).toBe("");
    expect(normalizePhoneNumber("not a phone")).toBe("");
    expect(normalizePhoneNumber("12345")).toBe("");
    expect(normalizePhoneNumber("(501) 555-0101")).toBe("+15015550101");
    expect(normalizePhoneNumber("+44 20 7946 0958")).toBe("+442079460958");

    const invalid = artmakerOnboardingSchema.safeParse({
      bio: "",
      city: "Little Rock",
      customMedium: "",
      image: "",
      imageKey: "",
      instagramUsername: "@studio.test",
      medium: ["Painting"],
      name: "Studio Test",
      phoneNumber: "501-call-now",
      pronouns: "",
      showPronouns: false,
      state: "AR",
    });
    expect(invalid.success).toBe(false);
  });

  it("should validate state codes and unique username format", () => {
    const badState = artmakerOnboardingSchema.safeParse({
      bio: "",
      city: "Little Rock",
      customMedium: "",
      image: "",
      imageKey: "",
      instagramUsername: "@studio.test",
      medium: ["Painting"],
      name: "Studio Test",
      phoneNumber: "5015550101",
      pronouns: "",
      showPronouns: false,
      state: "12",
    });
    expect(badState.success).toBe(false);

    expect(usernameSchema.parse("@babyface_cam")).toBe("babyface_cam");
    expect(usernameSchema.safeParse("ab").success).toBe(false);
    expect(usernameSchema.safeParse("bad name!").success).toBe(false);
  });
});
