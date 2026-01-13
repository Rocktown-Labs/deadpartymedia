import { vi } from 'vitest'
import type { artists, posts, events } from '@/lib/db/schema'

export const createMockDb = () => {
  const mockSelect = vi.fn().mockReturnThis()
  const mockFrom = vi.fn().mockReturnThis()
  const mockWhere = vi.fn().mockReturnThis()
  const mockInsert = vi.fn().mockReturnThis()
  const mockUpdate = vi.fn().mockReturnThis()
  const mockDelete = vi.fn().mockReturnThis()
  const mockValues = vi.fn().mockReturnThis()
  const mockSet = vi.fn().mockReturnThis()
  const mockReturning = vi.fn().mockReturnThis()
  const mockLimit = vi.fn().mockReturnThis()
  const mockOrderBy = vi.fn().mockReturnThis()
  const mockOffset = vi.fn().mockReturnThis()

  return {
    select: mockSelect,
    from: mockFrom,
    where: mockWhere,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    values: mockValues,
    set: mockSet,
    returning: mockReturning,
    limit: mockLimit,
    orderBy: mockOrderBy,
    offset: mockOffset,
  }
}

export const createMockArtist = (overrides?: Partial<typeof artists.$inferSelect>) => ({
  id: 1,
  slug: 'test-artist',
  name: 'Test Artist',
  bio: 'Test bio',
  location: 'Test Location',
  genre: 'EDM' as const,
  claimed: false,
  claimedById: null,
  profileViews: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

export const createMockPost = (overrides?: Partial<typeof posts.$inferSelect>) => ({
  id: 1,
  title: 'Test Post',
  slug: 'test-post',
  category: 'EDM' as const,
  excerpt: 'Test excerpt',
  content: '{}',
  authorId: 'user_test123',
  status: 'published' as const,
  isCoverStory: false,
  publishedAt: new Date(),
  views: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

export const createMockEvent = (overrides?: Partial<typeof events.$inferSelect>) => ({
  id: 1,
  title: 'Test Event',
  slug: 'test-event',
  description: 'Test description',
  venue: 'Test Venue',
  location: 'Test Location',
  date: new Date().toISOString().split('T')[0],
  time: '20:00',
  genre: 'EDM' as const,
  status: 'published' as const,
  createdById: 'user_test123',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})
