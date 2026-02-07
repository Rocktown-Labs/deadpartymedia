import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUserStats } from "@/lib/user/stats";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    execute: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  db: mockDb,
}));

describe("getUserStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("coerces numeric-like DB values to numbers", async () => {
    mockDb.execute.mockResolvedValue({
      rows: [
        {
          articles_read_count: "4",
          articles_saved_count: 2,
          comments_count: "7",
        },
      ],
    });

    const result = await getUserStats("user_1");

    expect(result).toEqual({
      articles_read_count: 4,
      articles_saved_count: 2,
      comments_count: 7,
    });
  });

  it("defaults to zero when row/columns are missing or null", async () => {
    mockDb.execute.mockResolvedValue({ rows: [{}] });

    const firstResult = await getUserStats("user_1");

    expect(firstResult).toEqual({
      articles_read_count: 0,
      articles_saved_count: 0,
      comments_count: 0,
    });

    mockDb.execute.mockResolvedValue({
      rows: [
        {
          articles_read_count: null,
          articles_saved_count: null,
          comments_count: null,
        },
      ],
    });

    const secondResult = await getUserStats("user_1");

    expect(secondResult).toEqual({
      articles_read_count: 0,
      articles_saved_count: 0,
      comments_count: 0,
    });
  });
});
