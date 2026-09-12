import { clampInt } from "@/lib/security";

describe(clampInt, () => {
  it("uses the fallback when the value is absent", () => {
    expect(clampInt(null, 50, 1, 200)).toBe(50);
    expect(clampInt(undefined, 50, 1, 200)).toBe(50);
  });

  it("uses the fallback for non-numeric values", () => {
    expect(clampInt("not-a-number", 50, 1, 200)).toBe(50);
    expect(clampInt(Number.NaN, 50, 1, 200)).toBe(50);
  });

  it("clamps values to the configured range", () => {
    expect(clampInt("0", 50, 1, 200)).toBe(1);
    expect(clampInt("250", 50, 1, 200)).toBe(200);
    expect(clampInt(50.9, 50, 1, 200)).toBe(50);
  });
});
