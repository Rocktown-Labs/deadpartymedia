import { ensureUniqueSlug } from "@/lib/utils/slug";

// Mock database - create a shared mock object that can be reset per test
const mockDbChain = {
  from: vi.fn(),
  limit: vi.fn(),
  select: vi.fn(),
  where: vi.fn(),
};

// Set up the chain
mockDbChain.select.mockReturnValue({ from: mockDbChain.from });
mockDbChain.from.mockReturnValue({ where: mockDbChain.where });
mockDbChain.where.mockReturnValue({ limit: mockDbChain.limit });

vi.mock<typeof import("@/lib/db")>(import("@/lib/db"), () => ({
  db: mockDbChain,
}));

// Mock schema to prevent relations from being called
vi.mock<typeof import("@/lib/db/schema")>(import("@/lib/db/schema"), () => ({
  artists: { id: "id", slug: "slug" },
  events: { id: "id", slug: "slug" },
  posts: { id: "id", slug: "slug" },
}));

vi.mock<typeof import("drizzle-orm")>(import("drizzle-orm"), async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    and: vi.fn((...conditions) => conditions),
    eq: vi.fn((field, value) => ({ field, value })),
    ne: vi.fn((field, value) => ({ field, operator: "ne", value })),
    relations: vi.fn((table, callback) => callback({ many: vi.fn(), one: vi.fn() })),
  };
});

describe(ensureUniqueSlug, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the chain
    mockDbChain.select.mockReturnValue({ from: mockDbChain.from });
    mockDbChain.from.mockReturnValue({ where: mockDbChain.where });
    mockDbChain.where.mockReturnValue({ limit: mockDbChain.limit });
  });

  it("should return original slug if unique", async () => {
    // Set up the mock chain to return empty array (unique slug)
    mockDbChain.limit.mockResolvedValue([]);

    const slug = await ensureUniqueSlug("test-artist", undefined, "artists");
    expect(slug).toBe("test-artist");
    expect(mockDbChain.select).toHaveBeenCalledTimes(1);
    expect(mockDbChain.from).toHaveBeenCalledTimes(1);
    expect(mockDbChain.where).toHaveBeenCalledTimes(1);
    expect(mockDbChain.limit).toHaveBeenCalledTimes(1);
  });

  it("should append counter if slug exists", async () => {
    let callCount = 0;
    mockDbChain.limit.mockImplementation(() => {
      callCount++;
      return Promise.resolve(callCount === 1 ? [{ id: 1 }] : []) as any;
    });

    const slug = await ensureUniqueSlug("test-artist", undefined, "artists");
    expect(slug).toBe("test-artist-1");
  });

  it("should increment counter until unique slug found", async () => {
    let callCount = 0;
    mockDbChain.limit.mockImplementation(() => {
      callCount++;
      return Promise.resolve(callCount <= 2 ? [{ id: callCount }] : []) as any;
    });

    const slug = await ensureUniqueSlug("test-artist", undefined, "artists");
    expect(slug).toBe("test-artist-2");
  });
});
