import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createEvent, updateEvent, deleteEvent } from '@/app/admin/events/actions'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { canCreate, canEdit, canDelete } from '@/lib/auth/access'

// Mock dependencies
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(() => {}),
}))

vi.mock('@/lib/auth/access', () => ({
  canCreate: vi.fn(),
  canEdit: vi.fn(),
  canDelete: vi.fn(),
}))

vi.mock('@/lib/utils/slug', () => ({
  generateSlug: vi.fn((name: string) => name.toLowerCase().replace(/\s+/g, '-')),
  ensureUniqueSlug: vi.fn(async (slug: string, _id?: number, _table?: string) => slug),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/logger/sanitize', () => ({
  sanitizeError: vi.fn((error) => error),
}))

// Mock database - hoist variables to avoid initialization errors
const { mockInsert, mockUpdate, mockDelete, mockSelect, mockValues, mockReturning, mockSet, mockWhere, mockFrom, mockLimit } = vi.hoisted(() => {
  return {
    mockInsert: vi.fn(),
    mockUpdate: vi.fn(),
    mockDelete: vi.fn(),
    mockSelect: vi.fn(),
    mockValues: vi.fn(),
    mockReturning: vi.fn(),
    mockSet: vi.fn(),
    mockWhere: vi.fn(),
    mockFrom: vi.fn(),
    mockLimit: vi.fn(),
  }
})

vi.mock('@/lib/db', () => ({
  db: {
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    select: mockSelect,
  },
}))

describe('createEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const userId = 'user_test123'
    vi.mocked(auth).mockResolvedValue({ userId } as any)
    vi.mocked(canCreate).mockResolvedValue(true)

    // Set up insert chain
    mockValues.mockReturnValue({ returning: mockReturning })
    mockReturning.mockResolvedValue([{ id: 1, slug: 'test-event' }])
    mockInsert.mockReturnValue({ values: mockValues })
  })

  it('should create event with artist relations', async () => {
    const formData = new FormData()
    formData.append('title', 'Test Event')
    formData.append('slug', 'test-event')
    formData.append('description', 'Test description')
    formData.append('venue', 'Test Venue')
    formData.append('location', 'Test Location')
    formData.append('date', '2024-01-01')
    formData.append('genre', 'EDM')
    formData.append('status', 'published')
    formData.append('artistIds', '1,2') // Comma-separated string

    // Mock event insert - rely on call order instead of table identity (table is an object)
    // Chain: insert() -> { values } -> values() -> { returning } -> returning() -> Promise
    let insertCallCount = 0
    mockInsert.mockImplementation(() => {
      insertCallCount++
      if (insertCallCount === 1) {
        const mockEventReturning = vi.fn().mockResolvedValue([{ id: 1, slug: 'test-event' }])
        return {
          values: vi.fn().mockReturnValue({
            returning: mockEventReturning,
          }),
        }
      }
      // Subsequent calls (eventArtists) don't use returning()
      return { values: vi.fn().mockResolvedValue(undefined) }
    })

    await createEvent(formData)

    expect(mockInsert).toHaveBeenCalled()
    // Should insert eventArtists relations
    expect(mockInsert).toHaveBeenCalledTimes(2) // Once for event, once for eventArtists
  })

  it('should create event without artist relations', async () => {
    const formData = new FormData()
    formData.append('title', 'Test Event')
    formData.append('slug', 'test-event')
    formData.append('description', 'Test description')
    formData.append('venue', 'Test Venue')
    formData.append('location', 'Test Location')
    formData.append('date', '2024-01-01')
    formData.append('genre', 'EDM')
    formData.append('status', 'published')

    // Mock event insert - need to return the chain properly
    const mockReturning = vi.fn().mockResolvedValue([{ id: 1, slug: 'test-event' }])
    const mockValuesForEvent = vi.fn().mockReturnValue({ returning: mockReturning })
    const mockEventInsert = vi.fn().mockReturnValue({ values: mockValuesForEvent })
    mockInsert.mockReturnValue(mockEventInsert())

    await createEvent(formData)

    expect(mockInsert).toHaveBeenCalled()
    // Should only insert event, not eventArtists
  })

  it('should redirect if not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any)

    const formData = new FormData()
    formData.append('title', 'Test Event')
    formData.append('slug', 'test-event')
    formData.append('description', 'Test description')
    formData.append('venue', 'Test Venue')
    formData.append('location', 'Test Location')
    formData.append('date', '2024-01-01')
    formData.append('genre', 'EDM')
    formData.append('status', 'published')

    await createEvent(formData)

    expect(redirect).toHaveBeenCalledWith('/sign-in')
  })

  it('should throw error if not authorized', async () => {
    vi.mocked(canCreate).mockResolvedValue(false)

    const formData = new FormData()
    formData.append('title', 'Test Event')
    formData.append('slug', 'test-event')
    formData.append('description', 'Test description')
    formData.append('venue', 'Test Venue')
    formData.append('location', 'Test Location')
    formData.append('date', '2024-01-01')
    formData.append('genre', 'EDM')
    formData.append('status', 'published')

    await expect(createEvent(formData)).rejects.toThrow('Unauthorized')
  })
})

describe('updateEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const userId = 'user_test123'
    vi.mocked(auth).mockResolvedValue({ userId } as any)

    // Mock select chain for getting event
    mockLimit.mockResolvedValue([
      {
        id: 1,
        title: 'Existing Event',
        createdById: userId,
      },
    ])
    mockFrom.mockReturnValue({ where: mockWhere })
    mockWhere.mockReturnValue({ limit: mockLimit })
    mockSelect.mockReturnValue({ from: mockFrom })

    vi.mocked(canEdit).mockResolvedValue(true)

    // Mock update chain
    mockSet.mockReturnValue({ where: vi.fn() })
    mockUpdate.mockReturnValue({ set: mockSet })
  })

  it('should update event and replace artist relations', async () => {
    const formData = new FormData()
    formData.append('title', 'Updated Event')
    formData.append('slug', 'updated-event')
    formData.append('description', 'Updated description')
    formData.append('venue', 'Updated Venue')
    formData.append('location', 'Updated Location')
    formData.append('date', '2024-01-02')
    formData.append('genre', 'EDM')
    formData.append('status', 'published')
    formData.append('artistIds', '2,3') // Comma-separated string

    // Mock delete for eventArtists
    const mockDeleteWhere = vi.fn()
    mockDelete.mockReturnValue({ where: mockDeleteWhere })
    mockDeleteWhere.mockResolvedValue(undefined)

    // Mock insert for new eventArtists
    const mockEventArtistsInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    })
    mockInsert.mockReturnValue(mockEventArtistsInsert())

    await updateEvent(1, formData)

    expect(mockUpdate).toHaveBeenCalled()
    expect(mockDelete).toHaveBeenCalled() // Should delete old eventArtists
    expect(mockInsert).toHaveBeenCalled() // Should insert new eventArtists
  })

  it('should remove all artists if empty artistIds', async () => {
    const formData = new FormData()
    formData.append('title', 'Updated Event')
    formData.append('slug', 'updated-event')
    formData.append('description', 'Updated description')
    formData.append('venue', 'Updated Venue')
    formData.append('location', 'Updated Location')
    formData.append('date', '2024-01-02')
    formData.append('genre', 'EDM')
    formData.append('status', 'published')
    // Don't append artistIds

    const mockDeleteWhere = vi.fn()
    mockDelete.mockReturnValue({ where: mockDeleteWhere })
    mockDeleteWhere.mockResolvedValue(undefined)

    await updateEvent(1, formData)

    expect(mockDelete).toHaveBeenCalled() // Should delete old eventArtists
    expect(mockInsert).not.toHaveBeenCalled() // Should not insert new eventArtists
  })

  it('should throw error if event not found', async () => {
    mockLimit.mockResolvedValue([])

    const formData = new FormData()
    formData.append('title', 'Updated Event')
    formData.append('slug', 'updated-event')
    formData.append('description', 'Updated description')
    formData.append('venue', 'Updated Venue')
    formData.append('location', 'Updated Location')
    formData.append('date', '2024-01-02')
    formData.append('genre', 'EDM')
    formData.append('status', 'published')

    await expect(updateEvent(1, formData)).rejects.toThrow('Event not found')
  })

  it('should throw error if not authorized', async () => {
    vi.mocked(canEdit).mockResolvedValue(false)

    const formData = new FormData()
    formData.append('title', 'Updated Event')
    formData.append('slug', 'updated-event')
    formData.append('description', 'Updated description')
    formData.append('venue', 'Updated Venue')
    formData.append('location', 'Updated Location')
    formData.append('date', '2024-01-02')
    formData.append('genre', 'EDM')
    formData.append('status', 'published')

    await expect(updateEvent(1, formData)).rejects.toThrow('Unauthorized')
  })
})

describe('deleteEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const userId = 'user_test123'
    vi.mocked(auth).mockResolvedValue({ userId } as any)
    vi.mocked(canDelete).mockResolvedValue(true)

    const mockDeleteWhere = vi.fn()
    mockDelete.mockReturnValue({ where: mockDeleteWhere })
    mockDeleteWhere.mockResolvedValue(undefined)
  })

  it('should delete event', async () => {
    await deleteEvent(1)

    expect(mockDelete).toHaveBeenCalled()
  })

  it('should redirect if not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any)

    await deleteEvent(1)

    expect(redirect).toHaveBeenCalledWith('/sign-in')
  })

  it('should throw error if not authorized', async () => {
    vi.mocked(canDelete).mockResolvedValue(false)

    await expect(deleteEvent(1)).rejects.toThrow('Unauthorized')
  })
})
