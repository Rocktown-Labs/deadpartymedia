import { describe, expect, it } from "vite-plus/test";
import { isArtsAdminRole } from "#/lib/admin.functions.ts";
import { isArtsStaffRole } from "#/lib/artmakers.functions.ts";

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
});
