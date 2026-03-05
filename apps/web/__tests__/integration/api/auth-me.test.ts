import { auth, clerkClient } from "@clerk/nextjs/server";
import { GET } from "@/app/api/auth/me/route";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    select: vi.fn(),
  },
}));

vi.mock<typeof import("@/lib/db")>(import("@/lib/db"), () => ({
  db: mockDb,
}));

vi.mock<typeof import("@clerk/nextjs/server")>(import("@clerk/nextjs/server"), () => ({
  auth: Object.assign(vi.fn(), { protect: vi.fn() }),
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
    emailAddresses: { id: string; emailAddress: string }[];
  }> = {},
) {
  vi.mocked(clerkClient).mockResolvedValue({
    users: {
      getUser: vi.fn().mockResolvedValue({
        emailAddresses: [{ emailAddress: "user@example.com", id: "email_1" }],
        firstName: "Test",
        fullName: "Test User",
        imageUrl: "https://example.com/avatar.png",
        primaryEmailAddressId: "email_1",
        ...user,
      }),
    },
  } as any);
}

describe("gET /api/auth/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({
      sessionClaims: null,
      userId: null,
    } as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("prefers role from session claims over DB role", async () => {
    vi.mocked(auth).mockResolvedValue({
      sessionClaims: { metadata: { role: "artist" } },
      userId: "user_123",
    } as any);
    mockUserRoleQuery([{ role: "fan" }]);
    mockClerkUser();

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.role).toBe("artist");
    expect(data).toMatchObject({
      email: "user@example.com",
      id: "user_123",
      name: "Test User",
    });
  });

  it("falls back to DB role when session claim role is unknown", async () => {
    vi.mocked(auth).mockResolvedValue({
      sessionClaims: { metadata: { role: "legacy_role" } },
      userId: "user_123",
    } as any);
    mockUserRoleQuery([{ role: "writer" }]);
    mockClerkUser({
      firstName: "Writer",
      fullName: null,
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
      sessionClaims: { metadata: { role: "legacy_role" } },
      userId: "user_123",
    } as any);
    mockUserRoleQuery([]);
    mockClerkUser({
      emailAddresses: [{ emailAddress: "fallback@example.com", id: "email_2" }],
      firstName: null,
      fullName: null,
      primaryEmailAddressId: "missing_primary",
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.role).toBe("fan");
    expect(data.email).toBe("fallback@example.com");
    expect(data.name).toBe("fallback@example.com");
  });
});
