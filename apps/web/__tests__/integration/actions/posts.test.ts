import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createPost,
  updatePost,
  deletePost,
  requestDeletePost,
  approveDeletePost,
  denyDeletePost,
} from "@/app/admin/posts/actions";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { canCreate, canEdit, canDelete } from "@/lib/auth/access";

// Mock dependencies
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(() => {}), // Mock to not throw
  revalidateTag: vi.fn(() => {}),
}));

vi.mock("@/lib/auth/access", () => ({
  canCreate: vi.fn(),
  canEdit: vi.fn(),
  canDelete: vi.fn(),
}));

vi.mock("@/lib/utils/slug", () => ({
  generateSlug: vi.fn((name: string) =>
    name.toLowerCase().replace(/\s+/g, "-")
  ),
  ensureUniqueSlug: vi.fn(
    async (slug: string, _id?: number, _table?: string) => slug
  ),
}));

// Mock database - hoist variables to avoid initialization errors
const {
  mockInsert,
  mockUpdate,
  mockDelete,
  mockSelect,
  mockValues,
  mockReturning,
  mockSet,
  mockWhere,
  mockFrom,
  mockLimit,
} = vi.hoisted(() => {
  return {
    mockInsert: vi.fn(),
    mockUpdate: vi.fn(),
    mockDelete: vi.fn(),
    mockSelect: vi.fn(),
    mockValues: vi.fn(),
    mockReturning: vi.fn(),
    mockSet: vi.fn(),
    mockWhere: vi.fn(),
    mockFrom: vi.fn(),
    mockLimit: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    select: mockSelect,
  },
}));

describe("createPost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const userId = "user_test123";
    vi.mocked(auth).mockResolvedValue({ userId } as any);
    vi.mocked(canCreate).mockResolvedValue(true);

    // Set up insert chain
    mockValues.mockReturnValue({ returning: mockReturning });
    mockReturning.mockResolvedValue([{ id: 1 }]);
    mockInsert.mockReturnValue({ values: mockValues });
  });

  it("should create post with artist relations", async () => {
    const formData = new FormData();
    formData.append("title", "Test Post");
    formData.append("slug", "test-post");
    formData.append("category", "EDM");
    formData.append("excerpt", "Test excerpt");
    formData.append("content", "{}");
    formData.append("status", "published");
    formData.append("isCoverStory", "false");
    formData.append("artistIds", "1,2"); // Comma-separated string as sent by post-editor

    // Mock post insert - rely on call order instead of table identity (table is an object)
    // Chain: insert() -> { values } -> values() -> { returning } -> returning() -> Promise
    let insertCallCount = 0;
    mockInsert.mockImplementation(() => {
      insertCallCount++;
      if (insertCallCount === 1) {
        const mockPostReturning = vi
          .fn()
          .mockResolvedValue([{ id: 1, slug: "test-post" }]);
        return {
          values: vi.fn().mockReturnValue({
            returning: mockPostReturning,
          }),
        };
      }
      // Subsequent calls (postArtists) don't use returning()
      return { values: vi.fn().mockResolvedValue(undefined) };
    });

    await createPost(formData);

    expect(mockInsert).toHaveBeenCalled();
    // Should insert postArtists relations
    expect(mockInsert).toHaveBeenCalledTimes(2); // Once for post, once for postArtists
  });

  it("should create post without artist relations", async () => {
    const formData = new FormData();
    formData.append("title", "Test Post");
    formData.append("slug", "test-post");
    formData.append("category", "EDM");
    formData.append("excerpt", "Test excerpt");
    formData.append("content", "{}");
    formData.append("status", "published");
    formData.append("isCoverStory", "false");

    const mockPostInsert = vi
      .fn()
      .mockReturnValue({
        values: vi
          .fn()
          .mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 1 }]),
          }),
      });
    mockInsert.mockReturnValue(mockPostInsert());

    await createPost(formData);

    expect(mockInsert).toHaveBeenCalled();
    // Should only insert post, not postArtists
  });

  it("should redirect if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    const formData = new FormData();
    formData.append("title", "Test Post");
    formData.append("slug", "test-post");
    formData.append("category", "EDM");
    formData.append("excerpt", "Test excerpt");
    formData.append("content", "{}");
    formData.append("status", "published");
    formData.append("isCoverStory", "false");

    await createPost(formData);

    expect(redirect).toHaveBeenCalledWith("/sign-in");
  });

  it("should throw error if not authorized", async () => {
    vi.mocked(canCreate).mockResolvedValue(false);

    const formData = new FormData();
    formData.append("title", "Test Post");
    formData.append("slug", "test-post");
    formData.append("category", "EDM");
    formData.append("excerpt", "Test excerpt");
    formData.append("content", "{}");
    formData.append("status", "published");
    formData.append("isCoverStory", "false");

    await expect(createPost(formData)).rejects.toThrow("Unauthorized");
  });

  it("allows super_admin to override authorId to another writer profile", async () => {
    vi.mocked(canDelete).mockResolvedValue(true);

    const authorSelectLimit = vi.fn().mockResolvedValue([{ clerkId: "writer_target" }]);
    const authorSelectWhere = vi.fn().mockReturnValue({ limit: authorSelectLimit });
    const authorSelectFrom = vi.fn().mockReturnValue({ where: authorSelectWhere });
    mockSelect.mockReturnValue({ from: authorSelectFrom });

    const insertValues = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: 1, slug: "test-post" }]),
    });
    mockInsert.mockReturnValue({ values: insertValues });

    const formData = new FormData();
    formData.append("title", "Author Override");
    formData.append("slug", "author-override");
    formData.append("category", "EDM");
    formData.append("excerpt", "Test excerpt");
    formData.append("content", "{}");
    formData.append("status", "draft");
    formData.append("isCoverStory", "false");
    formData.append("authorId", "writer_target");

    await createPost(formData);

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        authorId: "writer_target",
      }),
    );
  });

  it("does not allow writer to override authorId", async () => {
    vi.mocked(canDelete).mockResolvedValue(false);

    const insertValues = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: 1, slug: "test-post" }]),
    });
    mockInsert.mockReturnValue({ values: insertValues });

    const formData = new FormData();
    formData.append("title", "Author Override");
    formData.append("slug", "author-override");
    formData.append("category", "EDM");
    formData.append("excerpt", "Test excerpt");
    formData.append("content", "{}");
    formData.append("status", "draft");
    formData.append("isCoverStory", "false");
    formData.append("authorId", "writer_target");

    await createPost(formData);

    expect(mockSelect).not.toHaveBeenCalled();
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        authorId: "user_test123",
      }),
    );
  });
});

describe("updatePost", () => {
  let selectCallCount = 0;

  beforeEach(() => {
    vi.clearAllMocks();
    selectCallCount = 0;
    const userId = "user_test123";
    vi.mocked(auth).mockResolvedValue({ userId } as any);

    // First select call: post lookup with limit(1)
    // Second select call: existing postArtists lookup returns rows directly
    mockSelect.mockImplementation(() => {
      selectCallCount += 1;
      if (selectCallCount === 1) {
        const firstWhere = vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: 1,
              title: "Existing Post",
              authorId: userId,
              isCoverStory: false,
              publishedAt: null,
              status: "published",
            },
          ]),
        });
        return {
          from: vi.fn().mockReturnValue({ where: firstWhere }),
        };
      }

      const secondWhere = vi.fn().mockResolvedValue([]);
      return {
        from: vi.fn().mockReturnValue({ where: secondWhere }),
      };
    });

    vi.mocked(canEdit).mockResolvedValue(true);

    // Mock update chain
    mockSet.mockReturnValue({ where: vi.fn() });
    mockUpdate.mockReturnValue({ set: mockSet });
  });

  it("should update post and replace artist relations", async () => {
    const formData = new FormData();
    formData.append("title", "Updated Post");
    formData.append("slug", "updated-post");
    formData.append("category", "EDM");
    formData.append("excerpt", "Updated excerpt");
    formData.append("content", "{}");
    formData.append("status", "published");
    formData.append("isCoverStory", "false");
    formData.append("artistIds", "2,3"); // Comma-separated string

    // Mock delete for postArtists
    const mockDeleteWhere = vi.fn();
    mockDelete.mockReturnValue({ where: mockDeleteWhere });
    mockDeleteWhere.mockResolvedValue(undefined);

    // Mock insert for new postArtists
    const mockPostArtistsInsert = vi
      .fn()
      .mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
    mockInsert.mockReturnValue(mockPostArtistsInsert());

    await updatePost(1, formData);

    expect(mockUpdate).toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalled(); // Should delete old postArtists
    expect(mockInsert).toHaveBeenCalled(); // Should insert new postArtists
  });

  it("should remove all artists if empty artistIds", async () => {
    const formData = new FormData();
    formData.append("title", "Updated Post");
    formData.append("slug", "updated-post");
    formData.append("category", "EDM");
    formData.append("excerpt", "Updated excerpt");
    formData.append("content", "{}");
    formData.append("status", "published");
    formData.append("isCoverStory", "false");
    // Don't append artistIds at all, or append empty string

    const mockDeleteWhere = vi.fn();
    mockDelete.mockReturnValue({ where: mockDeleteWhere });
    mockDeleteWhere.mockResolvedValue(undefined);

    await updatePost(1, formData);

    expect(mockDelete).toHaveBeenCalled(); // Should delete old postArtists
    expect(mockInsert).not.toHaveBeenCalled(); // Should not insert new postArtists
  });

  it("should throw error if post not found", async () => {
    mockSelect.mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }));

    const formData = new FormData();
    formData.append("title", "Updated Post");
    formData.append("slug", "updated-post");
    formData.append("category", "EDM");
    formData.append("excerpt", "Updated excerpt");
    formData.append("content", "{}");
    formData.append("status", "published");
    formData.append("isCoverStory", "false");

    await expect(updatePost(1, formData)).rejects.toThrow("Post not found");
  });

  it("should throw error if not authorized", async () => {
    vi.mocked(canEdit).mockResolvedValue(false);

    const formData = new FormData();
    formData.append("title", "Updated Post");
    formData.append("slug", "updated-post");
    formData.append("category", "EDM");
    formData.append("excerpt", "Updated excerpt");
    formData.append("content", "{}");
    formData.append("status", "published");
    formData.append("isCoverStory", "false");

    await expect(updatePost(1, formData)).rejects.toThrow("Unauthorized");
  });
});

describe("deletePost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const userId = "user_test123";
    vi.mocked(auth).mockResolvedValue({ userId } as any);
    vi.mocked(canDelete).mockResolvedValue(true);

    const mockSelectLimit = vi.fn().mockResolvedValue([{ status: "published" }]);
    const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit });
    const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
    // First select call in deletePost: post status lookup with limit()
    // Second select call in deletePost: postArtists lookup resolved directly
    let selectCallCount = 0;
    mockSelect.mockImplementation(() => {
      selectCallCount += 1;
      if (selectCallCount === 1) {
        return { from: mockSelectFrom };
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      };
    });

    const mockDeleteWhere = vi.fn();
    mockDelete.mockReturnValue({ where: mockDeleteWhere });
    mockDeleteWhere.mockResolvedValue(undefined);
  });

  it("should delete post", async () => {
    await deletePost(1);

    expect(mockDelete).toHaveBeenCalled();
  });

  it("should redirect if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    await deletePost(1);

    expect(redirect).toHaveBeenCalledWith("/sign-in");
  });

  it("should throw error if not authorized", async () => {
    vi.mocked(canDelete).mockResolvedValue(false);

    await expect(deletePost(1)).rejects.toThrow("Unauthorized");
  });
});

describe("requestDeletePost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const userId = "user_test123";
    vi.mocked(auth).mockResolvedValue({ userId } as any);

    mockLimit.mockResolvedValue([
      {
        id: 1,
        authorId: userId,
      },
    ]);
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockSelect.mockReturnValue({ from: mockFrom });

    mockSet.mockReturnValue({ where: vi.fn() });
    mockUpdate.mockReturnValue({ set: mockSet });
  });

  it("should request deletion for writer own post", async () => {
    vi.mocked(canEdit).mockResolvedValue(true);
    vi.mocked(canDelete).mockResolvedValue(false); // Not super admin

    await requestDeletePost(1);

    expect(mockUpdate).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        deleteRequested: true,
      })
    );
  });

  it("should delete directly if super admin", async () => {
    vi.mocked(canEdit).mockResolvedValue(true);
    vi.mocked(canDelete).mockResolvedValue(true); // Super admin

    const mockDeleteWhere = vi.fn();
    mockDelete.mockReturnValue({ where: mockDeleteWhere });
    mockDeleteWhere.mockResolvedValue(undefined);

    await requestDeletePost(1);

    expect(mockDelete).toHaveBeenCalled(); // Should delete directly
    expect(mockUpdate).not.toHaveBeenCalled(); // Should not request deletion
  });

  it("should throw error if not authorized to edit", async () => {
    vi.mocked(canEdit).mockResolvedValue(false);

    await expect(requestDeletePost(1)).rejects.toThrow("Unauthorized");
  });

  it("should throw error if post not owned by writer", async () => {
    mockLimit.mockResolvedValue([
      {
        id: 1,
        authorId: "other_user",
      },
    ]);
    vi.mocked(canEdit).mockResolvedValue(false); // Can't edit other's post

    await expect(requestDeletePost(1)).rejects.toThrow("Unauthorized");
  });
});

describe("approveDeletePost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const userId = "user_test123";
    vi.mocked(auth).mockResolvedValue({ userId } as any);
    vi.mocked(canDelete).mockResolvedValue(true);

    const mockDeleteWhere = vi.fn();
    mockDelete.mockReturnValue({ where: mockDeleteWhere });
    mockDeleteWhere.mockResolvedValue(undefined);
  });

  it("should approve and delete post", async () => {
    await approveDeletePost(1);

    expect(mockDelete).toHaveBeenCalled();
  });

  it("should throw error if not super admin", async () => {
    vi.mocked(canDelete).mockResolvedValue(false);

    await expect(approveDeletePost(1)).rejects.toThrow("Unauthorized");
  });
});

describe("denyDeletePost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const userId = "user_test123";
    vi.mocked(auth).mockResolvedValue({ userId } as any);
    vi.mocked(canDelete).mockResolvedValue(true);

    mockSet.mockReturnValue({ where: vi.fn() });
    mockUpdate.mockReturnValue({ set: mockSet });
  });

  it("should deny and clear delete request", async () => {
    await denyDeletePost(1);

    expect(mockUpdate).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        deleteRequested: false,
        deleteRequestedAt: null,
      })
    );
  });

  it("should throw error if not super admin", async () => {
    vi.mocked(canDelete).mockResolvedValue(false);

    await expect(denyDeletePost(1)).rejects.toThrow("Unauthorized");
  });
});
