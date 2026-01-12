import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isArtistDashboardRoute = createRouteMatcher(["/artist-dashboard(.*)"]);
const isDashboardRoute = createRouteMatcher(["/dashboard(.*)"]);
const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in",
  "/sign-up",
  "/api/webhooks(.*)",
  "/api/spotify(.*)",
  "/merch(.*)",
  "/article(.*)",
  "/artists(.*)",
  "/events(.*)",
  "/music(.*)",
  "/writers(.*)",
  "/about",
  "/contact",
  "/country",
  "/edm",
  "/hardcore",
  "/hip-hop-r-b",
  "/other",
]);

// Protected routes that require authentication
const isProtectedRoute = createRouteMatcher([
  "/admin(.*)",
  "/artist-dashboard(.*)",
  "/dashboard(.*)",
  "/onboarding(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Allow public routes
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Protect routes that require authentication
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  const { sessionClaims } = await auth();
  const onboardingComplete = sessionClaims?.metadata?.onboardingComplete;
  const role = sessionClaims?.metadata?.role as string | undefined;

  // Handle onboarding flow - redirect to onboarding if not complete
  if (!onboardingComplete) {
    // Allow access to onboarding route
    if (isOnboardingRoute(req)) {
      return NextResponse.next();
    }
    // Redirect to onboarding if not completed
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  // Handle role-based routing for authenticated users with completed onboarding
  if (onboardingComplete && role) {
    // Check if user is accessing the correct dashboard for their role
    const isCorrectRoute =
      ((role === "super_admin" || role === "writer") && isAdminRoute(req)) ||
      (role === "artist" && isArtistDashboardRoute(req)) ||
      (role === "fan" && isDashboardRoute(req));

    if (isCorrectRoute) {
      return NextResponse.next();
    }

    // Redirect to correct dashboard based on role
    if (isAdminRoute(req) || isArtistDashboardRoute(req) || isDashboardRoute(req)) {
      if (role === "super_admin" || role === "writer") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      if (role === "artist") {
        return NextResponse.redirect(new URL("/artist-dashboard", req.url));
      }
      if (role === "fan") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
