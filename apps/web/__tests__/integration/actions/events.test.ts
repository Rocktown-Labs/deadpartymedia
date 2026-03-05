import { createEvent, updateEvent, deleteEvent } from "@/app/admin/events/actions";
import { redirect } from "next/navigation";
import { canCreate, canEdit, canDelete } from "@/lib/auth/access";

// Mock dependencies
const mockAuth = vi.hoisted(() => Object.assign(vi.fn(), { protect: vi.fn() }));

vi.mock<typeof import("@clerk/nextjs/server")>(import("@clerk/nextjs/server"), () => ({
  auth: mockAuth,
}));

vi.mock<typeof import("next/navigation")>(import("next/navigation"), () => ({
  redirect: vi.fn() as unknown as (typeof import("next/navigation"))["redirect"],
}));

vi.mock<typeof import("next/cache")>(import("next/cache"), () => ({
  revalidatePath: vi.fn(() => {}) as unknown as (typeof import("next/cache"))["revalidatePath"],
  revalidateTag: vi.fn(() => {}) as unknown as (typeof import("next/cache"))["revalidateTag"],
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

vi.mock<typeof import("@/lib/logger")>(import("@/lib/logger"), () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  } as unknown as (typeof import("@/lib/logger"))["logger"],
}));

vi.mock<typeof import("@/lib/logger/sanitize")>(import("@/lib/logger/sanitize"), () => ({
  sanitizeError: vi.fn((error) => error),
}));

// Mock database - hoist variables to avoid initialization errors
const { mockInsert, mockUpdate, mockDelete, mockSelect, mockValues, mockReturning, mockSet } =
  vi.hoisted(() => ({
    mockDelete: vi.fn(),
    mockInsert: vi.fn(),
    mockReturning: vi.fn(),
    mockSelect: vi.fn(),
    mockSet: vi.fn(),
    mockUpdate: vi.fn(),
    mockValues: vi.fn(),
  }));

vi.mock<typeof import("@/lib/db")>(import("@/lib/db"), () => ({
  db: {
    delete: mockDelete,
    insert: mockInsert,
    select: mockSelect,
    update: mockUpdate,
  } as unknown as (typeof import("@/lib/db"))["db"],
}));

describe(createEvent, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const userId = "user_test123";
    mockAuth.mockResolvedValue({ userId } as any);
    vi.mocked(canCreate).mockResolvedValue(true);

    // Set up insert chain

    mockValues.mockReturnValue({ returning: mockReturning });
    mockReturning.mockResolvedValue([{ id: 1, slug: "test-event" }]);
    mockInsert.mockReturnValue({ values: mockValues });
  });

  it("should create event with artist relations", async () => {
    const formData = new FormData();
    formData.append("title", "Test Event");
    formData.append("slug", "test-event");
    formData.append("description", "Test description");
    formData.append("venue", "Test Venue");
    formData.append("location", "Test Location");
    formData.append("date", "2024-01-01");
    formData.append("genre", "EDM");
    formData.append("status", "published");
    // Comma-separated string
    formData.append("artistIds", "1,2");

    // Mock event insert - rely on call order instead of table identity (table is an object)

    // Chain: insert() -> { values } -> values() -> { returning } -> returning() -> Promise

    let insertCallCount = 0;
    mockInsert.mockImplementation(() => {
      insertCallCount++;
      if (insertCallCount === 1) {
        const mockEventReturning = vi.fn().mockResolvedValue([{ id: 1, slug: "test-event" }]);
        return {
          values: vi.fn().mockReturnValue({
            returning: mockEventReturning,
          }),
        };
      }
      // Subsequent calls (eventArtists) don't use returning()

      return { values: vi.fn().mockResolvedValue(null) };
    });

    await createEvent(formData);

    expect(mockInsert).toHaveBeenCalledTimes(2);
    // Should insert eventArtists relations

    // Once for event, once for eventArtists
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it("should create event without artist relations", async () => {
    const formData = new FormData();
    formData.append("title", "Test Event");
    formData.append("slug", "test-event");
    formData.append("description", "Test description");
    formData.append("venue", "Test Venue");
    formData.append("location", "Test Location");
    formData.append("date", "2024-01-01");
    formData.append("genre", "EDM");
    formData.append("status", "published");

    // Mock event insert - need to return the chain properly

    const mockReturning = vi.fn().mockResolvedValue([{ id: 1, slug: "test-event" }]);
    const mockValuesForEvent = vi.fn().mockReturnValue({ returning: mockReturning });
    const mockEventInsert = vi.fn().mockReturnValue({ values: mockValuesForEvent });
    mockInsert.mockReturnValue(mockEventInsert());

    await createEvent(formData);

    expect(mockInsert).toHaveBeenCalledTimes(1);
    // Should only insert event, not eventArtists
  });

  it("should redirect if not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null } as any);

    const formData = new FormData();
    formData.append("title", "Test Event");
    formData.append("slug", "test-event");
    formData.append("description", "Test description");
    formData.append("venue", "Test Venue");
    formData.append("location", "Test Location");
    formData.append("date", "2024-01-01");
    formData.append("genre", "EDM");
    formData.append("status", "published");

    await createEvent(formData);

    expect(redirect).toHaveBeenCalledWith("/sign-in");
  });

  it("should throw error if not authorized", async () => {
    vi.mocked(canCreate).mockResolvedValue(false);

    const formData = new FormData();
    formData.append("title", "Test Event");
    formData.append("slug", "test-event");
    formData.append("description", "Test description");
    formData.append("venue", "Test Venue");
    formData.append("location", "Test Location");
    formData.append("date", "2024-01-01");
    formData.append("genre", "EDM");
    formData.append("status", "published");

    await expect(createEvent(formData)).rejects.toThrow("Unauthorized");
  });
});

describe(updateEvent, () => {
  let selectCallCount = 0;

  beforeEach(() => {
    vi.clearAllMocks();
    selectCallCount = 0;
    const userId = "user_test123";
    mockAuth.mockResolvedValue({ userId } as any);

    // First select call: event lookup with limit(1)

    // Second select call: existing eventArtists lookup returns rows directly

    mockSelect.mockImplementation(() => {
      selectCallCount += 1;
      if (selectCallCount === 1) {
        const firstWhere = vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              createdById: userId,
              id: 1,
              status: "published",
              title: "Existing Event",
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

  it("should update event and replace artist relations", async () => {
    const formData = new FormData();
    formData.append("title", "Updated Event");
    formData.append("slug", "updated-event");
    formData.append("description", "Updated description");
    formData.append("venue", "Updated Venue");
    formData.append("location", "Updated Location");
    formData.append("date", "2024-01-02");
    formData.append("genre", "EDM");
    formData.append("status", "published");
    // Comma-separated string
    formData.append("artistIds", "2,3");

    // Mock delete for eventArtists

    const mockDeleteWhere = vi.fn();
    mockDelete.mockReturnValue({ where: mockDeleteWhere });
    mockDeleteWhere.mockResolvedValue(null);

    // Mock insert for new eventArtists

    const mockEventArtistsInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(null),
    });
    mockInsert.mockReturnValue(mockEventArtistsInsert());

    await updateEvent(1, formData);

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    // Should delete old eventArtists
    expect(mockDelete).toHaveBeenCalledTimes(1);
    // Should insert new eventArtists
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it("should remove all artists if empty artistIds", async () => {
    const formData = new FormData();
    formData.append("title", "Updated Event");
    formData.append("slug", "updated-event");
    formData.append("description", "Updated description");
    formData.append("venue", "Updated Venue");
    formData.append("location", "Updated Location");
    formData.append("date", "2024-01-02");
    formData.append("genre", "EDM");
    formData.append("status", "published");
    // Don't append artistIds

    const mockDeleteWhere = vi.fn();
    mockDelete.mockReturnValue({ where: mockDeleteWhere });
    mockDeleteWhere.mockResolvedValue(null);

    await updateEvent(1, formData);

    // Should delete old eventArtists
    expect(mockDelete).toHaveBeenCalledTimes(1);
    // Should not insert new eventArtists
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("should throw error if event not found", async () => {
    mockSelect.mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }));

    const formData = new FormData();
    formData.append("title", "Updated Event");
    formData.append("slug", "updated-event");
    formData.append("description", "Updated description");
    formData.append("venue", "Updated Venue");
    formData.append("location", "Updated Location");
    formData.append("date", "2024-01-02");
    formData.append("genre", "EDM");
    formData.append("status", "published");

    await expect(updateEvent(1, formData)).rejects.toThrow("Event not found");
  });

  it("should throw error if not authorized", async () => {
    vi.mocked(canEdit).mockResolvedValue(false);

    const formData = new FormData();
    formData.append("title", "Updated Event");
    formData.append("slug", "updated-event");
    formData.append("description", "Updated description");
    formData.append("venue", "Updated Venue");
    formData.append("location", "Updated Location");
    formData.append("date", "2024-01-02");
    formData.append("genre", "EDM");
    formData.append("status", "published");

    await expect(updateEvent(1, formData)).rejects.toThrow("Unauthorized");
  });
});

describe(deleteEvent, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const userId = "user_test123";
    mockAuth.mockResolvedValue({ userId } as any);
    vi.mocked(canDelete).mockResolvedValue(true);

    const mockSelectLimit = vi.fn().mockResolvedValue([{ status: "published" }]);
    const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit });
    const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
    // First select call in deleteEvent: event status lookup with limit()

    // Second select call in deleteEvent: eventArtists lookup resolved directly

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

  it("should delete event", async () => {
    await deleteEvent(1);

    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it("should redirect if not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null } as any);

    await deleteEvent(1);

    expect(redirect).toHaveBeenCalledWith("/sign-in");
  });

  it("should throw error if not authorized", async () => {
    vi.mocked(canDelete).mockResolvedValue(false);

    await expect(deleteEvent(1)).rejects.toThrow("Unauthorized");
  });
});
