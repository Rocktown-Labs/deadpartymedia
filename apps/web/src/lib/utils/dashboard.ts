import { roleOrDefault } from "@/lib/auth/role";
import type { Roles } from "@/types/globals";

function mapRoleToDashboardRoute(role: Roles): string {
  switch (role) {
    case "super_admin":
    case "writer": {
      return "/admin";
    }
    case "artist": {
      return "/artist-dashboard";
    }
    case "venue": {
      return "/events";
    }
    case "fan":
    default: {
      return "/dashboard";
    }
  }
}

/**
 * Get the dashboard route based on user role.
 * Works with Clerk's publicMetadata.role format.
 */
export function getDashboardRoute(role?: string | null): string {
  return mapRoleToDashboardRoute(roleOrDefault(role, "fan"));
}

/**
 * Safe boundary when input comes from untyped metadata.
 */
export function getDashboardRouteFromMetadata(roleInput: unknown): string {
  return mapRoleToDashboardRoute(roleOrDefault(roleInput, "fan"));
}
