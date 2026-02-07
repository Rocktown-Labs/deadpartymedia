import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/articles/[slug]/comments/route";
import { auth, clerkClient } from "@clerk/nextjs/server";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  db: mockDb,
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  clerkClient: vi.fn(),
}));

vi.mock("@/lib/logger/middleware", () => ({
  getRequestLogger: vi.fn(() => ({
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
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

describe("API /api/articles/[slug]/comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated comment creation", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    const request = new Request("http://localhost:3001/api/articles/test-post/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "hello" }),
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
      userId: "user_123",
      sessionClaims: { metadata: { role: "fan", onboardingComplete: false } },
    } as any);

    mockSelectWithLimit([{ id: 10 }]);
    mockSelectWithLimit([{ role: "fan", onboardingComplete: false }]);

    const request = new Request("http://localhost:3001/api/articles/test-post/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "blocked comment" }),
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
      userId: "user_123",
      sessionClaims: { metadata: { role: "fan", onboardingComplete: true } },
    } as any);

    mockSelectWithLimit([{ id: 10 }]);

    const request = new Request("http://localhost:3001/api/articles/test-post/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
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
      userId: "user_123",
      sessionClaims: { metadata: { role: "fan", onboardingComplete: true } },
    } as any);

    mockSelectWithLimit([{ id: 10 }]);
    mockSelectWithLimit([{ role: "fan", onboardingComplete: true }]);

    const createdAt = new Date();
    const updatedAt = new Date();
    mockDb.insert.mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 99,
            content: "created",
            user_name: "Test User",
            user_email: "test@example.com",
            created_at: createdAt,
            updated_at: updatedAt,
          },
        ]),
      }),
    });

    vi.mocked(clerkClient).mockResolvedValue({
      users: {
        getUser: vi.fn().mockResolvedValue({
          fullName: "Test User",
          firstName: "Test",
          lastName: "User",
          primaryEmailAddressId: "email_1",
          emailAddresses: [{ id: "email_1", emailAddress: "test@example.com" }],
        }),
      },
    } as any);

    const request = new Request("http://localhost:3001/api/articles/test-post/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "created" }),
    });

    const response = await POST(request as any, {
      params: Promise.resolve({ slug: "test-post" }),
    });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBe(99);
    expect(data.content).toBe("created");
    expect(data.replies).toEqual([]);
  });

  it("returns comments and nested replies shape", async () => {
    mockSelectWithLimit([{ id: 10 }]);
    mockSelectCount(1);
    mockSelectWithOrderByLimitOffset([
      {
        id: 1,
        content: "top-level",
        user_name: "User A",
        user_email: "a@example.com",
        created_at: new Date("2026-01-01T00:00:00.000Z"),
        updated_at: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    mockSelectWithOrderBy([
      {
        id: 2,
        content: "reply",
        user_name: "User B",
        user_email: "b@example.com",
        parent_id: 1,
        created_at: new Date("2026-01-02T00:00:00.000Z"),
        updated_at: new Date("2026-01-02T00:00:00.000Z"),
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
    expect(Array.isArray(data.results)).toBe(true);
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
        id: 1,
        content: "top-level",
        user_name: "User A",
        user_email: "a@example.com",
        created_at: new Date("2026-01-01T00:00:00.000Z"),
        updated_at: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    mockSelectWithOrderBy([]);

    const request = new Request("http://localhost:3001/api/articles/test-post/comments?page=1&page_size=1");
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
