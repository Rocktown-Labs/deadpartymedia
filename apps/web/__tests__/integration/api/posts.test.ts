import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/posts/route'
import { db } from '@/lib/db'
import { posts } from '@/lib/db/schema'

// Mock database
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
  },
}))

describe('GET /api/posts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

    // Mock the query chain
    const mockOffset = vi.fn().mockResolvedValue(mockPosts)
    const mockLimit = vi.fn().mockReturnValue({ offset: mockOffset })
    const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit })
    const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy })
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
    const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

    vi.mocked(db.select).mockReturnValue(mockSelect as any)

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

    const mockOffset = vi.fn().mockResolvedValue(mockPosts)
    const mockLimit = vi.fn().mockReturnValue({ offset: mockOffset })
    const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit })
    const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy })
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
    const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

    vi.mocked(db.select).mockReturnValue(mockSelect as any)

    const request = new Request('http://localhost:3001/api/posts?category=EDM')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(mockWhere).toHaveBeenCalled()
  })

  it('should handle pagination with limit and offset', async () => {
    const mockPosts: any[] = []

    const mockOffset = vi.fn().mockResolvedValue(mockPosts)
    const mockLimit = vi.fn().mockReturnValue({ offset: mockOffset })
    const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit })
    const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy })
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
    const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

    vi.mocked(db.select).mockReturnValue(mockSelect as any)

    const request = new Request('http://localhost:3001/api/posts?limit=5&offset=10')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(mockLimit).toHaveBeenCalled()
    expect(mockOffset).toHaveBeenCalled()
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

    const mockOffset = vi.fn().mockResolvedValue(mockPosts)
    const mockLimit = vi.fn().mockReturnValue({ offset: mockOffset })
    const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit })
    const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy })
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
    const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

    vi.mocked(db.select).mockReturnValue(mockSelect as any)

    const request = new Request('http://localhost:3001/api/posts?cover_story=true')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(mockWhere).toHaveBeenCalled()
  })

  it('should handle database errors', async () => {
    const mockOffset = vi.fn().mockRejectedValue(new Error('Database error'))
    const mockLimit = vi.fn().mockReturnValue({ offset: mockOffset })
    const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit })
    const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy })
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
    const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

    vi.mocked(db.select).mockReturnValue(mockSelect as any)

    const request = new Request('http://localhost:3001/api/posts')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch posts')
  })
})
