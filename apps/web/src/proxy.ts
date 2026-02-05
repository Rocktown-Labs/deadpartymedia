import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  getRequestLogger,
  addRequestIdHeader,
  getRequestId,
} from "@/lib/logger/middleware";
import { withUserContext } from "@/lib/logger/context";
import { sanitizeError } from "@/lib/logger/sanitize";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isArtistDashboardRoute = createRouteMatcher(["/artist-dashboard(.*)"]);
const isDashboardRoute = createRouteMatcher(["/dashboard(.*)"]);
const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);
const isArtistMeRoute = createRouteMatcher(["/api/artists/me(.*)"]);
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in",
  "/sign-up",
  "/api/webhooks(.*)",
  "/api/posts(.*)",
  "/api/events(.*)",
  "/api/stats/monthly",
  "/api/artists(.*)",
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
  "/api/artists/me(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const requestId = getRequestId(req);
  const log = getRequestLogger(req);
  let response: NextResponse;
  const isRscRequest = req.nextUrl.searchParams.has("_rsc");

  if (isRscRequest) {
    log.info(
      {
        operation: "rsc_request",
        path: req.nextUrl.pathname,
        method: req.method,
        purpose: req.headers.get("purpose"),
        middlewarePrefetch: req.headers.get("x-middleware-prefetch"),
      },
      "RSC request observed"
    );
  }

  // Allow public routes (except explicitly protected artist endpoints)
  if (isPublicRoute(req) && !isArtistMeRoute(req)) {
    response = NextResponse.next();
    addRequestIdHeader(response, requestId);
    return response;
  }

  // Protect routes that require authentication
  if (isProtectedRoute(req)) {
    try {
      await auth.protect();
    } catch (error) {
      log.warn(
        {
          error: sanitizeError(error),
          operation: "auth_protect",
          path: req.nextUrl.pathname,
        },
        "Unauthorized access attempt"
      );
      response = NextResponse.redirect(new URL("/sign-in", req.url));
      addRequestIdHeader(response, requestId);
      return response;
    }
  }

  const { sessionClaims, userId } = await auth();
  const onboardingComplete = sessionClaims?.metadata?.onboardingComplete;
  const role = sessionClaims?.metadata?.role as string | undefined;

  // Add user context to logger if authenticated
  if (userId) {
    const userLog = withUserContext(log, userId, role);
    userLog.debug(
      { path: req.nextUrl.pathname, role, onboardingComplete },
      "Authenticated request"
    );
  }

  // Handle onboarding flow - only for authenticated users
  if (userId && !onboardingComplete) {
    // Allow access to onboarding route
    if (isOnboardingRoute(req)) {
      response = NextResponse.next();
      addRequestIdHeader(response, requestId);
      return response;
    }
    // Redirect to onboarding if not completed
    if (userId) {
      log.info(
        { userId, operation: "onboarding_redirect" },
        "Redirecting to onboarding"
      );
    }
    response = NextResponse.redirect(new URL("/onboarding", req.url));
    addRequestIdHeader(response, requestId);
    return response;
  }

  // Handle role-based routing for authenticated users with completed onboarding
  if (onboardingComplete && role) {
    // Check if user is accessing the correct dashboard for their role
    const isCorrectRoute =
      ((role === "super_admin" || role === "writer") && isAdminRoute(req)) ||
      (role === "artist" && isArtistDashboardRoute(req)) ||
      (role === "fan" && isDashboardRoute(req));

    if (isCorrectRoute) {
      response = NextResponse.next();
      addRequestIdHeader(response, requestId);
      return response;
    }

    // Redirect to correct dashboard based on role
    if (
      isAdminRoute(req) ||
      isArtistDashboardRoute(req) ||
      isDashboardRoute(req)
    ) {
      const targetPath =
        role === "super_admin" || role === "writer"
          ? "/admin"
          : role === "artist"
            ? "/artist-dashboard"
            : "/dashboard";

      if (userId) {
        log.info(
          { userId, role, operation: "role_based_redirect", targetPath },
          "Redirecting to role-appropriate dashboard"
        );
      }

      response = NextResponse.redirect(new URL(targetPath, req.url));
      addRequestIdHeader(response, requestId);
      return response;
    }
  }

  response = NextResponse.next();
  addRequestIdHeader(response, requestId);
  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
