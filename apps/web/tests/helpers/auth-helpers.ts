import { vi } from "vite-plus/test";

interface MockUser {
  id?: string;
  emailAddresses?: { emailAddress: string; id: string }[];
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string;
  publicMetadata?: Record<string, unknown>;
}

/**
 * Mock Clerk useUser hook
 */
export const mockUseUser = (user: Partial<MockUser> | null = null) => {
  const mockUser = user
    ? {
        emailAddresses: [{ emailAddress: "test@example.com", id: "email1" }],
        firstName: "Test",
        id: "user_test123",
        imageUrl: "https://example.com/avatar.jpg",
        lastName: "User",
        publicMetadata: {
          onboardingComplete: false,
          role: "fan",
        },
        ...user,
      }
    : null;

  vi.mock("@clerk/nextjs", async () => {
    const actual = await vi.importActual("@clerk/nextjs");
    return {
      ...actual,
      useUser: () => ({
        isLoaded: true,
        user: mockUser,
      }),
    };
  });

  return mockUser;
};

/**
 * Mock Clerk auth function
 */
export const mockAuth = (userId: string | null = "user_test123") => {
  vi.mock("@clerk/nextjs/server", async () => {
    const actual = await vi.importActual("@clerk/nextjs/server");
    return {
      ...actual,
      auth: vi.fn(() =>
        Promise.resolve({
          sessionId: userId ? "session_test123" : null,
          userId,
        }),
      ),
    };
  });
};

/**
 * Create mock user with specific role
 */
export const createUserWithRole = (
  role: "fan" | "artist" | "writer" | "super_admin",
): MockUser => ({
  emailAddresses: [{ emailAddress: "test@example.com", id: "email1" }],
  firstName: "Test",
  id: "user_test123",
  imageUrl: "https://example.com/avatar.jpg",
  lastName: "User",
  publicMetadata: {
    onboardingComplete: role !== "fan" && role !== "artist",
    role,
  },
});
