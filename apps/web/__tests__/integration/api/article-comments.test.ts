import { GET, POST } from "@/app/api/articles/[slug]/comments/route";
import { auth, clerkClient } from "@clerk/nextjs/server";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    insert: vi.fn(),
    select: vi.fn(),
  },
}));

vi.mock<typeof import("@/lib/db")>(import("@/lib/db"), () => ({
  db: mockDb,
}));

vi.mock<typeof import("@clerk/nextjs/server")>(import("@clerk/nextjs/server"), () => ({
  auth: Object.assign(vi.fn(), { protect: vi.fn() }),
  clerkClient: vi.fn(),
}));

vi.mock<typeof import("@/lib/logger/middleware")>(import("@/lib/logger/middleware"), () => ({
  getRequestLogger: vi.fn(() => ({
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  })),
}));

function mockSelectWithLimit(rows: unknown[]) {
  mockDb.select.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(rows),
      }),
    }),
  });
}

function mockSelectWithOrderBy(rows: unknown[]) {
  mockDb.select.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(rows),
      }),
    }),
  });
}

function mockSelectCount(total: number) {
  mockDb.select.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ total }]),
    }),
  });
}

function mockSelectWithOrderByLimitOffset(rows: unknown[]) {
  mockDb.select.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockResolvedValue(rows),
          }),
        }),
      }),
    }),
  });
}

describe("aPI /api/articles/[slug]/comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated comment creation", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    const request = new Request("http://localhost:3001/api/articles/test-post/comments", {
      body: JSON.stringify({ content: "hello" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const response = await POST(request as any, {
      params: Promise.resolve({ slug: "test-post" }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 when onboarding is incomplete", async () => {
    vi.mocked(auth).mockResolvedValue({
      sessionClaims: { metadata: { onboardingComplete: false, role: "fan" } },
      userId: "user_123",
    } as any);

    mockSelectWithLimit([{ id: 10 }]);
    mockSelectWithLimit([{ onboardingComplete: false, role: "fan" }]);

    const request = new Request("http://localhost:3001/api/articles/test-post/comments", {
      body: JSON.stringify({ content: "blocked comment" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const response = await POST(request as any, {
      params: Promise.resolve({ slug: "test-post" }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("Complete onboarding");
  });

  it("returns 400 when comment payload is malformed JSON", async () => {
    vi.mocked(auth).mockResolvedValue({
      sessionClaims: { metadata: { onboardingComplete: true, role: "fan" } },
      userId: "user_123",
    } as any);

    mockSelectWithLimit([{ id: 10 }]);

    const request = new Request("http://localhost:3001/api/articles/test-post/comments", {
      body: "{",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const response = await POST(request as any, {
      params: Promise.resolve({ slug: "test-post" }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid JSON payload");
  });

  it("creates a comment for an onboarded user", async () => {
    vi.mocked(auth).mockResolvedValue({
      sessionClaims: { metadata: { onboardingComplete: true, role: "fan" } },
      userId: "user_123",
    } as any);

    mockSelectWithLimit([{ id: 10 }]);
    mockSelectWithLimit([{ onboardingComplete: true, role: "fan" }]);

    const createdAt = new Date();
    const updatedAt = new Date();
    mockDb.insert.mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            content: "created",
            created_at: createdAt,
            id: 99,
            updated_at: updatedAt,
            user_email: "test@example.com",
            user_name: "Test User",
          },
        ]),
      }),
    });

    vi.mocked(clerkClient).mockResolvedValue({
      users: {
        getUser: vi.fn().mockResolvedValue({
          emailAddresses: [{ emailAddress: "test@example.com", id: "email_1" }],
          firstName: "Test",
          fullName: "Test User",
          lastName: "User",
          primaryEmailAddressId: "email_1",
        }),
      },
    } as any);

    const request = new Request("http://localhost:3001/api/articles/test-post/comments", {
      body: JSON.stringify({ content: "created" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const response = await POST(request as any, {
      params: Promise.resolve({ slug: "test-post" }),
    });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBe(99);
    expect(data.content).toBe("created");
    expect(data.replies).toStrictEqual([]);
  });

  it("returns comments and nested replies shape", async () => {
    mockSelectWithLimit([{ id: 10 }]);
    mockSelectCount(1);
    mockSelectWithOrderByLimitOffset([
      {
        content: "top-level",
        created_at: new Date("2026-01-01T00:00:00.000Z"),
        id: 1,
        updated_at: new Date("2026-01-01T00:00:00.000Z"),
        user_email: "a@example.com",
        user_name: "User A",
      },
    ]);
    mockSelectWithOrderBy([
      {
        content: "reply",
        created_at: new Date("2026-01-02T00:00:00.000Z"),
        id: 2,
        parent_id: 1,
        updated_at: new Date("2026-01-02T00:00:00.000Z"),
        user_email: "b@example.com",
        user_name: "User B",
      },
    ]);

    const request = new Request("http://localhost:3001/api/articles/test-post/comments");
    const response = await GET(request as any, {
      params: Promise.resolve({ slug: "test-post" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.count).toBe(1);
    expect(data.next).toBeNull();
    expect(data.previous).toBeNull();
    expect(Array.isArray(data.results)).toBeTruthy();
    expect(data.results).toHaveLength(1);
    expect(data.results[0].content).toBe("top-level");
    expect(data.results[0].replies).toHaveLength(1);
    expect(data.results[0].replies[0].content).toBe("reply");
  });

  it("returns pagination metadata for incremental loading", async () => {
    mockSelectWithLimit([{ id: 10 }]);
    mockSelectCount(2);
    mockSelectWithOrderByLimitOffset([
      {
        content: "top-level",
        created_at: new Date("2026-01-01T00:00:00.000Z"),
        id: 1,
        updated_at: new Date("2026-01-01T00:00:00.000Z"),
        user_email: "a@example.com",
        user_name: "User A",
      },
    ]);
    mockSelectWithOrderBy([]);

    const request = new Request(
      "http://localhost:3001/api/articles/test-post/comments?page=1&page_size=1",
    );
    const response = await GET(request as any, {
      params: Promise.resolve({ slug: "test-post" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.count).toBe(2);
    expect(data.results).toHaveLength(1);
    expect(data.next).toContain("page=2");
    expect(data.previous).toBeNull();
  });
});
