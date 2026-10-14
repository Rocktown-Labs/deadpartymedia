import { checkRole } from "@/lib/auth/roles";

// Mock Clerk auth
vi.mock<typeof import("@clerk/nextjs/server")>(import("@clerk/nextjs/server"), () => ({
  auth: Object.assign(vi.fn(), { protect: vi.fn() }),
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

  it("should return true when role is in metadata.roles array", async () => {
    const { auth } = await import("@clerk/nextjs/server");
    vi.mocked(auth).mockResolvedValue({
      sessionClaims: {
        metadata: {
          roles: ["artmaker", "writer"],
        },
      },
    } as any);

    expect(await checkRole("writer")).toBeTruthy();
    expect(await checkRole("super_admin")).toBeFalsy();
  });

  it("should recognize legacy admin alias as super_admin", async () => {
    const { auth } = await import("@clerk/nextjs/server");
    vi.mocked(auth).mockResolvedValue({
      sessionClaims: {
        metadata: {
          role: "admin",
        },
      },
    } as any);

    expect(await checkRole("super_admin")).toBeTruthy();
  });

  it("should not treat arts_writer as music writer", async () => {
    const { auth } = await import("@clerk/nextjs/server");
    vi.mocked(auth).mockResolvedValue({
      sessionClaims: {
        metadata: {
          role: "arts_writer",
        },
      },
    } as any);

    expect(await checkRole("writer")).toBeFalsy();
    expect(await checkRole("arts_writer")).toBeTruthy();
  });

  it("should not treat arts_admin as super_admin", async () => {
    const { auth } = await import("@clerk/nextjs/server");
    vi.mocked(auth).mockResolvedValue({
      sessionClaims: {
        metadata: {
          role: "arts_admin",
        },
      },
    } as any);

    expect(await checkRole("super_admin")).toBeFalsy();
    expect(await checkRole("arts_admin")).toBeTruthy();
  });
});
