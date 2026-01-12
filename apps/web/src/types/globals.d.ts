export {};

// Create a type for the Roles
export type Roles = "artist" | "fan" | "super_admin" | "writer";

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: Roles;
      artistId?: number; // For artists claiming their profile
      onboardingComplete?: boolean; // Track if user has completed onboarding
    };
  }
}
