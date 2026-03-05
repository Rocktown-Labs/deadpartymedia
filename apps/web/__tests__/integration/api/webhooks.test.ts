import { POST } from "@/app/api/webhooks/route";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { users } from "@/lib/db/schema";

const { mockDb, mockLogger, mockWithOperationContext } = vi.hoisted(() => ({
  mockDb: {
    delete: vi.fn(),
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  },
  mockLogger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
  mockWithOperationContext: vi.fn(),
}));

vi.mock<typeof import("@/lib/db")>(import("@/lib/db"), () => ({
  db: mockDb,
}));

vi.mock<typeof import("@clerk/nextjs/webhooks")>(import("@clerk/nextjs/webhooks"), () => ({
  verifyWebhook: vi.fn(),
}));

vi.mock<typeof import("@/lib/logger/middleware")>(import("@/lib/logger/middleware"), () => ({
  getRequestLogger: vi.fn(() => mockLogger),
}));

vi.mock<typeof import("@/lib/logger/sanitize")>(import("@/lib/logger/sanitize"), () => ({
  sanitizeError: vi.fn((error) => error),
}));

vi.mock<typeof import("@/lib/logger/context")>(import("@/lib/logger/context"), () => ({
  withOperationContext: mockWithOperationContext,
}));

describe("pOST /api/webhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWithOperationContext.mockReturnValue(mockLogger);
  });

  it("handles duplicate user.created delivery idempotently and returns 200", async () => {
    vi.mocked(verifyWebhook).mockResolvedValue({
      data: {
        email_addresses: [{ email_address: "writer@example.com", id: "email_1" }],
        first_name: "Jane",
        id: "user_123",
        image_url: "https://example.com/jane.png",
        last_name: "Writer",
        primary_email_address_id: "email_1",
        public_metadata: { onboardingComplete: true, role: "writer" },
      },
      type: "user.created",
    } as any);

    const onConflictDoUpdate = vi.fn().mockResolvedValue();
    const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
    mockDb.insert.mockReturnValue({ values });

    const response = await POST(
      new Request("http://localhost:3001/api/webhooks", {
        method: "POST",
      }) as any,
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toStrictEqual({ received: true });
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
    expect(onConflictDoUpdate).toHaveBeenCalledTimes(1);
    expect(onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        set: expect.objectContaining({
          email: "writer@example.com",
          firstName: "Jane",
          imageUrl: "https://example.com/jane.png",
          lastName: "Writer",
          onboardingComplete: true,
          role: "writer",
          updatedAt: expect.any(Date),
        }),
        target: users.clerkId,
      }),
    );
  });

  it("returns 400 when user.created has no primary email", async () => {
    vi.mocked(verifyWebhook).mockResolvedValue({
      data: {
        email_addresses: [],
        first_name: "No",
        id: "user_456",
        image_url: null,
        last_name: "Email",
        primary_email_address_id: "missing",
        public_metadata: {},
      },
      type: "user.created",
    } as any);

    const response = await POST(
      new Request("http://localhost:3001/api/webhooks", {
        method: "POST",
      }) as any,
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("No primary email found");
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("handles user.updated idempotently with upsert and returns 200", async () => {
    vi.mocked(verifyWebhook).mockResolvedValue({
      data: {
        email_addresses: [{ email_address: "artist@example.com", id: "email_2" }],
        first_name: "Alex",
        id: "user_789",
        image_url: "https://example.com/alex.png",
        last_name: "Artist",
        primary_email_address_id: "email_2",
        public_metadata: { onboardingComplete: true, role: "artist" },
      },
      type: "user.updated",
    } as any);

    const onConflictDoUpdate = vi.fn().mockResolvedValue();
    const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
    mockDb.insert.mockReturnValue({ values });

    const response = await POST(
      new Request("http://localhost:3001/api/webhooks", {
        method: "POST",
      }) as any,
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toStrictEqual({ received: true });
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
    expect(onConflictDoUpdate).toHaveBeenCalledTimes(1);
    expect(onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        set: expect.objectContaining({
          email: "artist@example.com",
          firstName: "Alex",
          imageUrl: "https://example.com/alex.png",
          lastName: "Artist",
          onboardingComplete: true,
          role: "artist",
          updatedAt: expect.any(Date),
        }),
        target: users.clerkId,
      }),
    );
  });

  it("remaps placeholder local profile on invite-linked user.updated webhook", async () => {
    vi.mocked(verifyWebhook).mockResolvedValue({
      data: {
        email_addresses: [{ email_address: "writer.remapped@example.com", id: "email_3" }],
        first_name: "Remapped",
        id: "user_real_123",
        image_url: "https://example.com/remapped.png",
        last_name: "Writer",
        primary_email_address_id: "email_3",
        public_metadata: {
          localUserProfileId: "99",
          onboardingComplete: true,
          role: "writer",
        },
      },
      type: "user.updated",
    } as any);

    const selectLimit = vi.fn().mockResolvedValue([
      {
        clerkId: "local_placeholder:remapped-99",
        id: 99,
        onboardingComplete: true,
        role: "writer",
      },
    ]);
    const selectWhere = vi.fn().mockReturnValue({ limit: selectLimit });
    const selectFrom = vi.fn().mockReturnValue({ where: selectWhere });
    mockDb.select.mockReturnValue({ from: selectFrom });

    const updateWhere = vi.fn().mockResolvedValue();
    const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
    mockDb.update.mockReturnValue({ set: updateSet });

    const deleteWhere = vi.fn().mockResolvedValue();
    mockDb.delete.mockReturnValue({ where: deleteWhere });

    const onConflictDoUpdate = vi.fn().mockResolvedValue();
    const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
    mockDb.insert.mockReturnValue({ values });

    const response = await POST(
      new Request("http://localhost:3001/api/webhooks", {
        method: "POST",
      }) as any,
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toStrictEqual({ received: true });
    expect(mockDb.update).toHaveBeenCalledTimes(1);
    expect(mockDb.delete).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        clerkId: "user_real_123",
        onboardingComplete: true,
        role: "writer",
      }),
    );
  });
});
