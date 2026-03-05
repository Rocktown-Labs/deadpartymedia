import { GET } from "@/app/api/posts/route";

vi.mock<typeof import("next/cache")>(import("next/cache"), () => ({
  cacheTag: vi.fn(),
}));

// Mock database with proper chain - use vi.hoisted to properly hoist the variable
const { mockDbChain, mockArtistRelationsChain, mockCommentCountsChain } = vi.hoisted(() => {
  const mockDbChain = {
    from: vi.fn(),
    leftJoin: vi.fn(),
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

  const mockCommentCountsChain = {
    from: vi.fn(),
    groupBy: vi.fn(),
    select: vi.fn(),
    where: vi.fn(),
  };

  // Set up the chain: select().from().where().orderBy().limit().offset()

  mockDbChain.select.mockReturnValue({ from: mockDbChain.from });
  mockDbChain.from.mockReturnValue({ leftJoin: mockDbChain.leftJoin });
  mockDbChain.leftJoin.mockReturnValue({ where: mockDbChain.where });
  mockDbChain.where.mockReturnValue({ orderBy: mockDbChain.orderBy });
  mockDbChain.orderBy.mockReturnValue({ limit: mockDbChain.limit });
  mockDbChain.limit.mockReturnValue({ offset: mockDbChain.offset });

  // Set up artist relations chain: select().from().innerJoin().where()

  mockArtistRelationsChain.select.mockReturnValue({ from: mockArtistRelationsChain.from });
  mockArtistRelationsChain.from.mockReturnValue({ innerJoin: mockArtistRelationsChain.innerJoin });
  mockArtistRelationsChain.innerJoin.mockReturnValue({ where: mockArtistRelationsChain.where });
  // Default to empty artist relations
  mockArtistRelationsChain.where.mockResolvedValue([]);

  // Set up comment counts chain: select().from().where().groupBy()

  mockCommentCountsChain.select.mockReturnValue({ from: mockCommentCountsChain.from });
  mockCommentCountsChain.from.mockReturnValue({ where: mockCommentCountsChain.where });
  mockCommentCountsChain.where.mockReturnValue({ groupBy: mockCommentCountsChain.groupBy });
  // Default to no comments
  mockCommentCountsChain.groupBy.mockResolvedValue([]);

  return { mockArtistRelationsChain, mockCommentCountsChain, mockDbChain };
});

// Track which select call we're on
let selectCallIndex = 0;

vi.mock<typeof import("@/lib/db")>(import("@/lib/db"), () => ({
  db: {
    ...mockDbChain,
    // Override select to handle both posts query and artist relations query

    // and comment-count query

    select: vi.fn((_fields) => {
      selectCallIndex++;
      // First call is posts query, second is artist relations, third is comment counts

      if (selectCallIndex === 1) {
        return mockDbChain.select();
      } else if (selectCallIndex === 2) {
        return mockArtistRelationsChain.select();
      }
      return mockCommentCountsChain.select();
    }),
  },
}));

describe("gET /api/posts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectCallIndex = 0;

    // Reset the chain

    mockDbChain.select.mockReturnValue({ from: mockDbChain.from });
    mockDbChain.from.mockReturnValue({ leftJoin: mockDbChain.leftJoin });
    mockDbChain.leftJoin.mockReturnValue({ where: mockDbChain.where });
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

    // Reset comment counts chain

    mockCommentCountsChain.select.mockReturnValue({ from: mockCommentCountsChain.from });
    mockCommentCountsChain.from.mockReturnValue({ where: mockCommentCountsChain.where });
    mockCommentCountsChain.where.mockReturnValue({ groupBy: mockCommentCountsChain.groupBy });
    // Default to no comments
    mockCommentCountsChain.groupBy.mockResolvedValue([]);
  });

  it("should return published posts", async () => {
    const mockPosts = [
      {
        authorEmail: "test@example.com",
        authorFirstName: "Test",
        authorId: "user1",
        authorLastName: "Writer",
        category: "EDM",
        coverImage: null,
        createdAt: new Date(),
        excerpt: "Test excerpt",
        id: 1,
        isCoverStory: false,
        publishedAt: new Date(),
        slug: "test-post",
        status: "published",
        title: "Test Post",
        updatedAt: new Date(),
        views: 0,
      },
    ];

    // Set up the chain to return data

    mockDbChain.offset.mockResolvedValue(mockPosts);
    // Artist relations query will return empty array (default mock)

    const request = new Request("http://localhost:3001/api/posts");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toHaveLength(1);
    expect(data.results[0].title).toBe("Test Post");
    // Should include empty artists array
    expect(data.results[0].artists).toStrictEqual([]);
    expect(data.results[0].comment_count).toBe(0);
    expect(data.results[0].author.id).toBe("user1");
    expectTypeOf(data.results[0].author.id).toBeString();
    expect(data.results[0].author.name).toBe("Test Writer");
    expect(data.results[0].author.name.length).toBeGreaterThan(0);
  });

  it("should filter by category", async () => {
    const mockPosts = [
      {
        authorId: "user1",
        category: "EDM",
        coverImage: null,
        createdAt: new Date(),
        excerpt: "Test",
        id: 1,
        isCoverStory: false,
        publishedAt: new Date(),
        slug: "edm-post",
        status: "published",
        title: "EDM Post",
        updatedAt: new Date(),
        views: 0,
      },
    ];

    mockDbChain.offset.mockResolvedValue(mockPosts);

    const request = new Request("http://localhost:3001/api/posts?category=EDM");
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockDbChain.where).toHaveBeenCalledTimes(1);
  });

  it("should handle pagination with limit and offset", async () => {
    const mockPosts: any[] = [];

    mockDbChain.offset.mockResolvedValue(mockPosts);

    const request = new Request("http://localhost:3001/api/posts?limit=5&offset=10");
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockDbChain.limit).toHaveBeenCalledTimes(1);
    expect(mockDbChain.offset).toHaveBeenCalledTimes(1);
  });

  it("should filter cover stories", async () => {
    const mockPosts = [
      {
        authorId: "user1",
        category: "EDM",
        coverImage: null,
        createdAt: new Date(),
        excerpt: "Test",
        id: 1,
        isCoverStory: true,
        publishedAt: new Date(),
        slug: "cover-story",
        status: "published",
        title: "Cover Story",
        updatedAt: new Date(),
        views: 0,
      },
    ];

    mockDbChain.offset.mockResolvedValue(mockPosts);

    const request = new Request("http://localhost:3001/api/posts?cover_story=true");
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockDbChain.where).toHaveBeenCalledTimes(1);
  });

  it("should handle database errors", async () => {
    mockDbChain.offset.mockRejectedValue(new Error("Database error"));

    const request = new Request("http://localhost:3001/api/posts");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch posts");
  });

  it("should include artist data when posts have artists", async () => {
    const mockPosts = [
      {
        authorId: "user1",
        category: "EDM",
        coverImage: null,
        createdAt: new Date(),
        excerpt: "Test excerpt",
        id: 1,
        isCoverStory: false,
        publishedAt: new Date(),
        slug: "test-post",
        status: "published",
        title: "Test Post",
        updatedAt: new Date(),
        views: 0,
      },
    ];

    const mockArtistRelations = [
      {
        artistId: 1,
        artistImage: "https://example.com/image.jpg",
        artistName: "Test Artist",
        artistSlug: "test-artist",
        postId: 1,
      },
    ];

    mockDbChain.offset.mockResolvedValue(mockPosts);
    mockArtistRelationsChain.where.mockResolvedValue(mockArtistRelations);

    const request = new Request("http://localhost:3001/api/posts");
    const response = await GET(request);
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

  it("should include comment count data when posts have comments", async () => {
    const mockPosts = [
      {
        authorId: "user1",
        category: "EDM",
        coverImage: null,
        createdAt: new Date(),
        excerpt: "Test excerpt",
        id: 1,
        isCoverStory: false,
        publishedAt: new Date(),
        slug: "test-post",
        status: "published",
        title: "Test Post",
        updatedAt: new Date(),
        views: 0,
      },
    ];

    mockDbChain.offset.mockResolvedValue(mockPosts);
    mockCommentCountsChain.groupBy.mockResolvedValue([
      {
        count: 3,
        postId: 1,
      },
    ]);

    const request = new Request("http://localhost:3001/api/posts");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results[0].comment_count).toBe(3);
  });
});
