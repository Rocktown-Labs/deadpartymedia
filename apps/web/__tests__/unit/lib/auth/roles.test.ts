import { checkRole } from "@/lib/auth/roles";

// Mock Clerk auth
vi.mock<typeof import("@clerk/nextjs/server")>(import("@clerk/nextjs/server"), () => ({
  auth: vi.fn(),
}));

describe(checkRole, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return true when user has matching role", async () => {
    const { auth } = await import("@clerk/nextjs/server");
    vi.mocked(auth).mockResolvedValue({
      sessionClaims: {
        metadata: {
          role: "super_admin",
        },
      },
    } as any);

    const result = await checkRole("super_admin");
    expect(result).toBeTruthy();
  });

  it("should return false when user has different role", async () => {
    const { auth } = await import("@clerk/nextjs/server");
    vi.mocked(auth).mockResolvedValue({
      sessionClaims: {
        metadata: {
          role: "fan",
        },
      },
    } as any);

    const result = await checkRole("super_admin");
    expect(result).toBeFalsy();
  });

  it("should return false when user has no role", async () => {
    const { auth } = await import("@clerk/nextjs/server");
    vi.mocked(auth).mockResolvedValue({
      sessionClaims: {
        metadata: {},
      },
    } as any);

    const result = await checkRole("super_admin");
    expect(result).toBeFalsy();
  });

  it("should return false when sessionClaims is missing", async () => {
    const { auth } = await import("@clerk/nextjs/server");
    vi.mocked(auth).mockResolvedValue({
      sessionClaims: null,
    } as any);

    const result = await checkRole("super_admin");
    expect(result).toBeFalsy();
  });

  it("should return false when metadata is missing", async () => {
    const { auth } = await import("@clerk/nextjs/server");
    vi.mocked(auth).mockResolvedValue({
      sessionClaims: {},
    } as any);

    const result = await checkRole("super_admin");
    expect(result).toBeFalsy();
  });
});
