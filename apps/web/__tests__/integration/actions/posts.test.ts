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
vi.mock<typeof import("@clerk/nextjs/server")>(import("@clerk/nextjs/server"), () => ({
  auth: Object.assign(vi.fn(), { protect: vi.fn() }),
}));

vi.mock<typeof import("next/navigation")>(import("next/navigation"), () => ({
  redirect: vi.fn(),
}));

vi.mock<typeof import("next/cache")>(import("next/cache"), () => ({
  // Mock to not throw
  revalidatePath: vi.fn(() => {}),
  revalidateTag: vi.fn(() => {}),
}));

vi.mock<typeof import("@/lib/auth/access")>(import("@/lib/auth/access"), () => ({
  canCreate: vi.fn(),
  canDelete: vi.fn(),
  canEdit: vi.fn(),
}));

vi.mock<typeof import("@/lib/utils/slug")>(import("@/lib/utils/slug"), () => ({
  ensureUniqueSlug: vi.fn(async (slug: string, _id?: number, _table?: string) => slug),
  generateSlug: vi.fn((name: string) => name.toLowerCase().replaceAll(/\s+/g, "-")),
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
} = vi.hoisted(() => ({
  mockDelete: vi.fn(),
  mockFrom: vi.fn(),
  mockInsert: vi.fn(),
  mockLimit: vi.fn(),
  mockReturning: vi.fn(),
  mockSelect: vi.fn(),
  mockSet: vi.fn(),
  mockUpdate: vi.fn(),
  mockValues: vi.fn(),
  mockWhere: vi.fn(),
}));

vi.mock<typeof import("@/lib/db")>(import("@/lib/db"), () => ({
  db: {
    delete: mockDelete,
    insert: mockInsert,
    select: mockSelect,
    update: mockUpdate,
  },
}));

describe(createPost, () => {
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
    // Comma-separated string as sent by post-editor
    formData.append("artistIds", "1,2");

    // Mock post insert - rely on call order instead of table identity (table is an object)

    // Chain: insert() -> { values } -> values() -> { returning } -> returning() -> Promise

    let insertCallCount = 0;
    mockInsert.mockImplementation(() => {
      insertCallCount++;
      if (insertCallCount === 1) {
        const mockPostReturning = vi.fn().mockResolvedValue([{ id: 1, slug: "test-post" }]);
        return {
          values: vi.fn().mockReturnValue({
            returning: mockPostReturning,
          }),
        };
      }
      // Subsequent calls (postArtists) don't use returning()

      return { values: vi.fn().mockResolvedValue(null) };
    });

    await createPost(formData);

    // Once for post, once for postArtists.
    expect(mockInsert).toHaveBeenCalledTimes(2);
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

    const mockPostInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 1 }]),
      }),
    });
    mockInsert.mockReturnValue(mockPostInsert());

    await createPost(formData);

    expect(mockInsert).toHaveBeenCalledTimes(1);
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

describe(updatePost, () => {
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
              authorId: userId,
              id: 1,
              isCoverStory: false,
              publishedAt: null,
              status: "published",
              title: "Existing Post",
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
    // Comma-separated string
    formData.append("artistIds", "2,3");

    // Mock delete for postArtists

    const mockDeleteWhere = vi.fn();
    mockDelete.mockReturnValue({ where: mockDeleteWhere });
    mockDeleteWhere.mockResolvedValue(null);

    // Mock insert for new postArtists

    const mockPostArtistsInsert = vi
      .fn()
      .mockReturnValue({ values: vi.fn().mockResolvedValue(null) });
    mockInsert.mockReturnValue(mockPostArtistsInsert());

    await updatePost(1, formData);

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    // Should delete old postArtists
    expect(mockDelete).toHaveBeenCalledTimes(1);
    // Should insert new postArtists
    expect(mockInsert).toHaveBeenCalledTimes(1);
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
    mockDeleteWhere.mockResolvedValue(null);

    await updatePost(1, formData);

    // Should delete old postArtists
    expect(mockDelete).toHaveBeenCalledTimes(1);
    // Should not insert new postArtists
    expect(mockInsert).not.toHaveBeenCalled();
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

describe(deletePost, () => {
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
    mockDeleteWhere.mockResolvedValue(null);
  });

  it("should delete post", async () => {
    await deletePost(1);

    expect(mockDelete).toHaveBeenCalledTimes(1);
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

describe(requestDeletePost, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const userId = "user_test123";
    vi.mocked(auth).mockResolvedValue({ userId } as any);

    mockLimit.mockResolvedValue([
      {
        authorId: userId,
        id: 1,
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
    // Not super admin
    vi.mocked(canDelete).mockResolvedValue(false);

    await requestDeletePost(1);

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        deleteRequested: true,
      }),
    );
  });

  it("should delete directly if super admin", async () => {
    vi.mocked(canEdit).mockResolvedValue(true);
    // Super admin
    vi.mocked(canDelete).mockResolvedValue(true);

    const mockDeleteWhere = vi.fn();
    mockDelete.mockReturnValue({ where: mockDeleteWhere });
    mockDeleteWhere.mockResolvedValue(null);

    await requestDeletePost(1);

    // Should delete directly
    expect(mockDelete).toHaveBeenCalledTimes(1);
    // Should not request deletion
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("should throw error if not authorized to edit", async () => {
    vi.mocked(canEdit).mockResolvedValue(false);

    await expect(requestDeletePost(1)).rejects.toThrow("Unauthorized");
  });

  it("should throw error if post not owned by writer", async () => {
    mockLimit.mockResolvedValue([
      {
        authorId: "other_user",
        id: 1,
      },
    ]);
    // Can't edit other's post
    vi.mocked(canEdit).mockResolvedValue(false);

    await expect(requestDeletePost(1)).rejects.toThrow("Unauthorized");
  });
});

describe(approveDeletePost, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const userId = "user_test123";
    vi.mocked(auth).mockResolvedValue({ userId } as any);
    vi.mocked(canDelete).mockResolvedValue(true);

    const mockDeleteWhere = vi.fn();
    mockDelete.mockReturnValue({ where: mockDeleteWhere });
    mockDeleteWhere.mockResolvedValue(null);
  });

  it("should approve and delete post", async () => {
    await approveDeletePost(1);

    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it("should throw error if not super admin", async () => {
    vi.mocked(canDelete).mockResolvedValue(false);

    await expect(approveDeletePost(1)).rejects.toThrow("Unauthorized");
  });
});

describe(denyDeletePost, () => {
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

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        deleteRequested: false,
        deleteRequestedAt: null,
      }),
    );
  });

  it("should throw error if not super admin", async () => {
    vi.mocked(canDelete).mockResolvedValue(false);

    await expect(denyDeletePost(1)).rejects.toThrow("Unauthorized");
  });
});
