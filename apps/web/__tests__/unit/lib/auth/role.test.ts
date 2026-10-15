import {
  ARTS_ROLES,
  WEB_ROLES,
  isArtsRole,
  isWebRole,
  parseRole,
  roleOrDefault,
} from "@/lib/auth/role";

describe("role parser", () => {
  it("parses valid roles", () => {
    expect(parseRole("super_admin")).toBe("super_admin");
    expect(parseRole("writer")).toBe("writer");
    expect(parseRole("artist")).toBe("artist");
    expect(parseRole("fan")).toBe("fan");
    expect(parseRole("admin")).toBe("super_admin");
  });

  it("returns null for unknown strings", () => {
    expect(parseRole("owner")).toBeNull();
  });

  it("returns null for non-string values", () => {
    expect(parseRole(123)).toBeNull();
    expect(parseRole({ role: "fan" })).toBeNull();
    expect(parseRole(["fan"])).toBeNull();
    expect(parseRole(null)).toBeNull();
    expect(parseRole()).toBeNull();
  });

  it("falls back deterministically", () => {
    expect(roleOrDefault("artist")).toBe("artist");
    expect(roleOrDefault("admin")).toBe("super_admin");
    expect(roleOrDefault({ role: "writer" }, "fan")).toBe("fan");
    expect(roleOrDefault(null, "artist")).toBe("artist");
  });

  describe("platform scoping (isWebRole / isArtsRole)", () => {
    it("identifies web-scoped roles", () => {
      expect(isWebRole("super_admin")).toBe(true);
      expect(isWebRole("writer")).toBe(true);
      expect(isWebRole("artist")).toBe(true);
      expect(isWebRole("venue")).toBe(true);
      expect(isWebRole("fan")).toBe(true);
      expect(isWebRole("admin")).toBe(true); // alias for super_admin

      expect(isWebRole("arts_admin")).toBe(false);
      expect(isWebRole("arts_writer")).toBe(false);
      expect(isWebRole("artmaker")).toBe(false);
      expect(isWebRole("invalid")).toBe(false);
      expect(isWebRole(null)).toBe(false);
    });

    it("identifies arts-scoped roles", () => {
      expect(isArtsRole("arts_admin")).toBe(true);
      expect(isArtsRole("arts_writer")).toBe(true);
      expect(isArtsRole("artmaker")).toBe(true);

      expect(isArtsRole("super_admin")).toBe(false);
      expect(isArtsRole("writer")).toBe(false);
      expect(isArtsRole("artist")).toBe(false);
      expect(isArtsRole("venue")).toBe(false);
      expect(isArtsRole("fan")).toBe(false);
      expect(isArtsRole("invalid")).toBe(false);
      expect(isArtsRole(null)).toBe(false);
    });

    it("defines distinct role sets", () => {
      expect(WEB_ROLES).toContain("writer");
      expect(WEB_ROLES).toContain("artist");
      expect(WEB_ROLES).not.toContain("arts_writer");
      expect(WEB_ROLES).not.toContain("artmaker");

      expect(ARTS_ROLES).toContain("arts_writer");
      expect(ARTS_ROLES).toContain("artmaker");
      expect(ARTS_ROLES).not.toContain("writer");
      expect(ARTS_ROLES).not.toContain("artist");
    });

    it("correctly partitions roles when excluding arts roles", () => {
      const allRoles = [
        "super_admin",
        "writer",
        "artist",
        "venue",
        "fan",
        "arts_admin",
        "arts_writer",
        "artmaker",
      ] as const;
      const webScoped = allRoles.filter((r) => !(ARTS_ROLES as readonly string[]).includes(r));
      expect(webScoped).toEqual(["super_admin", "writer", "artist", "venue", "fan"]);
    });
  });
});
