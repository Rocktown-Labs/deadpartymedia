import { inviteUser, resendInvitation, revokeInvitation } from "@/app/admin/users/actions";
import { canManageUsers } from "@/lib/auth/access";

const {
  mockAuth,
  mockCreateInvitation,
  mockGetInvitationList,
  mockRevokeInvitation,
  mockClerkClient,
} = vi.hoisted(() => {
  const mockCreateInvitation = vi.fn();
  const mockGetInvitationList = vi.fn();
  const mockRevokeInvitation = vi.fn();
  return {
    mockAuth: vi.fn(),
    mockClerkClient: vi.fn(() => ({
      invitations: {
        createInvitation: mockCreateInvitation,
        getInvitationList: mockGetInvitationList,
        revokeInvitation: mockRevokeInvitation,
      },
    })),
    mockCreateInvitation,
    mockGetInvitationList,
    mockRevokeInvitation,
  };
});

vi.mock<typeof import("@clerk/nextjs/server")>(import("@clerk/nextjs/server"), () => ({
  auth: mockAuth,
  clerkClient: mockClerkClient,
}));

vi.mock<typeof import("next/cache")>(import("next/cache"), () => ({
  revalidatePath: vi.fn(() => {}) as unknown as (typeof import("next/cache"))["revalidatePath"],
}));

vi.mock<typeof import("next/navigation")>(import("next/navigation"), () => ({
  redirect: vi.fn() as unknown as (typeof import("next/navigation"))["redirect"],
}));

vi.mock<typeof import("@/lib/auth/access")>(import("@/lib/auth/access"), () => ({
  canManageUsers: vi.fn(),
}));

vi.mock<typeof import("@/lib/auth/user-state")>(import("@/lib/auth/user-state"), () => ({
  upsertUserAuthState: vi.fn(),
}));

vi.mock<typeof import("@/lib/db")>(import("@/lib/db"), () => ({
  db: {},
}));

describe("user invitation actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: "user_super_admin" });
    vi.mocked(canManageUsers).mockResolvedValue(true);
  });

  describe("inviteUser", () => {
    it("returns a plain serializable success payload after Clerk sends an invitation", async () => {
      class ClerkInvitation {
        id = "inv_test";
        emailAddress = "writer@example.com";
        url = "https://clerk.accounts.dev/sign-up?ticket=xyz";
      }

      mockCreateInvitation.mockResolvedValue(new ClerkInvitation());

      const result = await inviteUser("writer@example.com", "writer");

      expect(result).toStrictEqual({ success: true });
      expect("invitation" in result).toBeFalsy();
      expect(mockCreateInvitation).toHaveBeenCalledWith(
        expect.objectContaining({
          emailAddress: "writer@example.com",
          expiresInDays: 7,
          ignoreExisting: true,
          publicMetadata: expect.objectContaining({
            onboardingComplete: true,
            role: "writer",
          }),
        }),
      );
    });
  });

  describe("resendInvitation", () => {
    it("revokes existing pending invitation and creates a new one retaining role and metadata", async () => {
      mockGetInvitationList.mockResolvedValue({
        data: [
          {
            emailAddress: "deadpartyplaylist@gmail.com",
            id: "inv_123",
            publicMetadata: {
              localUserProfileId: "2",
              onboardingComplete: true,
              role: "super_admin",
            },
          },
        ],
        totalCount: 1,
      });

      mockRevokeInvitation.mockResolvedValue({ id: "inv_123", status: "revoked" });
      mockCreateInvitation.mockResolvedValue({
        id: "inv_456",
        url: "https://clerk.accounts.dev/sign-up?ticket=newticket",
      });

      const result = await resendInvitation("inv_123");

      expect(result).toStrictEqual({
        success: true,
        url: "https://clerk.accounts.dev/sign-up?ticket=newticket",
      });
      expect(mockRevokeInvitation).toHaveBeenCalledWith("inv_123");
      expect(mockCreateInvitation).toHaveBeenCalledWith(
        expect.objectContaining({
          emailAddress: "deadpartyplaylist@gmail.com",
          expiresInDays: 7,
          ignoreExisting: true,
          publicMetadata: {
            localUserProfileId: "2",
            onboardingComplete: true,
            role: "super_admin",
          },
        }),
      );
    });

    it("falls back to provided email if not found in pending list", async () => {
      mockGetInvitationList.mockResolvedValue({
        data: [],
        totalCount: 0,
      });

      mockRevokeInvitation.mockRejectedValue(new Error("already revoked"));
      mockCreateInvitation.mockResolvedValue({
        id: "inv_789",
        url: "https://clerk.accounts.dev/sign-up?ticket=fallback",
      });

      const result = await resendInvitation(
        "inv_missing",
        "deadpartyplaylist@gmail.com",
        "super_admin",
      );

      expect(result.success).toBe(true);
      expect(mockCreateInvitation).toHaveBeenCalledWith(
        expect.objectContaining({
          emailAddress: "deadpartyplaylist@gmail.com",
          expiresInDays: 7,
          ignoreExisting: true,
        }),
      );
    });
  });

  describe("revokeInvitation", () => {
    it("revokes an active invitation", async () => {
      mockRevokeInvitation.mockResolvedValue({ id: "inv_123", status: "revoked" });

      const result = await revokeInvitation("inv_123");

      expect(result).toStrictEqual({ success: true });
      expect(mockRevokeInvitation).toHaveBeenCalledWith("inv_123");
    });
  });
});
