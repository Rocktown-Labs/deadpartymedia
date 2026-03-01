
import { auth } from "@clerk/nextjs/server";
import {
  GET as getReadArticles,
  POST as postReadArticle,
} from "@/app/api/user/articles/read/route";
import {
  GET as getSavedArticles,
  POST as postSavedArticle,
} from "@/app/api/user/articles/saved/route";
import { DELETE as deleteSavedArticle } from "@/app/api/user/articles/saved/[id]/route";
import { GET as getUserComments } from "@/app/api/user/comments/route";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    delete: vi.fn(),
    insert: vi.fn(),
    select: vi.fn(),
  },
}));

vi.mock<typeof import('@/lib/db')>(import('@/lib/db'), () => ({
  db: mockDb,
}));

vi.mock<typeof import('@clerk/nextjs/server')>(import('@clerk/nextjs/server'), () => ({
  auth: vi.fn(),
}));

function mockSelectWithLimit(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  mockDb.select.mockReturnValueOnce({ from });
}

function mockSelectCount(total: number) {
  const where = vi.fn().mockResolvedValue([{ total }]);
  const innerJoin = vi.fn().mockReturnValue({ where });
  const from = vi.fn().mockReturnValue({ innerJoin });
  mockDb.select.mockReturnValueOnce({ from });
}

function mockSelectWithInnerJoinOrderByLimitOffset(rows: unknown[]) {
  const offset = vi.fn().mockResolvedValue(rows);
  const limit = vi.fn().mockReturnValue({ offset });
  const orderBy = vi.fn().mockReturnValue({ limit });
  const where = vi.fn().mockReturnValue({ orderBy });
  const innerJoin = vi.fn().mockReturnValue({ where });
  const from = vi.fn().mockReturnValue({ innerJoin });
  mockDb.select.mockReturnValueOnce({ from });
  return { limit, offset, orderBy, where };
}

function mockSelectWithWhereOrderBy(rows: unknown[]) {
  const orderBy = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ orderBy });
  const from = vi.fn().mockReturnValue({ where });
  mockDb.select.mockReturnValueOnce({ from });
}

function mockInsertUpsertReturning<T>(rows: T[]) {
  const returning = vi.fn().mockResolvedValue(rows);
  const onConflictDoUpdate = vi.fn().mockReturnValue({ returning });
  const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
  mockDb.insert.mockReturnValueOnce({ values });
  return { onConflictDoUpdate, values };
}

function mockDeleteReturning(rows: unknown[]) {
  const returning = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ returning });
  mockDb.delete.mockReturnValueOnce({ where });
}

describe("aPI /api/user activity endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 on read-articles GET when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    const response = await getReadArticles(
      new Request("http://localhost:3001/api/user/articles/read"),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns read-articles GET with empty pagination when no reads exist", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_1" } as any);
    mockSelectCount(0);

    const response = await getReadArticles(
      new Request("http://localhost:3001/api/user/articles/read"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toStrictEqual({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });
  });

  it("returns read-articles GET with paginated shape", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_1" } as any);

    mockSelectCount(2);
    mockSelectWithInnerJoinOrderByLimitOffset([
      {
        article: {
          id: 11,
          slug: "test-post",
          title: "Test Post",
          excerpt: "Excerpt",
          coverImage: null,
          authorId: "author_1",
          publishedAt: new Date("2026-01-01T00:00:00.000Z"),
          views: 12,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        },
        id: 4,
        readAt: new Date("2026-01-03T00:00:00.000Z"),
      },
    ]);

    const response = await getReadArticles(
      new Request("http://localhost:3001/api/user/articles/read?page=1&page_size=1"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.count).toBe(2);
    expect(data.results).toHaveLength(1);
    expect(data.results[0].id).toBe(4);
    expect(data.results[0].article.slug).toBe("test-post");
    expect(data.results[0].read_at).toBeTypeOf("string");
    expect(data.next).toContain("page=2");
    expect(data.previous).toBeNull();
  });

  it("returns read-articles GET with previous URL on later pages", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_1" } as any);

    mockSelectCount(2);
    mockSelectWithInnerJoinOrderByLimitOffset([
      {
        article: {
          id: 22,
          slug: "page-two-post",
          title: "Page Two Post",
          excerpt: "Excerpt",
          coverImage: null,
          authorId: "author_2",
          publishedAt: new Date("2026-01-01T00:00:00.000Z"),
          views: 2,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        },
        id: 6,
        readAt: new Date("2026-01-04T00:00:00.000Z"),
      },
    ]);

    const response = await getReadArticles(
      new Request("http://localhost:3001/api/user/articles/read?page=2&page_size=1"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.count).toBe(2);
    expect(data.results).toHaveLength(1);
    expect(data.next).toBeNull();
    expect(data.previous).toContain("page=1");
    expect(data.previous).toContain("page_size=1");
  });

  it("returns 401 on read-articles POST when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    const request = new Request("http://localhost:3001/api/user/articles/read", {
      body: JSON.stringify({ article_id: 11 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const response = await postReadArticle(request as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 on read-articles POST when validation fails", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_1" } as any);

    const request = new Request("http://localhost:3001/api/user/articles/read", {
      body: JSON.stringify({ article_id: "invalid" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const response = await postReadArticle(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid article_id");
  });

  it("returns 400 on read-articles POST when JSON is malformed", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_1" } as any);

    const request = new Request("http://localhost:3001/api/user/articles/read", {
      body: "{",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const response = await postReadArticle(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid JSON payload");
  });

  it("returns 404 on read-articles POST when article is not found", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_1" } as any);
    mockSelectWithLimit([]);

    const request = new Request("http://localhost:3001/api/user/articles/read", {
      body: JSON.stringify({ article_id: 999 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const response = await postReadArticle(request as any);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Article not found");
  });

  it("upserts read-articles POST idempotently and returns shape", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_1" } as any);

    mockSelectWithLimit([
      {
        authorId: "author_1",
        coverImage: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        excerpt: "Excerpt",
        id: 11,
        publishedAt: new Date("2026-01-01T00:00:00.000Z"),
        slug: "test-post",
        title: "Test Post",
        views: 12,
      },
    ]);

    const { onConflictDoUpdate } = mockInsertUpsertReturning([
      { id: 5, readAt: new Date("2026-01-02T00:00:00.000Z") },
    ]);

    const request = new Request("http://localhost:3001/api/user/articles/read", {
      body: JSON.stringify({ article_id: 11 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const response = await postReadArticle(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(onConflictDoUpdate).toHaveBeenCalledOnce();
    expect(onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        set: expect.objectContaining({
          readAt: expect.any(Date),
        }),
        target: expect.any(Array),
      }),
    );
    expect(data.id).toBe(5);
    expect(data.article.slug).toBe("test-post");
    expect(data.read_at).toBeTypeOf("string");
  });

  it("returns saved-articles GET with empty pagination when no saves exist", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_1" } as any);
    mockSelectWithInnerJoinOrderByLimitOffset([]);
    mockSelectCount(0);

    const response = await getSavedArticles(
      new Request("http://localhost:3001/api/user/articles/saved"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toStrictEqual({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });
  });

  it("returns saved-articles GET with paginated shape", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_1" } as any);

    mockSelectWithInnerJoinOrderByLimitOffset([
      {
        article: {
          id: 22,
          slug: "saved-post",
          title: "Saved Post",
          excerpt: "Saved excerpt",
          coverImage: null,
          authorId: "author_2",
          publishedAt: new Date("2026-01-01T00:00:00.000Z"),
          views: 2,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        },
        id: 9,
        savedAt: new Date("2026-01-03T00:00:00.000Z"),
        totalSaves: 2,
      },
    ]);

    const response = await getSavedArticles(
      new Request("http://localhost:3001/api/user/articles/saved?page=1&page_size=1"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.count).toBe(2);
    expect(data.results).toHaveLength(1);
    expect(data.results[0].id).toBe(9);
    expect(data.results[0].article.slug).toBe("saved-post");
    expect(data.results[0].saved_at).toBeTypeOf("string");
    expect(data.next).toContain("page=2");
    expect(data.previous).toBeNull();
  });

  it("returns saved-articles GET with previous URL on later pages", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_1" } as any);

    mockSelectWithInnerJoinOrderByLimitOffset([
      {
        article: {
          id: 23,
          slug: "saved-page-two",
          title: "Saved Page Two",
          excerpt: "Saved excerpt",
          coverImage: null,
          authorId: "author_2",
          publishedAt: new Date("2026-01-01T00:00:00.000Z"),
          views: 3,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        },
        id: 10,
        savedAt: new Date("2026-01-04T00:00:00.000Z"),
        totalSaves: 2,
      },
    ]);

    const response = await getSavedArticles(
      new Request("http://localhost:3001/api/user/articles/saved?page=2&page_size=1"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.count).toBe(2);
    expect(data.results).toHaveLength(1);
    expect(data.next).toBeNull();
    expect(data.previous).toContain("page=1");
    expect(data.previous).toContain("page_size=1");
  });

  it("falls back to default pagination for invalid saved-articles params", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_1" } as any);

    const queryMock = mockSelectWithInnerJoinOrderByLimitOffset([
      {
        article: {
          id: 24,
          slug: "saved-fallback",
          title: "Saved Fallback",
          excerpt: "Saved excerpt",
          coverImage: null,
          authorId: "author_3",
          publishedAt: new Date("2026-01-01T00:00:00.000Z"),
          views: 4,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        },
        id: 11,
        savedAt: new Date("2026-01-05T00:00:00.000Z"),
        totalSaves: 25,
      },
    ]);

    const response = await getSavedArticles(
      new Request("http://localhost:3001/api/user/articles/saved?page=abc&page_size=-7"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(queryMock.limit).toHaveBeenCalledWith(20);
    expect(queryMock.offset).toHaveBeenCalledWith(0);
    expect(data.next).toContain("page=2");
    expect(data.next).toContain("page_size=20");
    expect(data.previous).toBeNull();
  });

  it("clamps saved-articles page_size to max value", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_1" } as any);

    const queryMock = mockSelectWithInnerJoinOrderByLimitOffset([
      {
        article: {
          id: 25,
          slug: "saved-clamped",
          title: "Saved Clamped",
          excerpt: "Saved excerpt",
          coverImage: null,
          authorId: "author_4",
          publishedAt: new Date("2026-01-01T00:00:00.000Z"),
          views: 5,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        },
        id: 12,
        savedAt: new Date("2026-01-06T00:00:00.000Z"),
        totalSaves: 101,
      },
    ]);

    const response = await getSavedArticles(
      new Request("http://localhost:3001/api/user/articles/saved?page=1&page_size=999"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(queryMock.limit).toHaveBeenCalledWith(100);
    expect(queryMock.offset).toHaveBeenCalledWith(0);
    expect(data.next).toContain("page=2");
    expect(data.next).toContain("page_size=100");
    expect(data.previous).toBeNull();
  });

  it("upserts saved-articles POST idempotently", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_1" } as any);

    mockSelectWithLimit([
      {
        authorId: "author_3",
        coverImage: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        excerpt: "Savable excerpt",
        id: 33,
        publishedAt: new Date("2026-01-01T00:00:00.000Z"),
        slug: "savable-post",
        title: "Savable Post",
        views: 4,
      },
    ]);

    const { onConflictDoUpdate } = mockInsertUpsertReturning([
      { id: 17, savedAt: new Date("2026-01-04T00:00:00.000Z") },
    ]);

    const request = new Request("http://localhost:3001/api/user/articles/saved", {
      body: JSON.stringify({ article_id: 33 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const response = await postSavedArticle(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(onConflictDoUpdate).toHaveBeenCalledOnce();
    expect(data.id).toBe(17);
    expect(data.saved_at).toBeTypeOf("string");
  });

  it("returns 400 on saved-articles POST when JSON is malformed", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_1" } as any);

    const request = new Request("http://localhost:3001/api/user/articles/saved", {
      body: "{",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const response = await postSavedArticle(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid JSON payload");
  });

  it("returns 401 on delete saved article when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    const request = new Request("http://localhost:3001/api/user/articles/saved/1", {
      method: "DELETE",
    });
    const response = await deleteSavedArticle(request as any, {
      params: Promise.resolve({ id: "1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 on delete saved article when id is invalid", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_1" } as any);

    const request = new Request("http://localhost:3001/api/user/articles/saved/invalid", {
      method: "DELETE",
    });
    const response = await deleteSavedArticle(request as any, {
      params: Promise.resolve({ id: "invalid" }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid id");
  });

  it("returns 401 on user-comments GET when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    const response = await getUserComments(new Request("http://localhost:3001/api/user/comments"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns user-comments GET with nested replies shape", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_1" } as any);

    mockSelectCount(1);
    mockSelectWithInnerJoinOrderByLimitOffset([
      {
        article: {
          id: 12,
          slug: "post-12",
          title: "Post 12",
          coverImage: null,
        },
        content: "Top level",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        id: 101,
        parent: null,
        postId: 12,
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);

    mockSelectWithWhereOrderBy([
      {
        content: "Reply",
        createdAt: new Date("2026-01-02T00:00:00.000Z"),
        id: 202,
        parentId: 101,
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
    ]);

    const response = await getUserComments(new Request("http://localhost:3001/api/user/comments"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.count).toBe(1);
    expect(data.results[0].article.slug).toBe("post-12");
    expect(data.results[0].replies).toHaveLength(1);
    expect(data.results[0].replies[0].content).toBe("Reply");
    expect(data.next).toBeNull();
    expect(data.previous).toBeNull();
  });

  it("returns only top-level comments in results when base set includes replies", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_1" } as any);

    mockSelectCount(2);
    mockSelectWithInnerJoinOrderByLimitOffset([
      {
        article: {
          id: 12,
          slug: "post-12",
          title: "Post 12",
          coverImage: null,
        },
        content: "Top level",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        id: 101,
        parent: null,
        postId: 12,
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);

    mockSelectWithWhereOrderBy([
      {
        content: "Reply",
        createdAt: new Date("2026-01-02T00:00:00.000Z"),
        id: 202,
        parentId: 101,
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
    ]);

    const response = await getUserComments(
      new Request("http://localhost:3001/api/user/comments?page=1&page_size=1"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.count).toBe(2);
    expect(data.results).toHaveLength(1);
    expect(data.results[0].id).toBe(101);
    expect(data.results[0].replies).toHaveLength(1);
    expect(data.results[0].replies[0].id).toBe(202);
    expect(data.next).toContain("page=2");
    expect(data.previous).toBeNull();
  });

  it("deletes saved article successfully", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_1" } as any);
    mockDeleteReturning([{ id: 50 }]);

    const request = new Request("http://localhost:3001/api/user/articles/saved/50", {
      method: "DELETE",
    });
    const response = await deleteSavedArticle(request as any, {
      params: Promise.resolve({ id: "50" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBeTruthy();
  });

  it("returns 404 when deleting a saved article that does not belong to the user", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_1" } as any);
    mockDeleteReturning([]);

    const request = new Request("http://localhost:3001/api/user/articles/saved/77", {
      method: "DELETE",
    });
    const response = await deleteSavedArticle(request as any, {
      params: Promise.resolve({ id: "77" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Saved article not found");
  });
});
