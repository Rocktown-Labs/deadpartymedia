import { vi } from 'vitest'

export type MockUser = {
  id: string
  emailAddresses: Array<{ emailAddress: string; id: string }>
  firstName: string | null
  lastName: string | null
  imageUrl: string
  publicMetadata: Record<string, unknown>
}

export const createMockUser = (overrides?: Partial<MockUser>): MockUser => ({
  id: 'user_test123',
  emailAddresses: [{ emailAddress: 'test@example.com', id: 'email1' }],
  firstName: 'Test',
  lastName: 'User',
  imageUrl: 'https://example.com/avatar.jpg',
  publicMetadata: {
    role: 'fan',
    onboardingComplete: false,
  },
  ...overrides,
})

export const createMockClerkAuth = (userId: string | null = 'user_test123') => ({
  userId,
  sessionId: userId ? 'session_test123' : null,
  isLoaded: true,
})

export const createMockClerkClient = () => ({
  users: {
    getUser: vi.fn(),
    updateUser: vi.fn(),
    updateUserMetadata: vi.fn(),
  },
  invitations: {
    createInvitation: vi.fn(),
  },
})

// Helper to reset all mocks
export const resetClerkMocks = () => {
  vi.clearAllMocks()
}
