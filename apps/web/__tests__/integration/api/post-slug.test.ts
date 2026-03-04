import { GET } from "@/app/api/posts/[slug]/route";

vi.mock<typeof import("next/cache")>(import("next/cache"), () => ({
  cacheTag: vi.fn(),
}));

vi.mock<typeof import("@/lib/content/post-content")>(import("@/lib/content/post-content"), () => ({
  normalizeStoredPostContent: vi.fn(() => ({ tiptapDoc: null })),
}));

vi.mock<typeof import("@tiptap/html")>(import("@tiptap/html"), () => ({
  generateHTML: vi.fn(() => "<p>converted</p>"),
}));

vi.mock<typeof import("@tiptap/starter-kit")>(import("@tiptap/starter-kit"), () => ({
  default: {},
}));

vi.mock<typeof import("@tiptap/extension-image")>(import("@tiptap/extension-image"), () => ({
  default: {},
}));

const { mockPostChain, mockArtistsChain, mockCommentChain } = vi.hoisted(() => {
  const mockPostChain = {
    from: vi.fn(),
    leftJoin: vi.fn(),
    limit: vi.fn(),
    select: vi.fn(),
    where: vi.fn(),
  };

  const mockArtistsChain = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    select: vi.fn(),
    where: vi.fn(),
  };

  const mockCommentChain = {
    from: vi.fn(),
    select: vi.fn(),
    where: vi.fn(),
  };

  mockPostChain.select.mockReturnValue({ from: mockPostChain.from });
  mockPostChain.from.mockReturnValue({ leftJoin: mockPostChain.leftJoin });
  mockPostChain.leftJoin.mockReturnValue({ where: mockPostChain.where });
  mockPostChain.where.mockReturnValue({ limit: mockPostChain.limit });

  mockArtistsChain.select.mockReturnValue({ from: mockArtistsChain.from });
  mockArtistsChain.from.mockReturnValue({ innerJoin: mockArtistsChain.innerJoin });
  mockArtistsChain.innerJoin.mockReturnValue({ where: mockArtistsChain.where });
  mockArtistsChain.where.mockResolvedValue([]);

  mockCommentChain.select.mockReturnValue({ from: mockCommentChain.from });
  mockCommentChain.from.mockReturnValue({ where: mockCommentChain.where });
  mockCommentChain.where.mockResolvedValue([]);

  return { mockArtistsChain, mockCommentChain, mockPostChain };
});

let selectCallIndex = 0;

vi.mock<typeof import("@/lib/db")>(import("@/lib/db"), () => ({
  db: {
    select: vi.fn(() => {
      selectCallIndex += 1;
      if (selectCallIndex === 1) {
        return mockPostChain.select();
      }
      if (selectCallIndex === 2) {
        return mockArtistsChain.select();
      }
      return mockCommentChain.select();
    }),
  },
}));

describe("gET /api/posts/[slug]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectCallIndex = 0;

    mockPostChain.select.mockReturnValue({ from: mockPostChain.from });
    mockPostChain.from.mockReturnValue({ leftJoin: mockPostChain.leftJoin });
    mockPostChain.leftJoin.mockReturnValue({ where: mockPostChain.where });
    mockPostChain.where.mockReturnValue({ limit: mockPostChain.limit });

    mockArtistsChain.select.mockReturnValue({ from: mockArtistsChain.from });
    mockArtistsChain.from.mockReturnValue({ innerJoin: mockArtistsChain.innerJoin });
    mockArtistsChain.innerJoin.mockReturnValue({ where: mockArtistsChain.where });
    mockArtistsChain.where.mockResolvedValue([]);

    mockCommentChain.select.mockReturnValue({ from: mockCommentChain.from });
    mockCommentChain.from.mockReturnValue({ where: mockCommentChain.where });
    mockCommentChain.where.mockResolvedValue([]);
  });

  it("maps author name from joined user record", async () => {
    mockPostChain.limit.mockResolvedValue([
      {
        authorEmail: "jamie@example.com",
        authorFirstName: "Jamie",
        authorId: "clerk_user_123",
        authorLastName: "River",
        category: "EDM",
        content: "<p>hello</p>",
        coverImage: null,
        createdAt: new Date("2026-01-30T00:00:00.000Z"),
        excerpt: "Excerpt",
        id: 1,
        isCoverStory: false,
        publishedAt: new Date("2026-02-01T00:00:00.000Z"),
        slug: "test-post",
        status: "published",
        title: "Test Post",
        updatedAt: new Date("2026-02-02T00:00:00.000Z"),
        views: 10,
      },
    ]);

    mockCommentChain.where.mockResolvedValue([{ count: 4 }]);

    const request = new Request("http://localhost:3001/api/posts/test-post");
    const response = await GET(request, { params: Promise.resolve({ slug: "test-post" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.author.id).toBe("clerk_user_123");
    expect(data.author.name).toBe("Jamie River");
    expect(data.comment_count).toBe(4);
  });

  it("falls back to Unknown when joined author fields are empty", async () => {
    mockPostChain.limit.mockResolvedValue([
      {
        authorEmail: null,
        authorFirstName: null,
        authorId: "clerk_user_999",
        authorLastName: null,
        category: "OTHER",
        content: "<p>hello</p>",
        coverImage: null,
        createdAt: new Date("2026-01-30T00:00:00.000Z"),
        excerpt: "Excerpt",
        id: 2,
        isCoverStory: false,
        publishedAt: new Date("2026-02-01T00:00:00.000Z"),
        slug: "fallback-post",
        status: "published",
        title: "Fallback Post",
        updatedAt: new Date("2026-02-02T00:00:00.000Z"),
        views: 0,
      },
    ]);

    const request = new Request("http://localhost:3001/api/posts/fallback-post");
    const response = await GET(request, { params: Promise.resolve({ slug: "fallback-post" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.author.id).toBe("clerk_user_999");
    expect(data.author.name).toBe("Unknown");
  });
});
