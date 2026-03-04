import {
  canViewAll,
  canEdit,
  canDelete,
  canCreate,
  canInviteWriters,
  canManageUsers,
} from "@/lib/auth/access";
import { checkRole } from "@/lib/auth/roles";
import { auth } from "@clerk/nextjs/server";

// Mock dependencies
vi.mock<typeof import("@/lib/auth/roles")>(import("@/lib/auth/roles"), () => ({
  checkRole: vi.fn(),
}));

vi.mock<typeof import("@clerk/nextjs/server")>(import("@clerk/nextjs/server"), () => ({
  auth: vi.fn(),
}));

describe(canViewAll, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return true for super_admin", async () => {
    vi.mocked(checkRole).mockResolvedValue(true);
    const result = await canViewAll();
    expect(result).toBeTruthy();
    expect(checkRole).toHaveBeenCalledWith("super_admin");
  });

  it("should return false for non-super_admin", async () => {
    vi.mocked(checkRole).mockResolvedValue(false);
    const result = await canViewAll();
    expect(result).toBeFalsy();
  });
});

describe(canEdit, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return true for super_admin regardless of resource owner", async () => {
    vi.mocked(checkRole).mockResolvedValue(true);
    vi.mocked(auth).mockResolvedValue({ userId: "user1" } as any);

    const result = await canEdit("user2");
    expect(result).toBeTruthy();
  });

  it("should return true when user is resource owner", async () => {
    vi.mocked(checkRole).mockResolvedValue(false);
    vi.mocked(auth).mockResolvedValue({ userId: "user1" } as any);

    const result = await canEdit("user1");
    expect(result).toBeTruthy();
  });

  it("should return false when user is not owner and not super_admin", async () => {
    vi.mocked(checkRole).mockResolvedValue(false);
    vi.mocked(auth).mockResolvedValue({ userId: "user1" } as any);

    const result = await canEdit("user2");
    expect(result).toBeFalsy();
  });

  it("should return false when user is not authenticated", async () => {
    vi.mocked(checkRole).mockResolvedValue(false);
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    const result = await canEdit("user1");
    expect(result).toBeFalsy();
  });
});

describe(canDelete, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return true for super_admin", async () => {
    vi.mocked(checkRole).mockResolvedValue(true);
    const result = await canDelete();
    expect(result).toBeTruthy();
    expect(checkRole).toHaveBeenCalledWith("super_admin");
  });

  it("should return false for non-super_admin", async () => {
    vi.mocked(checkRole).mockResolvedValue(false);
    const result = await canDelete();
    expect(result).toBeFalsy();
  });
});

describe(canCreate, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return true for super_admin", async () => {
    vi.mocked(checkRole)
      .mockResolvedValueOnce(true) // super_admin check
      .mockResolvedValueOnce(false); // writer check

    const result = await canCreate();
    expect(result).toBeTruthy();
  });

  it("should return true for writer", async () => {
    vi.mocked(checkRole)
      .mockResolvedValueOnce(false) // super_admin check
      .mockResolvedValueOnce(true); // writer check

    const result = await canCreate();
    expect(result).toBeTruthy();
  });

  it("should return false for neither super_admin nor writer", async () => {
    vi.mocked(checkRole)
      .mockResolvedValueOnce(false) // super_admin check
      .mockResolvedValueOnce(false); // writer check

    const result = await canCreate();
    expect(result).toBeFalsy();
  });
});

describe(canInviteWriters, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return true for super_admin", async () => {
    vi.mocked(checkRole).mockResolvedValue(true);
    const result = await canInviteWriters();
    expect(result).toBeTruthy();
    expect(checkRole).toHaveBeenCalledWith("super_admin");
  });

  it("should return false for non-super_admin", async () => {
    vi.mocked(checkRole).mockResolvedValue(false);
    const result = await canInviteWriters();
    expect(result).toBeFalsy();
  });
});

describe(canManageUsers, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return true for super_admin", async () => {
    vi.mocked(checkRole).mockResolvedValue(true);
    const result = await canManageUsers();
    expect(result).toBeTruthy();
    expect(checkRole).toHaveBeenCalledWith("super_admin");
  });

  it("should return false for non-super_admin", async () => {
    vi.mocked(checkRole).mockResolvedValue(false);
    const result = await canManageUsers();
    expect(result).toBeFalsy();
  });
});
