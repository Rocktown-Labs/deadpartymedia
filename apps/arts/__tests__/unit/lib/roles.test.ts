import { describe, expect, it } from "vite-plus/test";
import { isArtsAdminRole } from "#/lib/admin.functions.ts";
import {
  getRolesFromMetadata,
  hasArtsStaffRole,
  isArtsStaffRole,
  mergeArtsRole,
  shouldRedirectStaffFromArtmakerDashboard,
} from "#/lib/artmakers.functions.ts";
import { isArtsInvitation, isArtsPlatformRole } from "#/lib/roles.ts";

describe("Arts Role & Access Control Rules", () => {
  describe("isArtsStaffRole", () => {
    it("should allow arts_admin, arts_writer, super_admin, and admin", () => {
      expect(isArtsStaffRole("arts_admin")).toBe(true);
      expect(isArtsStaffRole("arts_writer")).toBe(true);
      expect(isArtsStaffRole("super_admin")).toBe(true);
      expect(isArtsStaffRole("admin")).toBe(true);
    });

    it("should reject fan, music artist, and music writer roles", () => {
      expect(isArtsStaffRole("fan")).toBe(false);
      expect(isArtsStaffRole("artist")).toBe(false); // Music artist
      expect(isArtsStaffRole("writer")).toBe(false); // Music writer
      expect(isArtsStaffRole(null)).toBe(false);
      expect(isArtsStaffRole(undefined)).toBe(false);
    });
  });

  describe("isArtsAdminRole", () => {
    it("should allow arts_admin, super_admin, and admin", () => {
      expect(isArtsAdminRole("arts_admin")).toBe(true);
      expect(isArtsAdminRole("super_admin")).toBe(true);
      expect(isArtsAdminRole("admin")).toBe(true);
    });

    it("should reject arts_writer, fan, music artist, and music writer", () => {
      expect(isArtsAdminRole("arts_writer")).toBe(false);
      expect(isArtsAdminRole("fan")).toBe(false);
      expect(isArtsAdminRole("artist")).toBe(false);
      expect(isArtsAdminRole("writer")).toBe(false);
    });
  });

  describe("getRolesFromMetadata", () => {
    it("should read the roles array and legacy single role", () => {
      expect(
        getRolesFromMetadata({ roles: ["artmaker", "arts_admin"], role: "arts_admin" }),
      ).toEqual(["artmaker", "arts_admin"]);
      expect(getRolesFromMetadata({ role: "artmaker" })).toEqual(["artmaker"]);
      expect(getRolesFromMetadata({})).toEqual([]);
      expect(getRolesFromMetadata(null)).toEqual([]);
    });
  });

  describe("hasArtsStaffRole", () => {
    it("should detect staff membership across the roles array", () => {
      expect(hasArtsStaffRole(["artmaker", "arts_admin"])).toBe(true);
      expect(hasArtsStaffRole(["artmaker"])).toBe(false);
      expect(hasArtsStaffRole([])).toBe(false);
    });
  });

  describe("shouldRedirectStaffFromArtmakerDashboard", () => {
    it("should redirect staff-only users who are not artmakers or super_admin", () => {
      expect(shouldRedirectStaffFromArtmakerDashboard(["arts_admin"])).toBe(true);
      expect(shouldRedirectStaffFromArtmakerDashboard(["arts_writer"])).toBe(true);
      expect(shouldRedirectStaffFromArtmakerDashboard(["admin"])).toBe(true);
    });

    it("should not redirect users who hold the artmaker role", () => {
      expect(shouldRedirectStaffFromArtmakerDashboard(["artmaker"])).toBe(false);
      expect(shouldRedirectStaffFromArtmakerDashboard(["artmaker", "arts_admin"])).toBe(false);
    });

    it("should not redirect super_admin users even without the artmaker role (issue #123)", () => {
      expect(shouldRedirectStaffFromArtmakerDashboard(["super_admin"])).toBe(false);
      expect(shouldRedirectStaffFromArtmakerDashboard(["super_admin", "arts_admin"])).toBe(false);
    });

    it("should not redirect fans or empty roles", () => {
      expect(shouldRedirectStaffFromArtmakerDashboard(["fan"])).toBe(false);
      expect(shouldRedirectStaffFromArtmakerDashboard([])).toBe(false);
    });
  });

  describe("mergeArtsRole", () => {
    it("should keep the audience role when granting a staff role", () => {
      expect(mergeArtsRole(["artmaker"], "arts_admin")).toEqual(["arts_admin", "artmaker"]);
    });

    it("should keep the staff role when onboarding as an artmaker", () => {
      expect(mergeArtsRole(["arts_admin"], "artmaker")).toEqual(["artmaker", "arts_admin"]);
    });

    it("should replace the audience role when switching to fan", () => {
      expect(mergeArtsRole(["artmaker", "arts_admin"], "fan")).toEqual(["fan", "arts_admin"]);
    });

    it("should replace an existing staff role without stacking both", () => {
      expect(mergeArtsRole(["arts_admin", "artmaker"], "arts_writer")).toEqual([
        "arts_writer",
        "artmaker",
      ]);
    });
  });

  describe("isArtsInvitation", () => {
    it("should allow arts staff and artmaker invitations", () => {
      expect(isArtsInvitation({ publicMetadata: { role: "arts_admin" } })).toBe(true);
      expect(isArtsInvitation({ publicMetadata: { role: "arts_writer" } })).toBe(true);
      expect(isArtsInvitation({ publicMetadata: { role: "artmaker" } })).toBe(true);
    });

    it("should allow fan invitations specifically targeted to arts", () => {
      expect(
        isArtsInvitation({
          publicMetadata: { role: "fan" },
          redirectUrl: "https://arts.deadpartymedia.com/admin",
        }),
      ).toBe(true);
      expect(
        isArtsInvitation({
          publicMetadata: { role: "fan" },
          redirectUrl: "https://deadpartyarts.com/admin",
        }),
      ).toBe(true);
    });

    it("should reject music writer and artist invitations", () => {
      expect(isArtsInvitation({ publicMetadata: { role: "writer" } })).toBe(false);
      expect(isArtsInvitation({ publicMetadata: { role: "artist" } })).toBe(false);
      expect(
        isArtsInvitation({
          publicMetadata: { role: "fan" },
          redirectUrl: "https://deadpartymedia.com/sign-up",
        }),
      ).toBe(false);
      expect(isArtsInvitation({})).toBe(false);
    });
  });

  describe("isArtsPlatformRole", () => {
    it("should allow arts staff and creator platform roles", () => {
      expect(isArtsPlatformRole("super_admin")).toBe(true);
      expect(isArtsPlatformRole("arts_admin")).toBe(true);
      expect(isArtsPlatformRole("arts_writer")).toBe(true);
      expect(isArtsPlatformRole("artmaker")).toBe(true);
    });

    it("should reject music-specific and non-staff roles", () => {
      expect(isArtsPlatformRole("writer")).toBe(false);
      expect(isArtsPlatformRole("artist")).toBe(false);
      expect(isArtsPlatformRole("venue")).toBe(false);
      expect(isArtsPlatformRole("fan")).toBe(false);
      expect(isArtsPlatformRole("unknown")).toBe(false);
      expect(isArtsPlatformRole(null)).toBe(false);
    });
  });
});
