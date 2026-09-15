import { createVenue, updateVenue } from "@/app/admin/venues/actions";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

const mockAuth = vi.hoisted(() => vi.fn());
const mockCheckRole = vi.hoisted(() => vi.fn());
const mockInsert = vi.hoisted(() => vi.fn());
const mockSelect = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockValues = vi.hoisted(() => vi.fn());
const mockReturning = vi.hoisted(() => vi.fn());
const mockSet = vi.hoisted(() => vi.fn());
const mockWhere = vi.hoisted(() => vi.fn());
const mockLimit = vi.hoisted(() => vi.fn());
const mockEnsureUniqueSlug = vi.hoisted(() => vi.fn());
const mockGenerateSlug = vi.hoisted(() => vi.fn());

vi.mock<typeof import("@clerk/nextjs/server")>(import("@clerk/nextjs/server"), () => ({
  auth: mockAuth,
}));

vi.mock<typeof import("next/navigation")>(import("next/navigation"), () => ({
  redirect: vi.fn(),
}));

vi.mock<typeof import("next/cache")>(import("next/cache"), () => ({
  revalidatePath: vi.fn(),
}));

vi.mock<typeof import("@/lib/auth/roles")>(import("@/lib/auth/roles"), () => ({
  checkRole: mockCheckRole,
}));

vi.mock<typeof import("@/lib/db")>(import("@/lib/db"), () => ({
  db: {
    insert: mockInsert,
    select: mockSelect,
    update: mockUpdate,
  } as unknown as (typeof import("@/lib/db"))["db"],
}));

vi.mock<typeof import("@/lib/utils/slug")>(import("@/lib/utils/slug"), () => ({
  ensureUniqueSlug: mockEnsureUniqueSlug,
  generateSlug: mockGenerateSlug,
}));

vi.mock<typeof import("@/lib/logger")>(import("@/lib/logger"), () => ({
  logger: {
    error: vi.fn(),
  },
}));

function createFormData() {
  const formData = new FormData();
  formData.append("city", "Little Rock");
  formData.append("genres", "Punk, Metal");
  formData.append("name", "Test Venue");
  formData.append("state", "AR");
  return formData;
}

describe("venue actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: "user_test123" });
    mockCheckRole.mockImplementation(async (role: string) => role === "writer");
    mockGenerateSlug.mockReturnValue("test-venue");
    mockEnsureUniqueSlug.mockResolvedValue("test-venue");
    mockInsert.mockReturnValue({ values: mockValues });
    mockValues.mockReturnValue({ returning: mockReturning });
    mockReturning.mockResolvedValue([{ id: 42 }]);
  });

  it("persists genres when creating a venue", async () => {
    await createVenue(createFormData());

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        genres: "Punk, Metal",
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/admin/venues");
  });

  it("persists genres when updating a venue", async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: mockLimit,
        }),
      }),
    });
    mockLimit.mockResolvedValue([{ id: 42, slug: "test-venue" }]);
    mockUpdate.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: mockWhere });
    mockWhere.mockResolvedValue(undefined);

    await updateVenue(42, createFormData());

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        genres: "Punk, Metal",
      }),
    );
  });

  it("requires an authorized venue manager", async () => {
    mockCheckRole.mockResolvedValue(false);

    await expect(createVenue(createFormData())).rejects.toThrow("Unauthorized");
    expect(db.insert).not.toHaveBeenCalled();
  });
});
