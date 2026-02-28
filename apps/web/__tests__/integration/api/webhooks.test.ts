import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/webhooks/route";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { users } from "@/lib/db/schema";

const { mockDb, mockLogger, mockWithOperationContext } = vi.hoisted(() => ({
  mockDb: {
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    select: vi.fn(),
  },
  mockLogger: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
  mockWithOperationContext: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: mockDb,
}));

vi.mock("@clerk/nextjs/webhooks", () => ({
  verifyWebhook: vi.fn(),
}));

vi.mock("@/lib/logger/middleware", () => ({
  getRequestLogger: vi.fn(() => mockLogger),
}));

vi.mock("@/lib/logger/sanitize", () => ({
  sanitizeError: vi.fn((error) => error),
}));

vi.mock("@/lib/logger/context", () => ({
  withOperationContext: mockWithOperationContext,
}));

describe("POST /api/webhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWithOperationContext.mockReturnValue(mockLogger);
  });

  it("handles duplicate user.created delivery idempotently and returns 200", async () => {
    vi.mocked(verifyWebhook).mockResolvedValue({
      type: "user.created",
      data: {
        id: "user_123",
        email_addresses: [{ id: "email_1", email_address: "writer@example.com" }],
        primary_email_address_id: "email_1",
        first_name: "Jane",
        last_name: "Writer",
        image_url: "https://example.com/jane.png",
        public_metadata: { role: "writer", onboardingComplete: true },
      },
    } as any);

    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
    mockDb.insert.mockReturnValue({ values });

    const response = await POST(new Request("http://localhost:3001/api/webhooks", {
      method: "POST",
    }) as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ received: true });
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
    expect(onConflictDoUpdate).toHaveBeenCalledTimes(1);
    expect(onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        target: users.clerkId,
        set: expect.objectContaining({
          email: "writer@example.com",
          firstName: "Jane",
          lastName: "Writer",
          imageUrl: "https://example.com/jane.png",
          role: "writer",
          onboardingComplete: true,
          updatedAt: expect.any(Date),
        }),
      }),
    );
  });

  it("returns 400 when user.created has no primary email", async () => {
    vi.mocked(verifyWebhook).mockResolvedValue({
      type: "user.created",
      data: {
        id: "user_456",
        email_addresses: [],
        primary_email_address_id: "missing",
        first_name: "No",
        last_name: "Email",
        image_url: null,
        public_metadata: {},
      },
    } as any);

    const response = await POST(new Request("http://localhost:3001/api/webhooks", {
      method: "POST",
    }) as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("No primary email found");
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("handles user.updated idempotently with upsert and returns 200", async () => {
    vi.mocked(verifyWebhook).mockResolvedValue({
      type: "user.updated",
      data: {
        id: "user_789",
        email_addresses: [{ id: "email_2", email_address: "artist@example.com" }],
        primary_email_address_id: "email_2",
        first_name: "Alex",
        last_name: "Artist",
        image_url: "https://example.com/alex.png",
        public_metadata: { role: "artist", onboardingComplete: true },
      },
    } as any);

    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
    mockDb.insert.mockReturnValue({ values });

    const response = await POST(
      new Request("http://localhost:3001/api/webhooks", {
        method: "POST",
      }) as any,
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ received: true });
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
    expect(onConflictDoUpdate).toHaveBeenCalledTimes(1);
    expect(onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        target: users.clerkId,
        set: expect.objectContaining({
          email: "artist@example.com",
          firstName: "Alex",
          lastName: "Artist",
          imageUrl: "https://example.com/alex.png",
          role: "artist",
          onboardingComplete: true,
          updatedAt: expect.any(Date),
        }),
      }),
    );
  });

  it("remaps placeholder local profile on invite-linked user.updated webhook", async () => {
    vi.mocked(verifyWebhook).mockResolvedValue({
      type: "user.updated",
      data: {
        id: "user_real_123",
        email_addresses: [{ id: "email_3", email_address: "writer.remapped@example.com" }],
        primary_email_address_id: "email_3",
        first_name: "Remapped",
        last_name: "Writer",
        image_url: "https://example.com/remapped.png",
        public_metadata: {
          role: "writer",
          onboardingComplete: true,
          localUserProfileId: "99",
        },
      },
    } as any);

    const selectLimit = vi.fn().mockResolvedValue([
      {
        id: 99,
        clerkId: "local_placeholder:remapped-99",
        role: "writer",
        onboardingComplete: true,
      },
    ]);
    const selectWhere = vi.fn().mockReturnValue({ limit: selectLimit });
    const selectFrom = vi.fn().mockReturnValue({ where: selectWhere });
    mockDb.select.mockReturnValue({ from: selectFrom });

    const updateWhere = vi.fn().mockResolvedValue(undefined);
    const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
    mockDb.update.mockReturnValue({ set: updateSet });

    const deleteWhere = vi.fn().mockResolvedValue(undefined);
    mockDb.delete.mockReturnValue({ where: deleteWhere });

    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
    mockDb.insert.mockReturnValue({ values });

    const response = await POST(
      new Request("http://localhost:3001/api/webhooks", {
        method: "POST",
      }) as any,
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ received: true });
    expect(mockDb.update).toHaveBeenCalledTimes(1);
    expect(mockDb.delete).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        clerkId: "user_real_123",
        role: "writer",
        onboardingComplete: true,
      }),
    );
  });
});
