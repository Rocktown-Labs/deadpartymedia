import { GET } from "@/app/api/events/route";
import type { NextRequest } from "next/server";

const toNextRequest = (request: Request): NextRequest => request as unknown as NextRequest;

// Mock database with proper chain
const { mockDbChain, mockArtistRelationsChain } = vi.hoisted(() => {
  const mockDbChain = {
    from: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
    orderBy: vi.fn(),
    select: vi.fn(),
    where: vi.fn(),
  };

  const mockArtistRelationsChain = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    select: vi.fn(),
    where: vi.fn(),
  };

  // Set up the chain: select().from().where().orderBy().limit().offset()

  mockDbChain.select.mockReturnValue({ from: mockDbChain.from });
  mockDbChain.from.mockReturnValue({ where: mockDbChain.where });
  mockDbChain.where.mockReturnValue({ orderBy: mockDbChain.orderBy });
  mockDbChain.orderBy.mockReturnValue({ limit: mockDbChain.limit });
  mockDbChain.limit.mockReturnValue({ offset: mockDbChain.offset });

  // Set up artist relations chain: select().from().innerJoin().where()

  mockArtistRelationsChain.select.mockReturnValue({ from: mockArtistRelationsChain.from });
  mockArtistRelationsChain.from.mockReturnValue({ innerJoin: mockArtistRelationsChain.innerJoin });
  mockArtistRelationsChain.innerJoin.mockReturnValue({ where: mockArtistRelationsChain.where });
  // Default to empty artist relations
  mockArtistRelationsChain.where.mockResolvedValue([]);

  return { mockArtistRelationsChain, mockDbChain };
});

// Track which select call we're on
let selectCallIndex = 0;

vi.mock<typeof import("@/lib/db")>(import("@/lib/db"), () => ({
  db: {
    ...mockDbChain,
    // Override select to handle both events query and artist relations query

    select: vi.fn((_fields) => {
      selectCallIndex++;
      // First call is events query, second call is artist relations (with object)

      if (selectCallIndex === 1) {
        // Events query

        return mockDbChain.select();
      }
      // Artist relations query

      return mockArtistRelationsChain.select();
    }),
  },
}));

vi.mock<typeof import("@/lib/logger/middleware")>(import("@/lib/logger/middleware"), () => ({
  getRequestLogger: vi.fn(() => ({
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  })),
}));

vi.mock<typeof import("next/cache")>(import("next/cache"), () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

describe("gET /api/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectCallIndex = 0;

    // Reset the chain

    mockDbChain.select.mockReturnValue({ from: mockDbChain.from });
    mockDbChain.from.mockReturnValue({ where: mockDbChain.where });
    mockDbChain.where.mockReturnValue({ orderBy: mockDbChain.orderBy });
    mockDbChain.orderBy.mockReturnValue({ limit: mockDbChain.limit });
    mockDbChain.limit.mockReturnValue({ offset: mockDbChain.offset });

    // Reset artist relations chain

    mockArtistRelationsChain.select.mockReturnValue({ from: mockArtistRelationsChain.from });
    mockArtistRelationsChain.from.mockReturnValue({
      innerJoin: mockArtistRelationsChain.innerJoin,
    });
    mockArtistRelationsChain.innerJoin.mockReturnValue({ where: mockArtistRelationsChain.where });
    // Default to empty artist relations
    mockArtistRelationsChain.where.mockResolvedValue([]);
  });

  it("should return published events", async () => {
    const mockEvents = [
      {
        createdAt: new Date(),
        createdById: "user1",
        date: "2024-01-01",
        description: "Test description",
        genre: "EDM",
        id: 1,
        image: null,
        location: "Test Location",
        price: null,
        slug: "test-event",
        status: "published",
        ticketLink: null,
        time: "20:00",
        title: "Test Event",
        updatedAt: new Date(),
        venue: "Test Venue",
      },
    ];

    mockDbChain.offset.mockResolvedValue(mockEvents);

    const request = new Request("http://localhost:3001/api/events");
    const response = await GET(toNextRequest(request));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toHaveLength(1);
    expect(data.results[0].title).toBe("Test Event");
    // Should include empty artists array
    expect(data.results[0].artists).toStrictEqual([]);
  });

  it("should filter by genre", async () => {
    const mockEvents = [
      {
        createdAt: new Date(),
        createdById: "user1",
        date: "2024-01-01",
        description: "Test",
        genre: "EDM",
        id: 1,
        image: null,
        location: "Test Location",
        price: null,
        slug: "edm-event",
        status: "published",
        ticketLink: null,
        time: null,
        title: "EDM Event",
        updatedAt: new Date(),
        venue: "Test Venue",
      },
    ];

    mockDbChain.offset.mockResolvedValue(mockEvents);

    const request = new Request("http://localhost:3001/api/events?genre=EDM");
    const response = await GET(toNextRequest(request));

    expect(response.status).toBe(200);
    expect(mockDbChain.where).toHaveBeenCalledTimes(1);
  });

  it("should include artist data when events have artists", async () => {
    const mockEvents = [
      {
        createdAt: new Date(),
        createdById: "user1",
        date: "2024-01-01",
        description: "Test description",
        genre: "EDM",
        id: 1,
        image: null,
        location: "Test Location",
        price: null,
        slug: "test-event",
        status: "published",
        ticketLink: null,
        time: "20:00",
        title: "Test Event",
        updatedAt: new Date(),
        venue: "Test Venue",
      },
    ];

    const mockArtistRelations = [
      {
        artistId: 1,
        artistImage: "https://example.com/image.jpg",
        artistName: "Test Artist",
        artistSlug: "test-artist",
        eventId: 1,
      },
    ];

    mockDbChain.offset.mockResolvedValue(mockEvents);
    mockArtistRelationsChain.where.mockResolvedValue(mockArtistRelations);

    const request = new Request("http://localhost:3001/api/events");
    const response = await GET(toNextRequest(request));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results[0].artists).toHaveLength(1);
    expect(data.results[0].artists[0]).toStrictEqual({
      id: 1,
      image: "https://example.com/image.jpg",
      name: "Test Artist",
      slug: "test-artist",
    });
  });

  it("should handle database errors", async () => {
    mockDbChain.offset.mockRejectedValue(new Error("Database error"));

    const request = new Request("http://localhost:3001/api/events");
    const response = await GET(toNextRequest(request));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch events");
  });
});
