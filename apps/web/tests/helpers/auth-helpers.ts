import { vi } from 'vitest'

interface MockUser {
  id?: string
  emailAddresses?: Array<{ emailAddress: string; id: string }>
  firstName?: string | null
  lastName?: string | null
  imageUrl?: string
  publicMetadata?: Record<string, unknown>
}

/**
 * Mock Clerk useUser hook
 */
export const mockUseUser = (user: Partial<MockUser> | null = null) => {
  const mockUser = user
    ? {
        id: 'user_test123',
        emailAddresses: [{ emailAddress: 'test@example.com', id: 'email1' }],
        firstName: 'Test',
        lastName: 'User',
        imageUrl: 'https://example.com/avatar.jpg',
        publicMetadata: {
          role: 'fan',
          onboardingComplete: false,
        },
        ...user,
      }
    : null

  vi.mock('@clerk/nextjs', async () => {
    const actual = await vi.importActual('@clerk/nextjs')
    return {
      ...actual,
      useUser: () => ({
        user: mockUser,
        isLoaded: true,
      }),
    }
  })

  return mockUser
}

/**
 * Mock Clerk auth function
 */
export const mockAuth = (userId: string | null = 'user_test123') => {
  vi.mock('@clerk/nextjs/server', async () => {
    const actual = await vi.importActual('@clerk/nextjs/server')
    return {
      ...actual,
      auth: vi.fn(() =>
        Promise.resolve({
          userId,
          sessionId: userId ? 'session_test123' : null,
        })
      ),
    }
  })
}

/**
 * Create mock user with specific role
 */
export const createUserWithRole = (
  role: 'fan' | 'artist' | 'writer' | 'super_admin'
): MockUser => {
  return {
    id: 'user_test123',
    emailAddresses: [{ emailAddress: 'test@example.com', id: 'email1' }],
    firstName: 'Test',
    lastName: 'User',
    imageUrl: 'https://example.com/avatar.jpg',
    publicMetadata: {
      role,
      onboardingComplete: role !== 'fan' && role !== 'artist',
    },
  }
}
