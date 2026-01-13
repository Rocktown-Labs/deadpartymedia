import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/posts/route'

// Mock database with proper chain - use vi.hoisted to properly hoist the variable
const { mockDbChain } = vi.hoisted(() => {
  const mockDbChain = {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
  }

  // Set up the chain: select().from().where().orderBy().limit().offset()
  mockDbChain.select.mockReturnValue({ from: mockDbChain.from })
  mockDbChain.from.mockReturnValue({ where: mockDbChain.where })
  mockDbChain.where.mockReturnValue({ orderBy: mockDbChain.orderBy })
  mockDbChain.orderBy.mockReturnValue({ limit: mockDbChain.limit })
  mockDbChain.limit.mockReturnValue({ offset: mockDbChain.offset })

  return { mockDbChain }
})

vi.mock('@/lib/db', () => ({
  db: mockDbChain,
}))

describe('GET /api/posts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the chain
    mockDbChain.select.mockReturnValue({ from: mockDbChain.from })
    mockDbChain.from.mockReturnValue({ where: mockDbChain.where })
    mockDbChain.where.mockReturnValue({ orderBy: mockDbChain.orderBy })
    mockDbChain.orderBy.mockReturnValue({ limit: mockDbChain.limit })
    mockDbChain.limit.mockReturnValue({ offset: mockDbChain.offset })
  })

  it('should return published posts', async () => {
    const mockPosts = [
      {
        id: 1,
        title: 'Test Post',
        slug: 'test-post',
        category: 'EDM',
        excerpt: 'Test excerpt',
        coverImage: null,
        authorId: 'user1',
        status: 'published',
        isCoverStory: false,
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        views: 0,
      },
    ]

    // Set up the chain to return data
    mockDbChain.offset.mockResolvedValue(mockPosts)

    const request = new Request('http://localhost:3001/api/posts')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.results).toHaveLength(1)
    expect(data.results[0].title).toBe('Test Post')
  })

  it('should filter by category', async () => {
    const mockPosts = [
      {
        id: 1,
        title: 'EDM Post',
        slug: 'edm-post',
        category: 'EDM',
        excerpt: 'Test',
        coverImage: null,
        authorId: 'user1',
        status: 'published',
        isCoverStory: false,
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        views: 0,
      },
    ]

    mockDbChain.offset.mockResolvedValue(mockPosts)

    const request = new Request('http://localhost:3001/api/posts?category=EDM')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(mockDbChain.where).toHaveBeenCalled()
  })

  it('should handle pagination with limit and offset', async () => {
    const mockPosts: any[] = []

    mockDbChain.offset.mockResolvedValue(mockPosts)

    const request = new Request('http://localhost:3001/api/posts?limit=5&offset=10')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(mockDbChain.limit).toHaveBeenCalled()
    expect(mockDbChain.offset).toHaveBeenCalled()
  })

  it('should filter cover stories', async () => {
    const mockPosts = [
      {
        id: 1,
        title: 'Cover Story',
        slug: 'cover-story',
        category: 'EDM',
        excerpt: 'Test',
        coverImage: null,
        authorId: 'user1',
        status: 'published',
        isCoverStory: true,
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        views: 0,
      },
    ]

    mockDbChain.offset.mockResolvedValue(mockPosts)

    const request = new Request('http://localhost:3001/api/posts?cover_story=true')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(mockDbChain.where).toHaveBeenCalled()
  })

  it('should handle database errors', async () => {
    mockDbChain.offset.mockRejectedValue(new Error('Database error'))

    const request = new Request('http://localhost:3001/api/posts')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch posts')
  })
})
