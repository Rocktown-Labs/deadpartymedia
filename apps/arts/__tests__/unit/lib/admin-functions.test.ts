import { describe, expect, it, vi } from "vite-plus/test";

vi.mock("@dpmedia/db", () => ({
  db: {},
}));

vi.mock("@dpmedia/db/schema", () => ({
  artmakers: {},
  artworks: {},
  events: {},
  posts: {},
  users: {},
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: vi.fn((handler) => handler),
      validator: vi.fn(() => builder),
    };

    return builder;
  },
}));

describe("arts admin server functions", () => {
  it("should evaluate without SSR module load errors", async () => {
    const adminFunctions = await import("#/lib/admin.functions.ts");

    expect(adminFunctions.getArtsAdminOverview).toBeTypeOf("function");
    expect(adminFunctions.listAdminArtmakers).toBeTypeOf("function");
    expect(adminFunctions.listArtsStaffUsers).toBeTypeOf("function");
    expect(adminFunctions.updateArtsUserRole).toBeTypeOf("function");
  });
});
