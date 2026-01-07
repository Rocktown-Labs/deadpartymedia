import type { Route } from "next";

/**
 * Get the dashboard route based on user role.
 */
export function getDashboardRoute(role: string): Route {
  switch (role) {
    case "super_admin":
    case "admin":
    case "writer":
      return "/admin/" as Route;
    case "artist":
      return "/artist-dashboard" as Route;
    case "fan":
    default:
      return "/dashboard" as Route;
  }
}
