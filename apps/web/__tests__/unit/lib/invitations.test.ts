import { buildInvitationRedirectUrl } from "@/lib/auth/invitations";

describe("invitation auth helpers", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.VERCEL_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe(buildInvitationRedirectUrl, () => {
    it("returns absolute URLs unchanged", () => {
      expect(buildInvitationRedirectUrl("https://accounts.example.com/sign-up")).toBe(
        "https://accounts.example.com/sign-up",
      );
    });

    it("builds an absolute app URL from a relative sign-up path", () => {
      process.env.NEXT_PUBLIC_SITE_URL = "https://deadpartymedia.com";

      expect(buildInvitationRedirectUrl("/sign-up?role=super_admin")).toBe(
        "https://deadpartymedia.com/sign-up?role=super_admin",
      );
    });

    it("uses the first configured site URL when multiple origins are present", () => {
      process.env.NEXT_PUBLIC_SITE_URL =
        "https://deadpartymedia.com,https://www.deadpartymedia.com";

      expect(buildInvitationRedirectUrl("/sign-up?role=artist&artistId=42")).toBe(
        "https://deadpartymedia.com/sign-up?role=artist&artistId=42",
      );
    });
  });
});
