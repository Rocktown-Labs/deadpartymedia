import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/events/route'

// Mock database with proper chain
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
    // Override select to handle both events query and artist relations query
    select: vi.fn((_fields) => {
      selectCallIndex++
      // First call is events query, second call is artist relations (with object)
      if (selectCallIndex === 1) {
        // Events query
        return mockDbChain.select()
      } else {
        // Artist relations query
        return mockArtistRelationsChain.select()
      }
    }),
  },
}))

vi.mock('@/lib/logger/middleware', () => ({
  getRequestLogger: vi.fn(() => ({
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  })),
}))

describe('GET /api/events', () => {
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

  it('should return published events', async () => {
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
        ticketLink: null,
        price: null,
        genre: 'EDM',
        status: 'published',
        createdById: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    mockDbChain.offset.mockResolvedValue(mockEvents)

    const request = new Request('http://localhost:3001/api/events')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.results).toHaveLength(1)
    expect(data.results[0].title).toBe('Test Event')
    expect(data.results[0].artists).toEqual([]) // Should include empty artists array
  })

  it('should filter by genre', async () => {
    const mockEvents = [
      {
        id: 1,
        title: 'EDM Event',
        slug: 'edm-event',
        description: 'Test',
        image: null,
        venue: 'Test Venue',
        location: 'Test Location',
        date: '2024-01-01',
        time: null,
        ticketLink: null,
        price: null,
        genre: 'EDM',
        status: 'published',
        createdById: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    mockDbChain.offset.mockResolvedValue(mockEvents)

    const request = new Request('http://localhost:3001/api/events?genre=EDM')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(mockDbChain.where).toHaveBeenCalled()
  })

  it('should include artist data when events have artists', async () => {
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
        ticketLink: null,
        price: null,
        genre: 'EDM',
        status: 'published',
        createdById: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    const mockArtistRelations = [
      {
        eventId: 1,
        artistId: 1,
        artistSlug: 'test-artist',
        artistName: 'Test Artist',
        artistImage: 'https://example.com/image.jpg',
      },
    ]

    mockDbChain.offset.mockResolvedValue(mockEvents)
    mockArtistRelationsChain.where.mockResolvedValue(mockArtistRelations)

    const request = new Request('http://localhost:3001/api/events')
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

  it('should handle database errors', async () => {
    mockDbChain.offset.mockRejectedValue(new Error('Database error'))

    const request = new Request('http://localhost:3001/api/events')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch events')
  })
})
