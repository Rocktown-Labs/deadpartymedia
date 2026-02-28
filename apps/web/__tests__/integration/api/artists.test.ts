import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET as GETArtists } from '@/app/api/artists/route'
import { GET as GETArtist } from '@/app/api/artists/[slug]/route'
import { GET as GETArtistArticles } from '@/app/api/artists/[slug]/articles/route'
import { GET as GETArtistEvents } from '@/app/api/artists/[slug]/events/route'
import { GET as GETArtistMe } from '@/app/api/artists/me/route'
import { auth } from '@clerk/nextjs/server'

// Mock database with proper chain
const { mockDbChain, mockWhereResult } = vi.hoisted(() => {
  const mockLimit = vi.fn()
  const mockOrderBy = vi.fn()
  
  const mockWhereResult = {
    limit: mockLimit,
    orderBy: mockOrderBy,
  }

  const mockDbChain = {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    limit: mockLimit,
    innerJoin: vi.fn(),
    leftJoin: vi.fn(),
    orderBy: mockOrderBy,
  }

  // Set up the chain: select().from().where() - where() can return results directly or chain to limit/orderBy
  mockDbChain.select.mockReturnValue({ from: mockDbChain.from })
  mockDbChain.from.mockReturnValue({ 
    where: mockDbChain.where,
    innerJoin: mockDbChain.innerJoin,
    leftJoin: mockDbChain.leftJoin,
  })
  mockDbChain.innerJoin.mockReturnValue({ where: mockDbChain.where })
  mockDbChain.leftJoin.mockReturnValue({ where: mockDbChain.where })
  // where() can return results directly (for artists route) or chain to limit/orderBy
  // Default: return promise (for artists list route) - will be overridden per test
  mockDbChain.where.mockResolvedValue([])
  mockOrderBy.mockResolvedValue([]) // orderBy can return results directly

  return { mockDbChain, mockWhereResult }
})

vi.mock('@/lib/db', () => ({
  db: mockDbChain,
}))

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

vi.mock('next/cache', () => ({
  cacheTag: vi.fn(),
}))

vi.mock('@/lib/logger/middleware', () => ({
  getRequestLogger: vi.fn(() => ({
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  })),
}))

describe('GET /api/artists', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDbChain.select.mockReturnValue({ from: mockDbChain.from })
    mockDbChain.from.mockReturnValue({ where: mockDbChain.where })
    // For artists list route, where() returns results directly (no limit/orderBy)
    mockDbChain.where.mockResolvedValue([])
  })

  it('should return all artists', async () => {
    const mockArtists = [
      {
        id: 1,
        slug: 'test-artist',
        name: 'Test Artist',
        bio: 'Test bio',
        image: null,
        location: 'Test Location',
        genre: 'EDM',
        spotify_url: null,
        spotify_artist_id: null,
        instagram: null,
        twitter: null,
        tiktok: null,
        website: null,
        claimed: false,
        profile_views: 0,
        created_at: new Date(),
        article_count: 5,
        event_count: 3,
      },
    ]

    // For artists list route, where() returns a promise directly (no limit/orderBy)
    mockDbChain.where.mockResolvedValue(mockArtists)

    const request = new Request('http://localhost:3001/api/artists')
    const response = await GETArtists(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
    expect(data).toHaveLength(1)
    expect(data[0].name).toBe('Test Artist')
    expect(data[0].article_count).toBe(5)
    expect(data[0].event_count).toBe(3)
  })

  it('should filter by genre', async () => {
    const mockArtists = [
      {
        id: 1,
        slug: 'edm-artist',
        name: 'EDM Artist',
        bio: 'Test bio',
        image: null,
        location: 'Test Location',
        genre: 'EDM',
        spotify_url: null,
        spotify_artist_id: null,
        instagram: null,
        twitter: null,
        tiktok: null,
        website: null,
        claimed: false,
        profile_views: 0,
        created_at: new Date(),
        article_count: 0,
        event_count: 0,
      },
    ]

    // For artists list route with filter, where() returns a promise directly
    mockDbChain.where.mockResolvedValue(mockArtists)

    const request = new Request('http://localhost:3001/api/artists?genre=EDM')
    const response = await GETArtists(request)

    expect(response.status).toBe(200)
    expect(mockDbChain.where).toHaveBeenCalled()
  })

  it('should handle database errors', async () => {
    // For artists list route, where() returns a promise directly, so reject it
    mockDbChain.where.mockRejectedValue(new Error('Database error'))

    const request = new Request('http://localhost:3001/api/artists')
    const response = await GETArtists(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch artists')
  })
})

describe('GET /api/artists/[slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDbChain.select.mockReturnValue({ from: mockDbChain.from })
    mockDbChain.from.mockReturnValue({ where: mockDbChain.where })
    mockDbChain.where.mockReturnValue({ limit: mockDbChain.limit })
  })

  it('should return artist by slug', async () => {
    const mockArtist = {
      id: 1,
      slug: 'test-artist',
      name: 'Test Artist',
      bio: 'Test bio',
      image: null,
      location: 'Test Location',
      genre: 'EDM',
      spotify_url: null,
      spotify_artist_id: null,
      instagram: null,
      twitter: null,
      tiktok: null,
      website: null,
      claimed: false,
      profile_views: 0,
      created_at: new Date(),
      article_count: 5,
      event_count: 3,
    }

    mockDbChain.limit.mockResolvedValue([mockArtist])

    const request = new Request('http://localhost:3001/api/artists/test-artist')
    const response = await GETArtist(request, { params: Promise.resolve({ slug: 'test-artist' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.name).toBe('Test Artist')
    expect(data.slug).toBe('test-artist')
    expect(data.article_count).toBe(5)
    expect(data.event_count).toBe(3)
  })

  it('should return 404 if artist not found', async () => {
    mockDbChain.limit.mockResolvedValue([])

    const request = new Request('http://localhost:3001/api/artists/non-existent')
    const response = await GETArtist(request, { params: Promise.resolve({ slug: 'non-existent' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Artist not found')
  })
})

describe('GET /api/artists/[slug]/articles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDbChain.select.mockReturnValue({ from: mockDbChain.from })
    mockDbChain.from.mockReturnValue({ 
      where: mockDbChain.where,
      innerJoin: mockDbChain.innerJoin,
      leftJoin: mockDbChain.leftJoin,
    })
    mockDbChain.innerJoin.mockReturnValue({ leftJoin: mockDbChain.leftJoin })
    mockDbChain.leftJoin.mockReturnValue({ where: mockDbChain.where })
    // where() returns chainable object with limit() and orderBy() for routes that chain
    // Use the hoisted mockWhereResult
    mockDbChain.where.mockReturnValue(mockWhereResult)
  })

  it('should return artist articles', async () => {
    const mockArtist = {
      id: 1,
      slug: 'test-artist',
    }

    const mockArticles = [
      {
        id: 1,
        title: 'Test Article',
        slug: 'test-article',
        category: 'EDM',
        excerpt: 'Test excerpt',
        cover_image: null,
        author_id: 'user1',
        author_first_name: 'Test',
        author_last_name: 'Writer',
        author_email: 'writer@example.com',
        published_at: new Date(),
        views: 0,
        is_cover_story: false,
        created_at: new Date(),
      },
    ]

    mockDbChain.select.mockImplementation(() => ({ from: mockDbChain.from }))
    
    // First query: artist lookup - select().from().where().limit()
    // where() returns chainable, limit() returns results
    mockDbChain.limit.mockResolvedValueOnce([mockArtist])
    
    // Second query: articles - select().from().innerJoin().leftJoin().where().orderBy()
    // where() returns chainable, orderBy() returns results
    mockDbChain.orderBy.mockResolvedValueOnce(mockArticles)

    const request = new Request('http://localhost:3001/api/artists/test-artist/articles')
    const response = await GETArtistArticles(request, {
      params: Promise.resolve({ slug: 'test-artist' }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
    expect(data).toHaveLength(1)
    expect(data[0].title).toBe('Test Article')
    expect(data[0].author.id).toBe('user1')
    expect(data[0].author.name).toBe('Test Writer')
  })

  it('should return 404 if artist not found', async () => {
    mockDbChain.limit.mockResolvedValue([])

    const request = new Request('http://localhost:3001/api/artists/non-existent/articles')
    const response = await GETArtistArticles(request, {
      params: Promise.resolve({ slug: 'non-existent' }),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Artist not found')
  })
})

describe('GET /api/artists/[slug]/events', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDbChain.select.mockReturnValue({ from: mockDbChain.from })
    mockDbChain.from.mockReturnValue({ 
      where: mockDbChain.where,
      innerJoin: mockDbChain.innerJoin,
    })
    mockDbChain.innerJoin.mockReturnValue({ where: mockDbChain.where })
    // where() returns chainable object with limit() and orderBy() for routes that chain
    // Use the hoisted mockWhereResult
    mockDbChain.where.mockReturnValue(mockWhereResult)
  })

  it('should return artist events', async () => {
    const mockArtist = {
      id: 1,
      slug: 'test-artist',
    }

    const mockEvents = [
      {
        id: 1,
        title: 'Test Event',
        slug: 'test-event',
        description: 'Test description',
        image: null,
        venue: 'Test Venue',
        location: 'Test Location',
        date: '2024-01-01',
        time: '20:00',
        ticket_link: null,
        price: null,
        genre: 'EDM',
        created_at: new Date(),
      },
    ]

    mockDbChain.select.mockImplementation(() => ({ from: mockDbChain.from }))
    
    // First query: artist lookup - select().from().where().limit()
    // where() returns chainable, limit() returns results
    mockDbChain.limit.mockResolvedValueOnce([mockArtist])
    
    // Second query: events - select().from().innerJoin().where().orderBy()
    // where() returns chainable, orderBy() returns results
    mockDbChain.orderBy.mockResolvedValueOnce(mockEvents)

    const request = new Request('http://localhost:3001/api/artists/test-artist/events')
    const response = await GETArtistEvents(request, {
      params: Promise.resolve({ slug: 'test-artist' }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
    expect(data).toHaveLength(1)
    expect(data[0].title).toBe('Test Event')
  })

  it('should return 404 if artist not found', async () => {
    mockDbChain.limit.mockResolvedValue([])

    const request = new Request('http://localhost:3001/api/artists/non-existent/events')
    const response = await GETArtistEvents(request, {
      params: Promise.resolve({ slug: 'non-existent' }),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Artist not found')
  })
})

describe('GET /api/artists/me', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDbChain.select.mockReturnValue({ from: mockDbChain.from })
    mockDbChain.from.mockReturnValue({ where: mockDbChain.where })
    mockDbChain.where.mockReturnValue({ limit: mockDbChain.limit })
  })

  it('should return current user artist', async () => {
    const userId = 'user_test123'
    vi.mocked(auth).mockResolvedValue({ userId } as any)

    const mockArtist = {
      id: 1,
      slug: 'test-artist',
      name: 'Test Artist',
      bio: 'Test bio',
      image: null,
      location: 'Test Location',
      genre: 'EDM',
      spotify_url: null,
      spotify_artist_id: null,
      instagram: null,
      twitter: null,
      tiktok: null,
      website: null,
      claimed: true,
      profile_views: 0,
      created_at: new Date(),
      article_count: 5,
      event_count: 3,
    }

    mockDbChain.limit.mockResolvedValue([mockArtist])

    const request = new Request('http://localhost:3001/api/artists/me')
    const response = await GETArtistMe(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.name).toBe('Test Artist')
    expect(data.claimed).toBe(true)
  })

  it('should return 401 if not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any)

    const request = new Request('http://localhost:3001/api/artists/me')
    const response = await GETArtistMe(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 404 if artist not found', async () => {
    const userId = 'user_test123'
    vi.mocked(auth).mockResolvedValue({ userId } as any)

    mockDbChain.limit.mockResolvedValue([])

    const request = new Request('http://localhost:3001/api/artists/me')
    const response = await GETArtistMe(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Artist not found')
  })
})
