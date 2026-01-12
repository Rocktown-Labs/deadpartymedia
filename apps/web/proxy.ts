import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isArtistDashboardRoute = createRouteMatcher(["/artist-dashboard(.*)"]);
const isDashboardRoute = createRouteMatcher(["/dashboard(.*)"]);
const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in",
  "/sign-up",
  "/api/webhooks(.*)",
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { userId, sessionClaims, redirectToSignIn } = await auth();

  // Allow public routes
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // If user is not authenticated and route is not public, redirect to sign-in
  if (!userId && !isPublicRoute(req)) {
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  // If user is authenticated, check onboarding status
  if (userId && sessionClaims) {
    const onboardingComplete = sessionClaims.metadata?.onboardingComplete;
    const role = sessionClaims.metadata?.role;

    // Allow access to onboarding route if not completed
    if (!onboardingComplete && isOnboardingRoute(req)) {
      return NextResponse.next();
    }

    // Redirect to onboarding if not completed (except for onboarding route itself)
    if (!onboardingComplete && !isOnboardingRoute(req)) {
      const onboardingUrl = new URL("/onboarding", req.url);
      return NextResponse.redirect(onboardingUrl);
    }

    // If onboarding is complete, handle role-based routing
    if (onboardingComplete && role) {
      // Super admin and writer go to /admin
      if ((role === "super_admin" || role === "writer") && isAdminRoute(req)) {
        return NextResponse.next();
      }

      // Artist goes to /artist-dashboard
      if (role === "artist" && isArtistDashboardRoute(req)) {
        return NextResponse.next();
      }

      // Fan goes to /dashboard
      if (role === "fan" && isDashboardRoute(req)) {
        return NextResponse.next();
      }

      // Redirect authenticated users trying to access wrong dashboard
      if (isAdminRoute(req) && role !== "super_admin" && role !== "writer") {
        if (role === "artist") {
          return NextResponse.redirect(new URL("/artist-dashboard", req.url));
        }
        if (role === "fan") {
          return NextResponse.redirect(new URL("/dashboard", req.url));
        }
      }

      if (isArtistDashboardRoute(req) && role !== "artist") {
        if (role === "super_admin" || role === "writer") {
          return NextResponse.redirect(new URL("/admin", req.url));
        }
        if (role === "fan") {
          return NextResponse.redirect(new URL("/dashboard", req.url));
        }
      }

      if (isDashboardRoute(req) && role !== "fan") {
        if (role === "super_admin" || role === "writer") {
          return NextResponse.redirect(new URL("/admin", req.url));
        }
        if (role === "artist") {
          return NextResponse.redirect(new URL("/artist-dashboard", req.url));
        }
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
