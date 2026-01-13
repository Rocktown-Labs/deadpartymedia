import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ensureUniqueSlug } from '@/lib/utils/slug'

// Mock database - create a shared mock object that can be reset per test
const mockDbChain = {
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
}

// Set up the chain
mockDbChain.select.mockReturnValue({ from: mockDbChain.from })
mockDbChain.from.mockReturnValue({ where: mockDbChain.where })
mockDbChain.where.mockReturnValue({ limit: mockDbChain.limit })

vi.mock('@/lib/db', () => ({
  db: mockDbChain,
}))

// Mock schema to prevent relations from being called
vi.mock('@/lib/db/schema', () => ({
  posts: { slug: 'slug', id: 'id' },
  events: { slug: 'slug', id: 'id' },
  artists: { slug: 'slug', id: 'id' },
}))

vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>()
  return {
    ...actual,
    eq: vi.fn((field, value) => ({ field, value })),
    and: vi.fn((...conditions) => conditions),
    ne: vi.fn((field, value) => ({ field, value, operator: 'ne' })),
    relations: vi.fn((table, callback) => callback({ many: vi.fn(), one: vi.fn() })),
  }
})

describe('ensureUniqueSlug', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the chain
    mockDbChain.select.mockReturnValue({ from: mockDbChain.from })
    mockDbChain.from.mockReturnValue({ where: mockDbChain.where })
    mockDbChain.where.mockReturnValue({ limit: mockDbChain.limit })
  })

  it('should return original slug if unique', async () => {
    // Set up the mock chain to return empty array (unique slug)
    mockDbChain.limit.mockResolvedValue([])

    const slug = await ensureUniqueSlug('test-artist', undefined, 'artists')
    expect(slug).toBe('test-artist')
    expect(mockDbChain.select).toHaveBeenCalled()
    expect(mockDbChain.from).toHaveBeenCalled()
    expect(mockDbChain.where).toHaveBeenCalled()
    expect(mockDbChain.limit).toHaveBeenCalled()
  })

  it('should append counter if slug exists', async () => {
    let callCount = 0
    mockDbChain.limit.mockImplementation(() => {
      callCount++
      return Promise.resolve(callCount === 1 ? [{ id: 1 }] : []) as any
    })

    const slug = await ensureUniqueSlug('test-artist', undefined, 'artists')
    expect(slug).toBe('test-artist-1')
  })

  it('should increment counter until unique slug found', async () => {
    let callCount = 0
    mockDbChain.limit.mockImplementation(() => {
      callCount++
      return Promise.resolve(callCount <= 2 ? [{ id: callCount }] : []) as any
    })

    const slug = await ensureUniqueSlug('test-artist', undefined, 'artists')
    expect(slug).toBe('test-artist-2')
  })
})
