import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/writers/route";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    select: vi.fn(),
    from: vi.fn(),
    leftJoin: vi.fn(),
    groupBy: vi.fn(),
    where: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  db: mockDb,
}));

describe("GET /api/writers", () => {
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
        id: 1,
        firstName: "Jane",
        lastName: "Writer",
        imageUrl: "https://example.com/jane.png",
        role: "writer",
        articleCount: 7,
      },
      {
        id: 2,
        firstName: "Sam",
        lastName: "Admin",
        imageUrl: null,
        role: "super_admin",
        articleCount: 3,
      },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(2);
    expect(mockDb.where).toHaveBeenCalledTimes(1);
    expect(data[0]).toEqual({
      id: 1,
      name: "Jane Writer",
      bio: "",
      image: "https://example.com/jane.png",
      role: "writer",
      twitter: null,
      instagram: null,
      articleCount: 7,
    });
    expect(data[1].role).toBe("super_admin");
    expect(data[1].articleCount).toBe(3);
  });

  it("defaults name and articleCount when source values are missing", async () => {
    mockDb.where.mockResolvedValue([
      {
        id: 5,
        firstName: null,
        lastName: null,
        imageUrl: null,
        role: "writer",
        articleCount: null,
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
    expect(data).toEqual([]);
  });
});
