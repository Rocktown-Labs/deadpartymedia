import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ensureUniqueSlug } from '@/lib/utils/slug'

// Mock database before importing
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value })),
  and: vi.fn((...conditions) => conditions),
  ne: vi.fn((field, value) => ({ field, value, operator: 'ne' })),
}))

describe('ensureUniqueSlug', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return original slug if unique', async () => {
    const { db } = await import('@/lib/db')
    
    const mockLimit = vi.fn().mockResolvedValue([])
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit })
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
    const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

    vi.mocked(db.select).mockReturnValue(mockSelect as any)

    const slug = await ensureUniqueSlug('test-artist', undefined, 'artists')
    expect(slug).toBe('test-artist')
  })

  it('should append counter if slug exists', async () => {
    const { db } = await import('@/lib/db')
    
    let callCount = 0
    const mockLimit = vi.fn().mockImplementation(() => {
      callCount++
      return Promise.resolve(callCount === 1 ? [{ id: 1 }] : [])
    })
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit })
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
    const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

    vi.mocked(db.select).mockReturnValue(mockSelect as any)

    const slug = await ensureUniqueSlug('test-artist', undefined, 'artists')
    expect(slug).toBe('test-artist-1')
  })

  it('should increment counter until unique slug found', async () => {
    const { db } = await import('@/lib/db')
    
    let callCount = 0
    const mockLimit = vi.fn().mockImplementation(() => {
      callCount++
      return Promise.resolve(callCount <= 2 ? [{ id: callCount }] : [])
    })
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit })
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
    const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

    vi.mocked(db.select).mockReturnValue(mockSelect as any)

    const slug = await ensureUniqueSlug('test-artist', undefined, 'artists')
    expect(slug).toBe('test-artist-2')
  })
})
