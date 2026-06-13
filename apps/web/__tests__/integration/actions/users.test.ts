import { inviteUser } from "@/app/admin/users/actions";
import { canManageUsers } from "@/lib/auth/access";

const { mockAuth, mockCreateInvitation, mockClerkClient } = vi.hoisted(() => {
  const mockCreateInvitation = vi.fn();
  return {
    mockAuth: vi.fn(),
    mockClerkClient: vi.fn(() => ({
      invitations: {
        createInvitation: mockCreateInvitation,
      },
    })),
    mockCreateInvitation,
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

describe(inviteUser, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: "user_super_admin" });
    vi.mocked(canManageUsers).mockResolvedValue(true);
  });

  it("returns a plain serializable success payload after Clerk sends an invitation", async () => {
    class ClerkInvitation {
      id = "inv_test";
      emailAddress = "writer@example.com";
    }

    mockCreateInvitation.mockResolvedValue(new ClerkInvitation());

    const result = await inviteUser("writer@example.com", "writer");

    expect(result).toStrictEqual({ success: true });
    expect("invitation" in result).toBeFalsy();
    expect(mockCreateInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        emailAddress: "writer@example.com",
        publicMetadata: expect.objectContaining({
          onboardingComplete: true,
          role: "writer",
        }),
      }),
    );
  });
});
