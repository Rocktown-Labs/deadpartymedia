import { vi } from "vite-plus/test";

export interface MockUser {
  id: string;
  emailAddresses: { emailAddress: string; id: string }[];
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  publicMetadata: Record<string, unknown>;
}

export const createMockUser = (overrides?: Partial<MockUser>): MockUser => ({
  emailAddresses: [{ emailAddress: "test@example.com", id: "email1" }],
  firstName: "Test",
  id: "user_test123",
  imageUrl: "https://example.com/avatar.jpg",
  lastName: "User",
  publicMetadata: {
    onboardingComplete: false,
    role: "fan",
  },
  ...overrides,
});

export const createMockClerkAuth = (userId: string | null = "user_test123") => ({
  isLoaded: true,
  sessionId: userId ? "session_test123" : null,
  userId,
});

export const createMockClerkClient = () => ({
  invitations: {
    createInvitation: vi.fn(),
  },
  users: {
    getUser: vi.fn(),
    updateUser: vi.fn(),
    updateUserMetadata: vi.fn(),
  },
});

// Helper to reset all mocks
export const resetClerkMocks = () => {
  vi.clearAllMocks();
};
