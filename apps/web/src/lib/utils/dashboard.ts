/**
 * Get the dashboard route based on user role.
 */
export function getDashboardRoute(role: string): string {
  switch (role) {
    case "super_admin":
    case "admin":
    case "writer":
      return "/admin/";
    case "artist":
      return "/artist-dashboard";
    case "fan":
    default:
      return "/dashboard";
  }
}

