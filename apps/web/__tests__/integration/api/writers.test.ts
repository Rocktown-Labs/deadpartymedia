
import { GET } from "@/app/api/writers/route";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    from: vi.fn(),
    groupBy: vi.fn(),
    leftJoin: vi.fn(),
    select: vi.fn(),
    where: vi.fn(),
  },
}));

vi.mock<typeof import('@/lib/db')>(import('@/lib/db'), () => ({
  db: mockDb,
}));

describe("gET /api/writers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReturnValue({ from: mockDb.from });
    mockDb.from.mockReturnValue({ leftJoin: mockDb.leftJoin });
    mockDb.leftJoin.mockReturnValue({ groupBy: mockDb.groupBy });
    mockDb.groupBy.mockReturnValue({ where: mockDb.where });
    mockDb.where.mockResolvedValue([]);
  });

  it("returns mapped writers/admins with articleCount", async () => {
    mockDb.where.mockResolvedValue([
      {
        articleCount: 7,
        firstName: "Jane",
        id: 1,
        imageUrl: "https://example.com/jane.png",
        lastName: "Writer",
        role: "writer",
      },
      {
        articleCount: 3,
        firstName: "Sam",
        id: 2,
        imageUrl: null,
        lastName: "Admin",
        role: "super_admin",
      },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBeTruthy();
    expect(data).toHaveLength(2);
    expect(mockDb.where).toHaveBeenCalledOnce();
    expect(data[0]).toStrictEqual({
      articleCount: 7,
      bio: "",
      id: 1,
      image: "https://example.com/jane.png",
      instagram: null,
      name: "Jane Writer",
      role: "writer",
      twitter: null,
    });
    expect(data[1].role).toBe("super_admin");
    expect(data[1].articleCount).toBe(3);
  });

  it("defaults name and articleCount when source values are missing", async () => {
    mockDb.where.mockResolvedValue([
      {
        articleCount: null,
        firstName: null,
        id: 5,
        imageUrl: null,
        lastName: null,
        role: "writer",
      },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Writer");
    expect(data[0].articleCount).toBe(0);
  });

  it("returns empty list when no writers found", async () => {
    mockDb.where.mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toStrictEqual([]);
  });
});
