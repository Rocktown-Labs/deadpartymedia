import { auth } from "@clerk/nextjs/server";
import { getUserStats } from "@/lib/user/stats";
import { GET } from "@/app/api/user/stats/route";

vi.mock<typeof import("@clerk/nextjs/server")>(import("@clerk/nextjs/server"), () => ({
  auth: Object.assign(vi.fn(), { protect: vi.fn() }),
}));

vi.mock<typeof import("@/lib/user/stats")>(import("@/lib/user/stats"), () => ({
  getUserStats: vi.fn(),
}));

describe("gET /api/user/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toStrictEqual({ error: "Unauthorized" });
    expect(getUserStats).not.toHaveBeenCalled();
  });

  it("returns user stats for authenticated users", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_123" } as any);
    vi.mocked(getUserStats).mockResolvedValue({
      articles_read_count: 3,
      articles_saved_count: 2,
      comments_count: 5,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(getUserStats).toHaveBeenCalledWith("user_123");
    expect(data).toStrictEqual({
      articles_read_count: 3,
      articles_saved_count: 2,
      comments_count: 5,
    });
  });

  it("returns 500 when stats query fails (e.g. missing/out-of-sync tables)", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_123" } as any);
    vi.mocked(getUserStats).mockRejectedValue(
      new Error('relation "user_article_reads" does not exist'),
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toStrictEqual({ error: "Failed to fetch user stats" });
  });
});
