import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { GET } from "@/app/api/auth/me/route";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    select: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  db: mockDb,
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  clerkClient: vi.fn(),
}));

function mockUserRoleQuery(rows: unknown[]) {
  mockDb.select.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(rows),
      }),
    }),
  });
}

function mockClerkUser(
  user: Partial<{
    fullName: string | null;
    firstName: string | null;
    imageUrl: string | null;
    primaryEmailAddressId: string | null;
    emailAddresses: Array<{ id: string; emailAddress: string }>;
  }> = {},
) {
  vi.mocked(clerkClient).mockResolvedValue({
    users: {
      getUser: vi.fn().mockResolvedValue({
        fullName: "Test User",
        firstName: "Test",
        imageUrl: "https://example.com/avatar.png",
        primaryEmailAddressId: "email_1",
        emailAddresses: [{ id: "email_1", emailAddress: "user@example.com" }],
        ...user,
      }),
    },
  } as any);
}

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: null,
      sessionClaims: null,
    } as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("prefers role from session claims over DB role", async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: "user_123",
      sessionClaims: { metadata: { role: "artist" } },
    } as any);
    mockUserRoleQuery([{ role: "fan" }]);
    mockClerkUser();

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.role).toBe("artist");
    expect(data).toMatchObject({
      id: "user_123",
      email: "user@example.com",
      name: "Test User",
    });
  });

  it("falls back to DB role when session claim role is unknown", async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: "user_123",
      sessionClaims: { metadata: { role: "legacy_role" } },
    } as any);
    mockUserRoleQuery([{ role: "writer" }]);
    mockClerkUser({
      fullName: null,
      firstName: "Writer",
      imageUrl: null,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.role).toBe("writer");
    expect(data.name).toBe("Writer");
    expect(data.avatar).toBeNull();
  });

  it('falls back to "fan" when neither session nor DB role is valid', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: "user_123",
      sessionClaims: { metadata: { role: "legacy_role" } },
    } as any);
    mockUserRoleQuery([]);
    mockClerkUser({
      primaryEmailAddressId: "missing_primary",
      emailAddresses: [{ id: "email_2", emailAddress: "fallback@example.com" }],
      fullName: null,
      firstName: null,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.role).toBe("fan");
    expect(data.email).toBe("fallback@example.com");
    expect(data.name).toBe("fallback@example.com");
  });
});
