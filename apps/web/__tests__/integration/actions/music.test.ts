import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import {
  createMusicRelease,
  updateMusicRelease,
  deleteMusicRelease,
} from "@/app/admin/music/actions";
import { canCreate, canEdit, canDelete } from "@/lib/auth/access";

// Mock auth
const mockAuth = vi.hoisted(() => Object.assign(vi.fn(), { protect: vi.fn() }));
vi.mock<typeof import("@clerk/nextjs/server")>(import("@clerk/nextjs/server"), () => ({
  auth: mockAuth,
}));

vi.mock<typeof import("next/navigation")>(import("next/navigation"), () => ({
  redirect: vi.fn() as unknown as (typeof import("next/navigation"))["redirect"],
}));

vi.mock<typeof import("next/cache")>(import("next/cache"), () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock<typeof import("@/lib/auth/access")>(import("@/lib/auth/access"), () => ({
  canCreate: vi.fn(),
  canDelete: vi.fn(),
  canEdit: vi.fn(),
}));

vi.mock<typeof import("@/lib/utils/slug")>(import("@/lib/utils/slug"), () => ({
  ensureUniqueSlug: vi.fn(async (slug: string) => slug),
  generateSlug: vi.fn((name: string) => name.toLowerCase().replaceAll(/\s+/g, "-")),
}));

const {
  mockInsert,
  mockUpdate,
  mockDelete,
  mockSelect,
  mockValues,
  mockReturning,
  mockSet,
  mockWhere,
  mockLimit,
} = vi.hoisted(() => ({
  mockDelete: vi.fn(),
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
  } as unknown as (typeof import("@/lib/db"))["db"],
}));

describe("Music Release Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockAuth.mockResolvedValue({ userId: "user_test123" });
    vi.mocked(canCreate).mockResolvedValue(true);
    vi.mocked(canEdit).mockResolvedValue(true);
    vi.mocked(canDelete).mockResolvedValue(true);

    mockInsert.mockReturnValue({ values: mockValues });
    mockValues.mockReturnValue({ returning: mockReturning });
    mockReturning.mockResolvedValue([{ id: 1, slug: "silver-tears-telepathic-high" }]);

    mockSelect.mockReturnValue({ from: vi.fn().mockReturnValue({ where: mockWhere }) });
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockLimit.mockResolvedValue([
      { authorId: "user_test123", id: 1, slug: "telepathic-high", title: "Telepathic High" },
    ]);

    mockUpdate.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: vi.fn().mockResolvedValue([{ id: 1 }]) });
    mockDelete.mockReturnValue({ where: vi.fn().mockResolvedValue([{ id: 1 }]) });
  });

  it("creates a music release successfully", async () => {
    const formData = new FormData();
    formData.append("title", "Telepathic High");
    formData.append("artistName", "The Silver Tears");
    formData.append("releaseType", "Album");
    formData.append("genre", "HARDCORE & ROCK");
    formData.append("excerpt", "Great debut record");
    formData.append("status", "published");

    const result = await createMusicRelease(formData);
    expect(result).toHaveProperty("releaseId", 1);
    expect(mockInsert).toHaveBeenCalled();
  });

  it("updates a music release successfully", async () => {
    const formData = new FormData();
    formData.append("title", "Telepathic High Updated");
    formData.append("artistName", "The Silver Tears");
    formData.append("releaseType", "Album");
    formData.append("genre", "HARDCORE & ROCK");
    formData.append("excerpt", "Updated excerpt");
    formData.append("status", "published");

    const result = await updateMusicRelease(1, formData);
    expect(result).toHaveProperty("redirectUrl", "/admin/music");
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("deletes a music release successfully", async () => {
    const result = await deleteMusicRelease(1);
    expect(result).toHaveProperty("success", true);
    expect(mockDelete).toHaveBeenCalled();
  });
});
