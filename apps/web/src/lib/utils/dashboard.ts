import type { Route } from "next";

/**
 * Get the dashboard route based on user role.
 * Works with Clerk's publicMetadata.role format.
 */
export function getDashboardRoute(role: string | undefined | null): Route {
  switch (role) {
    case "super_admin":
    case "admin":
    case "writer":
      return "/admin" as Route;
    case "artist":
      return "/artist-dashboard" as Route;
    case "fan":
    default:
      return "/dashboard" as Route;
  }
}
