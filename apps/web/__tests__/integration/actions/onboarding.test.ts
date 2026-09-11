import { fanOnboardingAction, artistOnboardingAction } from "@/app/onboarding/actions";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

// Mock dependencies
vi.mock<typeof import("@clerk/nextjs/server")>(import("@clerk/nextjs/server"), () => ({
  auth: Object.assign(vi.fn(), { protect: vi.fn() }),
  clerkClient: vi.fn(),
}));
vi.mock<typeof import("next/navigation")>(import("next/navigation"), () => ({
  redirect: vi.fn(),
}));
vi.mock<typeof import("@/lib/db")>(import("@/lib/db"), () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock<typeof import("@/lib/auth/user-state")>(import("@/lib/auth/user-state"), () => ({
  upsertUserAuthState: vi.fn().mockResolvedValue(null),
}));

vi.mock<typeof import("@/lib/utils/slug")>(import("@/lib/utils/slug"), () => ({
  ensureUniqueSlug: vi.fn(async (slug: string, _id?: number, _table?: string) => slug),
  generateSlug: vi.fn((name: string) => name.toLowerCase().replaceAll(/\s+/g, "-")),
}));

describe(fanOnboardingAction, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should redirect if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    const formData = new FormData();
    formData.append("name", "Test Fan");

    await fanOnboardingAction(null, formData);

    expect(redirect).toHaveBeenCalledWith("/sign-in");
  });

  it("should complete onboarding for valid fan data", async () => {
    const userId = "user_test123";
    vi.mocked(auth).mockResolvedValue({ userId } as any);

    const mockClient = {
      users: {
        getUser: vi.fn().mockResolvedValue({
          emailAddresses: [{ emailAddress: "fan@example.com", id: "email_1" }],
          imageUrl: null,
          lastName: null,
          primaryEmailAddressId: "email_1",
          publicMetadata: {},
        }),
        updateUser: vi.fn(),
        updateUserMetadata: vi.fn(),
      },
    };
    vi.mocked(clerkClient).mockResolvedValue(mockClient as any);

    const formData = new FormData();
    formData.append("name", "Test Fan");

    const result = await fanOnboardingAction(null, formData);

    expect(mockClient.users.updateUser).toHaveBeenCalledWith(userId, {
      firstName: "Test Fan",
    });
    expect(mockClient.users.updateUserMetadata).toHaveBeenCalledWith(userId, {
      publicMetadata: {
        onboardingComplete: true,
        role: "fan",
      },
    });
    expect((result as any).success).toBeTruthy();
  });

  it("should return validation errors for invalid data", async () => {
    const userId = "user_test123";
    vi.mocked(auth).mockResolvedValue({ userId } as any);

    const formData = new FormData();
    // Empty name should fail validation

    const result = await fanOnboardingAction(null, formData);

    expect((result as any).errors).toBeDefined();
    expect((result as any).success).toBeUndefined();
  });
});

describe(artistOnboardingAction, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should redirect if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    const formData = new FormData();
    formData.append("name", "Test Artist");
    formData.append("location", "Little Rock, AR");
    formData.append("genre", "EDM");
    formData.append("bio", "This is a valid bio with more than 10 characters");
    formData.append("spotifyUrl", "https://open.spotify.com/artist/123");
    formData.append("spotifyArtistId", "123");
    formData.append("instagram", "https://instagram.com/testartist");

    await artistOnboardingAction(null, formData);

    expect(redirect).toHaveBeenCalledWith("/sign-in");
  });

  it("should create new artist profile when no artistId in metadata", async () => {
    const userId = "user_test123";
    vi.mocked(auth).mockResolvedValue({ userId } as any);

    const mockUpdateUserMetadata = vi.fn().mockResolvedValue(null);
    const mockGetUser = vi.fn().mockResolvedValue({
      emailAddresses: [{ emailAddress: "artist@example.com", id: "email_1" }],
      id: userId,
      imageUrl: null,
      lastName: null,
      primaryEmailAddressId: "email_1",
      publicMetadata: {},
    });
    const mockClient = {
      users: {
        getUser: mockGetUser,
        updateUser: vi.fn().mockResolvedValue(null),
        updateUserMetadata: mockUpdateUserMetadata,
      },
    };
    vi.mocked(clerkClient).mockResolvedValue(mockClient as any);

    // Mock database operations - db.insert(table).values(...) resolves a promise
    const mockValues = vi.fn().mockResolvedValue(null);
    vi.mocked(db.insert).mockReturnValue({
      values: mockValues,
    } as any);
    // No existing claimed artist for this user (duplicate-mint guard)
    const mockLimit = vi.fn().mockResolvedValue([]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as any);

    const formData = new FormData();
    formData.append("name", "Test Artist");
    formData.append("location", "Little Rock, AR");
    formData.append("genre", "EDM");
    formData.append("bio", "This is a valid bio with more than 10 characters");
    formData.append("spotifyUrl", "https://open.spotify.com/artist/123");
    formData.append("spotifyArtistId", "123");
    formData.append("instagram", "testartist");

    const result = await artistOnboardingAction(null, formData);

    // Check that the action completed successfully
    expect((result as any).success).toBeTruthy();

    // Verify updateUserMetadata was called with correct arguments
    expect(mockUpdateUserMetadata).toHaveBeenCalledWith(userId, {
      publicMetadata: {
        onboardingComplete: true,
        role: "artist",
      },
    });
  });

  it("should claim existing artist profile when artistId in metadata", async () => {
    const userId = "user_test123";
    const artistId = 1;
    vi.mocked(auth).mockResolvedValue({ userId } as any);

    const mockClient = {
      users: {
        getUser: vi.fn().mockResolvedValue({
          emailAddresses: [{ emailAddress: "artist2@example.com", id: "email_1" }],
          imageUrl: null,
          lastName: null,
          primaryEmailAddressId: "email_1",
          publicMetadata: {
            artistId: artistId.toString(),
          },
        }),
        updateUser: vi.fn().mockResolvedValue(null),
        updateUserMetadata: vi.fn(),
      },
    };
    vi.mocked(clerkClient).mockResolvedValue(mockClient as any);

    // Mock database select and update
    const _mockSelect = vi.fn().mockReturnThis();
    const mockFrom = vi.fn().mockReturnThis();
    const mockWhere = vi.fn().mockReturnThis();
    const mockLimit = vi.fn().mockResolvedValue([
      {
        claimed: false,
        id: artistId,
        name: "Existing Artist",
      },
    ]);
    vi.mocked(db.select).mockReturnValue({
      from: mockFrom,
    } as any);
    mockFrom.mockReturnValue({
      where: mockWhere,
    } as any);
    mockWhere.mockReturnValue({
      limit: mockLimit,
    } as any);

    const _mockUpdate = vi.fn().mockReturnThis();
    const mockSet = vi.fn().mockReturnThis();
    vi.mocked(db.update).mockReturnValue({
      set: mockSet,
    } as any);
    mockSet.mockReturnValue({
      where: vi.fn(),
    } as any);

    const formData = new FormData();
    formData.append("name", "Updated Artist Name");
    formData.append("location", "Little Rock, AR");
    formData.append("genre", "EDM");
    formData.append("bio", "This is a valid bio with more than 10 characters");
    formData.append("spotifyUrl", "https://open.spotify.com/artist/123");
    formData.append("spotifyArtistId", "123");
    formData.append("instagram", "@testartist");

    const result = await artistOnboardingAction(null, formData);

    expect(mockClient.users.updateUserMetadata).toHaveBeenCalledTimes(1);
    expect((result as any).success).toBeTruthy();
  });

  it("should return error if artist profile already claimed", async () => {
    const userId = "user_test123";
    const artistId = 1;
    vi.mocked(auth).mockResolvedValue({ userId } as any);

    const mockClient = {
      users: {
        getUser: vi.fn().mockResolvedValue({
          publicMetadata: {
            artistId: artistId.toString(),
          },
        }),
      },
    };
    vi.mocked(clerkClient).mockResolvedValue(mockClient as any);

    // Mock database to return already claimed artist
    const _mockSelect = vi.fn().mockReturnThis();
    const mockFrom = vi.fn().mockReturnThis();
    const mockWhere = vi.fn().mockReturnThis();
    const mockLimit = vi.fn().mockResolvedValue([
      {
        claimed: true,
        id: artistId,
        name: "Existing Artist",
      },
    ]);
    vi.mocked(db.select).mockReturnValue({
      from: mockFrom,
    } as any);
    mockFrom.mockReturnValue({
      where: mockWhere,
    } as any);
    mockWhere.mockReturnValue({
      limit: mockLimit,
    } as any);

    const formData = new FormData();
    formData.append("name", "Test Artist");
    formData.append("location", "Little Rock, AR");
    formData.append("genre", "EDM");
    formData.append("bio", "This is a valid bio with more than 10 characters");
    formData.append("spotifyUrl", "https://open.spotify.com/artist/123");
    formData.append("spotifyArtistId", "123");
    formData.append("instagram", "https://instagram.com/testartist");

    const result = await artistOnboardingAction(null, formData);

    expect((result as any).errors).toBeDefined();
    expect((result as any).errors[0]).toContain("already been claimed");
  });
});
