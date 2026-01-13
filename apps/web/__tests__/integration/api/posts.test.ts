import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/posts/route'

// Mock database with proper chain - use vi.hoisted to properly hoist the variable
const { mockDbChain, mockArtistRelationsChain } = vi.hoisted(() => {
  const mockDbChain = {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
  }

  const mockArtistRelationsChain = {
    select: vi.fn(),
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
  }

  // Set up the chain: select().from().where().orderBy().limit().offset()
  mockDbChain.select.mockReturnValue({ from: mockDbChain.from })
  mockDbChain.from.mockReturnValue({ where: mockDbChain.where })
  mockDbChain.where.mockReturnValue({ orderBy: mockDbChain.orderBy })
  mockDbChain.orderBy.mockReturnValue({ limit: mockDbChain.limit })
  mockDbChain.limit.mockReturnValue({ offset: mockDbChain.offset })

  // Set up artist relations chain: select().from().innerJoin().where()
  mockArtistRelationsChain.select.mockReturnValue({ from: mockArtistRelationsChain.from })
  mockArtistRelationsChain.from.mockReturnValue({ innerJoin: mockArtistRelationsChain.innerJoin })
  mockArtistRelationsChain.innerJoin.mockReturnValue({ where: mockArtistRelationsChain.where })
  mockArtistRelationsChain.where.mockResolvedValue([]) // Default to empty artist relations

  return { mockDbChain, mockArtistRelationsChain }
})

// Track which select call we're on
let selectCallIndex = 0

vi.mock('@/lib/db', () => ({
  db: {
    ...mockDbChain,
    // Override select to handle both posts query and artist relations query
    select: vi.fn((_fields) => {
      selectCallIndex++
      // First call is posts query (no args), second call is artist relations (with object)
      if (selectCallIndex === 1) {
        // Posts query - no arguments
        return mockDbChain.select()
      } else {
        // Artist relations query - has fields object
        return mockArtistRelationsChain.select()
      }
    }),
  },
}))

describe('GET /api/posts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallIndex = 0
    
    // Reset the chain
    mockDbChain.select.mockReturnValue({ from: mockDbChain.from })
    mockDbChain.from.mockReturnValue({ where: mockDbChain.where })
    mockDbChain.where.mockReturnValue({ orderBy: mockDbChain.orderBy })
    mockDbChain.orderBy.mockReturnValue({ limit: mockDbChain.limit })
    mockDbChain.limit.mockReturnValue({ offset: mockDbChain.offset })
    
    // Reset artist relations chain
    mockArtistRelationsChain.select.mockReturnValue({ from: mockArtistRelationsChain.from })
    mockArtistRelationsChain.from.mockReturnValue({ innerJoin: mockArtistRelationsChain.innerJoin })
    mockArtistRelationsChain.innerJoin.mockReturnValue({ where: mockArtistRelationsChain.where })
    mockArtistRelationsChain.where.mockResolvedValue([]) // Default to empty artist relations
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
    // Artist relations query will return empty array (default mock)

    const request = new Request('http://localhost:3001/api/posts')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.results).toHaveLength(1)
    expect(data.results[0].title).toBe('Test Post')
    expect(data.results[0].artists).toEqual([]) // Should include empty artists array
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

  it('should include artist data when posts have artists', async () => {
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

    const mockArtistRelations = [
      {
        postId: 1,
        artistId: 1,
        artistSlug: 'test-artist',
        artistName: 'Test Artist',
        artistImage: 'https://example.com/image.jpg',
      },
    ]

    mockDbChain.offset.mockResolvedValue(mockPosts)
    mockArtistRelationsChain.where.mockResolvedValue(mockArtistRelations)

    const request = new Request('http://localhost:3001/api/posts')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.results[0].artists).toHaveLength(1)
    expect(data.results[0].artists[0]).toEqual({
      id: 1,
      slug: 'test-artist',
      name: 'Test Artist',
      image: 'https://example.com/image.jpg',
    })
  })
})
