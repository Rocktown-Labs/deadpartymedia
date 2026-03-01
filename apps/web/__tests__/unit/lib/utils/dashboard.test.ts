
import { getDashboardRoute, getDashboardRouteFromMetadata } from "@/lib/utils/dashboard";

describe("dashboard route resolution", () => {
  it("maps valid roles to expected routes", () => {
    expect(getDashboardRoute("super_admin")).toBe("/admin");
    expect(getDashboardRoute("writer")).toBe("/admin");
    expect(getDashboardRoute("artist")).toBe("/artist-dashboard");
    expect(getDashboardRoute("fan")).toBe("/dashboard");
  });

  it("maps legacy admin role to admin dashboard and unknown roles to fan dashboard", () => {
    expect(getDashboardRoute("admin")).toBe("/admin");
    expect(getDashboardRoute("owner")).toBe("/dashboard");
  });

  it("falls back to fan dashboard for nullish typed input", () => {
    expect(getDashboardRoute(null)).toBe("/dashboard");
    expect(getDashboardRoute()).toBe("/dashboard");
  });

  it("handles untyped metadata safely", () => {
    expect(getDashboardRouteFromMetadata("artist")).toBe("/artist-dashboard");
    expect(getDashboardRouteFromMetadata("admin")).toBe("/admin");
    expect(getDashboardRouteFromMetadata(123)).toBe("/dashboard");
    expect(getDashboardRouteFromMetadata({ role: "writer" })).toBe("/dashboard");
  });
});
