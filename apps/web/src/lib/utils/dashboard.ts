import type { Route } from "next";
import type { Roles } from "@/types/globals";
import { roleOrDefault } from "@/lib/auth/role";

function mapRoleToDashboardRoute(role: Roles): Route {
  switch (role) {
    case "super_admin":
    case "writer": {
      return "/admin" as Route;
    }
    case "artist": {
      return "/artist-dashboard" as Route;
    }
    case "fan":
    default: {
      return "/dashboard" as Route;
    }
  }
}

/**
 * Get the dashboard route based on user role.
 * Works with Clerk's publicMetadata.role format.
 */
export function getDashboardRoute(role?: string | null): Route {
  return mapRoleToDashboardRoute(roleOrDefault(role, "fan"));
}

/**
 * Safe boundary when input comes from untyped metadata.
 */
export function getDashboardRouteFromMetadata(roleInput: unknown): Route {
  return mapRoleToDashboardRoute(roleOrDefault(roleInput, "fan"));
}
