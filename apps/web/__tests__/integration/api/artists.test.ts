import { GET as GETArtists } from "@/app/api/artists/route";
import { GET as GETArtist } from "@/app/api/artists/[slug]/route";
import { GET as GETArtistArticles } from "@/app/api/artists/[slug]/articles/route";
import { GET as GETArtistEvents } from "@/app/api/artists/[slug]/events/route";
import { GET as GETArtistMe } from "@/app/api/artists/me/route";
import { auth } from "@clerk/nextjs/server";

// Mock database with proper chain
const { mockDbChain, mockWhereResult } = vi.hoisted(() => {
  const mockLimit = vi.fn();
  const mockOrderBy = vi.fn();

  const mockWhereResult = {
    limit: mockLimit,
    orderBy: mockOrderBy,
  };

  const mockDbChain = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    leftJoin: vi.fn(),
    limit: mockLimit,
    orderBy: mockOrderBy,
    select: vi.fn(),
    where: vi.fn(),
  };

  // Set up the chain: select().from().where() - where() can return results directly or chain to limit/orderBy

  mockDbChain.select.mockReturnValue({ from: mockDbChain.from });
  mockDbChain.from.mockReturnValue({
    innerJoin: mockDbChain.innerJoin,
    leftJoin: mockDbChain.leftJoin,
    where: mockDbChain.where,
  });
  mockDbChain.innerJoin.mockReturnValue({ where: mockDbChain.where });
  mockDbChain.leftJoin.mockReturnValue({ where: mockDbChain.where });
  // where() can return results directly (for artists route) or chain to limit/orderBy

  // Default: return promise (for artists list route) - will be overridden per test

  mockDbChain.where.mockResolvedValue([]);
  // orderBy can return results directly
  mockOrderBy.mockResolvedValue([]);

  return { mockDbChain, mockWhereResult };
});

vi.mock<typeof import("@/lib/db")>(import("@/lib/db"), () => ({
  db: mockDbChain,
}));

vi.mock<typeof import("@clerk/nextjs/server")>(import("@clerk/nextjs/server"), () => ({
  auth: vi.fn(),
}));

vi.mock<typeof import("next/cache")>(import("next/cache"), () => ({
  cacheTag: vi.fn(),
}));

vi.mock<typeof import("@/lib/logger/middleware")>(import("@/lib/logger/middleware"), () => ({
  getRequestLogger: vi.fn(() => ({
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  })),
}));

describe("gET /api/artists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbChain.select.mockReturnValue({ from: mockDbChain.from });
    mockDbChain.from.mockReturnValue({ where: mockDbChain.where });
    // For artists list route, where() returns results directly (no limit/orderBy)

    mockDbChain.where.mockResolvedValue([]);
  });

  it("should return all artists", async () => {
    const mockArtists = [
      {
        article_count: 5,
        bio: "Test bio",
        claimed: false,
        created_at: new Date(),
        event_count: 3,
        genre: "EDM",
        id: 1,
        image: null,
        instagram: null,
        location: "Test Location",
        name: "Test Artist",
        profile_views: 0,
        slug: "test-artist",
        spotify_artist_id: null,
        spotify_url: null,
        tiktok: null,
        twitter: null,
        website: null,
      },
    ];

    // For artists list route, where() returns a promise directly (no limit/orderBy)

    mockDbChain.where.mockResolvedValue(mockArtists);

    const request = new Request("http://localhost:3001/api/artists");
    const response = await GETArtists(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBeTruthy();
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Test Artist");
    expect(data[0].article_count).toBe(5);
    expect(data[0].event_count).toBe(3);
  });

  it("should filter by genre", async () => {
    const mockArtists = [
      {
        article_count: 0,
        bio: "Test bio",
        claimed: false,
        created_at: new Date(),
        event_count: 0,
        genre: "EDM",
        id: 1,
        image: null,
        instagram: null,
        location: "Test Location",
        name: "EDM Artist",
        profile_views: 0,
        slug: "edm-artist",
        spotify_artist_id: null,
        spotify_url: null,
        tiktok: null,
        twitter: null,
        website: null,
      },
    ];

    // For artists list route with filter, where() returns a promise directly

    mockDbChain.where.mockResolvedValue(mockArtists);

    const request = new Request("http://localhost:3001/api/artists?genre=EDM");
    const response = await GETArtists(request);

    expect(response.status).toBe(200);
    expect(mockDbChain.where).toHaveBeenCalledWith();
  });

  it("should handle database errors", async () => {
    // For artists list route, where() returns a promise directly, so reject it

    mockDbChain.where.mockRejectedValue(new Error("Database error"));

    const request = new Request("http://localhost:3001/api/artists");
    const response = await GETArtists(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch artists");
  });
});

describe("gET /api/artists/[slug]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbChain.select.mockReturnValue({ from: mockDbChain.from });
    mockDbChain.from.mockReturnValue({ where: mockDbChain.where });
    mockDbChain.where.mockReturnValue({ limit: mockDbChain.limit });
  });

  it("should return artist by slug", async () => {
    const mockArtist = {
      article_count: 5,
      bio: "Test bio",
      claimed: false,
      created_at: new Date(),
      event_count: 3,
      genre: "EDM",
      id: 1,
      image: null,
      instagram: null,
      location: "Test Location",
      name: "Test Artist",
      profile_views: 0,
      slug: "test-artist",
      spotify_artist_id: null,
      spotify_url: null,
      tiktok: null,
      twitter: null,
      website: null,
    };

    mockDbChain.limit.mockResolvedValue([mockArtist]);

    const request = new Request("http://localhost:3001/api/artists/test-artist");
    const response = await GETArtist(request, { params: Promise.resolve({ slug: "test-artist" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe("Test Artist");
    expect(data.slug).toBe("test-artist");
    expect(data.article_count).toBe(5);
    expect(data.event_count).toBe(3);
  });

  it("should return 404 if artist not found", async () => {
    mockDbChain.limit.mockResolvedValue([]);

    const request = new Request("http://localhost:3001/api/artists/non-existent");
    const response = await GETArtist(request, {
      params: Promise.resolve({ slug: "non-existent" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Artist not found");
  });
});

describe("gET /api/artists/[slug]/articles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbChain.select.mockReturnValue({ from: mockDbChain.from });
    mockDbChain.from.mockReturnValue({
      innerJoin: mockDbChain.innerJoin,
      leftJoin: mockDbChain.leftJoin,
      where: mockDbChain.where,
    });
    mockDbChain.innerJoin.mockReturnValue({ leftJoin: mockDbChain.leftJoin });
    mockDbChain.leftJoin.mockReturnValue({ where: mockDbChain.where });
    // where() returns chainable object with limit() and orderBy() for routes that chain

    // Use the hoisted mockWhereResult

    mockDbChain.where.mockReturnValue(mockWhereResult);
  });

  it("should return artist articles", async () => {
    const mockArtist = {
      id: 1,
      slug: "test-artist",
    };

    const mockArticles = [
      {
        author_email: "writer@example.com",
        author_first_name: "Test",
        author_id: "user1",
        author_last_name: "Writer",
        category: "EDM",
        cover_image: null,
        created_at: new Date(),
        excerpt: "Test excerpt",
        id: 1,
        is_cover_story: false,
        published_at: new Date(),
        slug: "test-article",
        title: "Test Article",
        views: 0,
      },
    ];

    mockDbChain.select.mockReturnValue({ from: mockDbChain.from });

    // First query: artist lookup - select().from().where().limit()

    // where() returns chainable, limit() returns results

    mockDbChain.limit.mockResolvedValueOnce([mockArtist]);

    // Second query: articles - select().from().innerJoin().leftJoin().where().orderBy()

    // where() returns chainable, orderBy() returns results

    mockDbChain.orderBy.mockResolvedValueOnce(mockArticles);

    const request = new Request("http://localhost:3001/api/artists/test-artist/articles");
    const response = await GETArtistArticles(request, {
      params: Promise.resolve({ slug: "test-artist" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBeTruthy();
    expect(data).toHaveLength(1);
    expect(data[0].title).toBe("Test Article");
    expect(data[0].author.id).toBe("user1");
    expect(data[0].author.name).toBe("Test Writer");
  });

  it("should return 404 if artist not found", async () => {
    mockDbChain.limit.mockResolvedValue([]);

    const request = new Request("http://localhost:3001/api/artists/non-existent/articles");
    const response = await GETArtistArticles(request, {
      params: Promise.resolve({ slug: "non-existent" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Artist not found");
  });
});

describe("gET /api/artists/[slug]/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbChain.select.mockReturnValue({ from: mockDbChain.from });
    mockDbChain.from.mockReturnValue({
      innerJoin: mockDbChain.innerJoin,
      where: mockDbChain.where,
    });
    mockDbChain.innerJoin.mockReturnValue({ where: mockDbChain.where });
    // where() returns chainable object with limit() and orderBy() for routes that chain

    // Use the hoisted mockWhereResult

    mockDbChain.where.mockReturnValue(mockWhereResult);
  });

  it("should return artist events", async () => {
    const mockArtist = {
      id: 1,
      slug: "test-artist",
    };

    const mockEvents = [
      {
        created_at: new Date(),
        date: "2024-01-01",
        description: "Test description",
        genre: "EDM",
        id: 1,
        image: null,
        location: "Test Location",
        price: null,
        slug: "test-event",
        ticket_link: null,
        time: "20:00",
        title: "Test Event",
        venue: "Test Venue",
      },
    ];

    mockDbChain.select.mockReturnValue({ from: mockDbChain.from });

    // First query: artist lookup - select().from().where().limit()

    // where() returns chainable, limit() returns results

    mockDbChain.limit.mockResolvedValueOnce([mockArtist]);

    // Second query: events - select().from().innerJoin().where().orderBy()

    // where() returns chainable, orderBy() returns results

    mockDbChain.orderBy.mockResolvedValueOnce(mockEvents);

    const request = new Request("http://localhost:3001/api/artists/test-artist/events");
    const response = await GETArtistEvents(request, {
      params: Promise.resolve({ slug: "test-artist" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBeTruthy();
    expect(data).toHaveLength(1);
    expect(data[0].title).toBe("Test Event");
  });

  it("should return 404 if artist not found", async () => {
    mockDbChain.limit.mockResolvedValue([]);

    const request = new Request("http://localhost:3001/api/artists/non-existent/events");
    const response = await GETArtistEvents(request, {
      params: Promise.resolve({ slug: "non-existent" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Artist not found");
  });
});

describe("gET /api/artists/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbChain.select.mockReturnValue({ from: mockDbChain.from });
    mockDbChain.from.mockReturnValue({ where: mockDbChain.where });
    mockDbChain.where.mockReturnValue({ limit: mockDbChain.limit });
  });

  it("should return current user artist", async () => {
    const userId = "user_test123";
    vi.mocked(auth).mockResolvedValue({ userId } as any);

    const mockArtist = {
      article_count: 5,
      bio: "Test bio",
      claimed: true,
      created_at: new Date(),
      event_count: 3,
      genre: "EDM",
      id: 1,
      image: null,
      instagram: null,
      location: "Test Location",
      name: "Test Artist",
      profile_views: 0,
      slug: "test-artist",
      spotify_artist_id: null,
      spotify_url: null,
      tiktok: null,
      twitter: null,
      website: null,
    };

    mockDbChain.limit.mockResolvedValue([mockArtist]);

    const request = new Request("http://localhost:3001/api/artists/me");
    const response = await GETArtistMe(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe("Test Artist");
    expect(data.claimed).toBeTruthy();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    const request = new Request("http://localhost:3001/api/artists/me");
    const response = await GETArtistMe(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 if artist not found", async () => {
    const userId = "user_test123";
    vi.mocked(auth).mockResolvedValue({ userId } as any);

    mockDbChain.limit.mockResolvedValue([]);

    const request = new Request("http://localhost:3001/api/artists/me");
    const response = await GETArtistMe(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Artist not found");
  });
});
