import { normalizeInstagramInput } from "@/app/onboarding/validation";

describe(normalizeInstagramInput, () => {
  it("returns empty string for nullish/empty/whitespace input", () => {
    expect(normalizeInstagramInput()).toBe("");
    expect(normalizeInstagramInput(null)).toBe("");
    expect(normalizeInstagramInput("")).toBe("");
    expect(normalizeInstagramInput("   ")).toBe("");
    expect(normalizeInstagramInput("\n\t  ")).toBe("");
  });

  it("normalizes @-prefixed usernames", () => {
    expect(normalizeInstagramInput("@handle")).toBe("handle");
    expect(normalizeInstagramInput("@ handle ")).toBe("handle");
    expect(normalizeInstagramInput("  @handle  ")).toBe("handle");
  });

  it("returns empty string when '@' has no username", () => {
    expect(normalizeInstagramInput("@")).toBe("");
    expect(normalizeInstagramInput("@   ")).toBe("");
  });

  it("trims and returns plain usernames as-is", () => {
    expect(normalizeInstagramInput("handle")).toBe("handle");
    expect(normalizeInstagramInput("  handle  ")).toBe("handle");
    expect(normalizeInstagramInput("user.name_123")).toBe("user.name_123");
  });

  it("strips instagram URL prefixes (scheme optional, www/m optional, case-insensitive)", () => {
    expect(normalizeInstagramInput("https://instagram.com/handle")).toBe("handle");
    expect(normalizeInstagramInput("http://www.instagram.com/handle")).toBe("handle");
    expect(normalizeInstagramInput("m.instagram.com/handle")).toBe("handle");
    expect(normalizeInstagramInput("HTTPS://INSTAGRAM.COM/handle")).toBe("handle");
  });

  it("removes leading slashes before extracting the username", () => {
    expect(normalizeInstagramInput("/handle")).toBe("handle");
    expect(normalizeInstagramInput("///handle")).toBe("handle");
    expect(normalizeInstagramInput("https://instagram.com///handle")).toBe("handle");
  });

  it("stops at path/query/hash delimiters after extracting username", () => {
    expect(normalizeInstagramInput("instagram.com/handle/")).toBe("handle");
    expect(normalizeInstagramInput("instagram.com/handle?x=1")).toBe("handle");
    expect(normalizeInstagramInput("instagram.com/handle#bio")).toBe("handle");
    expect(normalizeInstagramInput("instagram.com/handle/?x=1#y")).toBe("handle");
    expect(normalizeInstagramInput("instagram.com/handle/some/extra")).toBe("handle");
  });

  it("stringifies non-string input values", () => {
    expect(normalizeInstagramInput(123)).toBe("123");
    expect(normalizeInstagramInput(true)).toBe("true");
  });
});
