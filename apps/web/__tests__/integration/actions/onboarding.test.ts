import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fanOnboardingAction, artistOnboardingAction } from '@/app/onboarding/actions'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'

// Mock dependencies
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  clerkClient: vi.fn(),
}))
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}))

describe('fanOnboardingAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should redirect if user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any)

    const formData = new FormData()
    formData.append('name', 'Test Fan')

    await fanOnboardingAction(null, formData)

    expect(redirect).toHaveBeenCalledWith('/sign-in')
  })

  it('should complete onboarding for valid fan data', async () => {
    const userId = 'user_test123'
    vi.mocked(auth).mockResolvedValue({ userId } as any)

    const mockClient = {
      users: {
        getUser: vi.fn().mockResolvedValue({
          publicMetadata: {},
        }),
        updateUser: vi.fn(),
        updateUserMetadata: vi.fn(),
      },
    }
    vi.mocked(clerkClient).mockResolvedValue(mockClient as any)

    const formData = new FormData()
    formData.append('name', 'Test Fan')

    const result = await fanOnboardingAction(null, formData)

    expect(mockClient.users.updateUser).toHaveBeenCalledWith(userId, {
      firstName: 'Test Fan',
    })
    expect(mockClient.users.updateUserMetadata).toHaveBeenCalledWith(userId, {
      publicMetadata: {
        role: 'fan',
        onboardingComplete: true,
      },
    })
    expect((result as any).success).toBe(true)
  })

  it('should return validation errors for invalid data', async () => {
    const userId = 'user_test123'
    vi.mocked(auth).mockResolvedValue({ userId } as any)

    const formData = new FormData()
    // Empty name should fail validation

    const result = await fanOnboardingAction(null, formData)

    expect((result as any).errors).toBeDefined()
    expect((result as any).success).toBeUndefined()
  })
})

describe('artistOnboardingAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should redirect if user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any)

    const formData = new FormData()
    formData.append('name', 'Test Artist')
    formData.append('location', 'Little Rock, AR')
    formData.append('genre', 'EDM')
    formData.append('bio', 'This is a valid bio with more than 10 characters')

    await artistOnboardingAction(null, formData)

    expect(redirect).toHaveBeenCalledWith('/sign-in')
  })

  it('should create new artist profile when no artistId in metadata', async () => {
    const userId = 'user_test123'
    vi.mocked(auth).mockResolvedValue({ userId } as any)

    const mockClient = {
      users: {
        getUser: vi.fn().mockResolvedValue({
          publicMetadata: {},
        }),
        updateUserMetadata: vi.fn(),
      },
    }
    vi.mocked(clerkClient).mockResolvedValue(mockClient as any)

    // Mock database operations
    const mockInsert = vi.fn().mockReturnThis()
    const mockValues = vi.fn().mockReturnThis()
    const mockReturning = vi.fn().mockResolvedValue([{ id: 1 }])
    vi.mocked(db.insert).mockReturnValue({
      values: mockValues,
    } as any)
    mockValues.mockReturnValue({
      returning: mockReturning,
    } as any)

    const formData = new FormData()
    formData.append('name', 'Test Artist')
    formData.append('location', 'Little Rock, AR')
    formData.append('genre', 'EDM')
    formData.append('bio', 'This is a valid bio with more than 10 characters')

    const result = await artistOnboardingAction(null, formData)

    expect(mockClient.users.updateUserMetadata).toHaveBeenCalledWith(userId, {
      publicMetadata: {
        role: 'artist',
        onboardingComplete: true,
      },
    })
    expect((result as any).success).toBe(true)
  })

  it('should claim existing artist profile when artistId in metadata', async () => {
    const userId = 'user_test123'
    const artistId = 1
    vi.mocked(auth).mockResolvedValue({ userId } as any)

    const mockClient = {
      users: {
        getUser: vi.fn().mockResolvedValue({
          publicMetadata: {
            artistId: artistId.toString(),
          },
        }),
        updateUserMetadata: vi.fn(),
      },
    }
    vi.mocked(clerkClient).mockResolvedValue(mockClient as any)

    // Mock database select and update
    const mockSelect = vi.fn().mockReturnThis()
    const mockFrom = vi.fn().mockReturnThis()
    const mockWhere = vi.fn().mockReturnThis()
    const mockLimit = vi.fn().mockResolvedValue([
      {
        id: artistId,
        name: 'Existing Artist',
        claimed: false,
      },
    ])
    vi.mocked(db.select).mockReturnValue({
      from: mockFrom,
    } as any)
    mockFrom.mockReturnValue({
      where: mockWhere,
    } as any)
    mockWhere.mockReturnValue({
      limit: mockLimit,
    } as any)

    const mockUpdate = vi.fn().mockReturnThis()
    const mockSet = vi.fn().mockReturnThis()
    vi.mocked(db.update).mockReturnValue({
      set: mockSet,
    } as any)
    mockSet.mockReturnValue({
      where: vi.fn(),
    } as any)

    const formData = new FormData()
    formData.append('name', 'Updated Artist Name')
    formData.append('location', 'Little Rock, AR')
    formData.append('genre', 'EDM')
    formData.append('bio', 'This is a valid bio with more than 10 characters')

    const result = await artistOnboardingAction(null, formData)

    expect(mockClient.users.updateUserMetadata).toHaveBeenCalled()
    expect((result as any).success).toBe(true)
  })

  it('should return error if artist profile already claimed', async () => {
    const userId = 'user_test123'
    const artistId = 1
    vi.mocked(auth).mockResolvedValue({ userId } as any)

    const mockClient = {
      users: {
        getUser: vi.fn().mockResolvedValue({
          publicMetadata: {
            artistId: artistId.toString(),
          },
        }),
      },
    }
    vi.mocked(clerkClient).mockResolvedValue(mockClient as any)

    // Mock database to return already claimed artist
    const mockSelect = vi.fn().mockReturnThis()
    const mockFrom = vi.fn().mockReturnThis()
    const mockWhere = vi.fn().mockReturnThis()
    const mockLimit = vi.fn().mockResolvedValue([
      {
        id: artistId,
        name: 'Existing Artist',
        claimed: true,
      },
    ])
    vi.mocked(db.select).mockReturnValue({
      from: mockFrom,
    } as any)
    mockFrom.mockReturnValue({
      where: mockWhere,
    } as any)
    mockWhere.mockReturnValue({
      limit: mockLimit,
    } as any)

    const formData = new FormData()
    formData.append('name', 'Test Artist')
    formData.append('location', 'Little Rock, AR')
    formData.append('genre', 'EDM')
    formData.append('bio', 'This is a valid bio with more than 10 characters')

    const result = await artistOnboardingAction(null, formData)

    expect((result as any).errors).toBeDefined()
    expect((result as any).errors[0]).toContain('already been claimed')
  })
})
