import { artistOnboardingSchema, fanOnboardingSchema } from "@/lib/validations/onboarding";
import type { ArtistOnboardingFormData, FanOnboardingFormData } from "@/lib/validations/onboarding";

describe(artistOnboardingSchema, () => {
  const validArtistData: ArtistOnboardingFormData = {
    bio: "This is a valid bio with more than 10 characters",
    genre: "EDM",
    instagram: "https://instagram.com/testartist",
    location: "Little Rock, AR",
    name: "Test Artist",
    spotifyArtistId: "123",
    spotifyUrl: "https://open.spotify.com/artist/123",
  };

  it("should validate correct artist data", () => {
    const result = artistOnboardingSchema.safeParse(validArtistData);
    expect(result.success).toBeTruthy();
    if (result.success) {
      expect(result.data.name).toBe("Test Artist");
      expect(result.data.location).toBe("Little Rock, AR");
      expect(result.data.genre).toBe("EDM");
    }
  });

  it("should require name", () => {
    const result = artistOnboardingSchema.safeParse({
      ...validArtistData,
      name: "",
    });
    expect(result.success).toBeFalsy();
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("required");
    }
  });

  it("should require location", () => {
    const result = artistOnboardingSchema.safeParse({
      ...validArtistData,
      location: "",
    });
    expect(result.success).toBeFalsy();
  });

  it("should require genre", () => {
    const result = artistOnboardingSchema.safeParse({
      ...validArtistData,
      genre: undefined,
    });
    expect(result.success).toBeFalsy();
  });

  it("should require valid genre enum", () => {
    const result = artistOnboardingSchema.safeParse({
      ...validArtistData,
      genre: "INVALID_GENRE",
    });
    expect(result.success).toBeFalsy();
  });

  it("should require bio with minimum 10 characters", () => {
    const result = artistOnboardingSchema.safeParse({
      ...validArtistData,
      bio: "short",
    });
    expect(result.success).toBeFalsy();
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("at least 10");
    }
  });

  it("should enforce bio maximum length of 500 characters", () => {
    const longBio = "a".repeat(501);
    const result = artistOnboardingSchema.safeParse({
      ...validArtistData,
      bio: longBio,
    });
    expect(result.success).toBeFalsy();
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("less than 500");
    }
  });

  it("should validate URL fields", () => {
    const result = artistOnboardingSchema.safeParse({
      ...validArtistData,
      twitter: "https://twitter.com/artist",
      website: "https://example.com",
    });
    expect(result.success).toBeTruthy();
  });

  it("should reject invalid URLs", () => {
    const result = artistOnboardingSchema.safeParse({
      ...validArtistData,
      spotifyUrl: "not-a-url",
    });
    expect(result.success).toBeFalsy();
  });

  it("should require spotifyUrl and instagram (empty string should fail)", () => {
    const result = artistOnboardingSchema.safeParse({
      ...validArtistData,
      instagram: "",
      spotifyUrl: "",
    });
    expect(result.success).toBeFalsy();
  });

  it("should normalize instagram handle input", () => {
    const result = artistOnboardingSchema.safeParse({
      ...validArtistData,
      instagram: "@myhandle",
    });
    expect(result.success).toBeTruthy();
    if (result.success) {
      expect(result.data.instagram).toBe("https://instagram.com/myhandle");
    }
  });

  it("should accept username-only instagram input (including dots/underscores)", () => {
    const dotted = artistOnboardingSchema.safeParse({
      ...validArtistData,
      instagram: "@my.handle_name",
    });
    expect(dotted.success).toBeTruthy();
    if (dotted.success) {
      expect(dotted.data.instagram).toBe("https://instagram.com/my.handle_name");
    }

    const bare = artistOnboardingSchema.safeParse({
      ...validArtistData,
      instagram: "my.handle_name",
    });
    expect(bare.success).toBeTruthy();
    if (bare.success) {
      expect(bare.data.instagram).toBe("https://instagram.com/my.handle_name");
    }
  });

  it("should normalize instagram URL input to canonical profile URL", () => {
    const result = artistOnboardingSchema.safeParse({
      ...validArtistData,
      instagram: "https://www.instagram.com/myhandle/?utm_source=test",
    });
    expect(result.success).toBeTruthy();
    if (result.success) {
      expect(result.data.instagram).toBe("https://instagram.com/myhandle");
    }
  });

  it("should accept optional phoneNumber and normalize to E.164", () => {
    const result = artistOnboardingSchema.safeParse({
      ...validArtistData,
      phoneNumber: "(501) 555-1212",
    });
    expect(result.success).toBeTruthy();
    if (result.success) {
      expect(result.data.phoneNumber).toBe("+15015551212");
    }
  });

  it("should enforce name max length of 100 characters", () => {
    const longName = "a".repeat(101);
    const result = artistOnboardingSchema.safeParse({
      ...validArtistData,
      name: longName,
    });
    expect(result.success).toBeFalsy();
  });

  it("should enforce location max length of 100 characters", () => {
    const longLocation = "a".repeat(101);
    const result = artistOnboardingSchema.safeParse({
      ...validArtistData,
      location: longLocation,
    });
    expect(result.success).toBeFalsy();
  });
});

describe(fanOnboardingSchema, () => {
  const validFanData: FanOnboardingFormData = {
    name: "Test Fan",
  };

  it("should validate correct fan data with only name", () => {
    const result = fanOnboardingSchema.safeParse(validFanData);
    expect(result.success).toBeTruthy();
  });

  it("should require name", () => {
    const result = fanOnboardingSchema.safeParse({
      name: "",
    });
    expect(result.success).toBeFalsy();
  });

  it("should trim and validate name is not only whitespace", () => {
    const result = fanOnboardingSchema.safeParse({
      name: "   ",
    });
    expect(result.success).toBeFalsy();
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("whitespace");
    }
  });

  it("should allow optional fields", () => {
    const result = fanOnboardingSchema.safeParse({
      bio: "Optional bio",
      genre: "EDM",
      location: "Little Rock, AR",
      name: "Test Fan",
    });
    expect(result.success).toBeTruthy();
  });

  it("should validate optional URL fields when provided", () => {
    const result = fanOnboardingSchema.safeParse({
      name: "Test Fan",
      spotifyUrl: "not-a-url",
    });
    expect(result.success).toBeFalsy();
  });

  it("should transform empty strings to undefined for optional fields", () => {
    const result = fanOnboardingSchema.safeParse({
      location: "",
      name: "Test Fan",
      spotifyUrl: "",
    });
    expect(result.success).toBeTruthy();
    if (result.success) {
      expect(result.data.spotifyUrl).toBeUndefined();
    }
  });

  it("should enforce name max length of 100 characters", () => {
    const longName = "a".repeat(101);
    const result = fanOnboardingSchema.safeParse({
      name: longName,
    });
    expect(result.success).toBeFalsy();
  });
});
