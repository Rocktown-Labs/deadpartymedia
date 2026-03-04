import { parseRole, roleOrDefault } from "@/lib/auth/role";

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
    expect(roleOrDefault(undefined, "artist")).toBe("artist");
  });
});
