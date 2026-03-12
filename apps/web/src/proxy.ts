import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getRequestLogger, addRequestIdHeader, getRequestId } from "@/lib/logger/middleware";
import { withUserContext } from "@/lib/logger/context";
import { sanitizeError } from "@/lib/logger/sanitize";
import { parseRole } from "@/lib/auth/role";
import type { Roles } from "@/types/globals";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isArtistDashboardRoute = createRouteMatcher(["/artist-dashboard(.*)"]);
const isDashboardRoute = createRouteMatcher(["/dashboard(.*)"]);
const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);
const isArtistMeRoute = createRouteMatcher(["/api/artists/me(.*)"]);
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/api/posts(.*)",
  "/api/articles(.*)",
  "/api/events(.*)",
  "/api/stats/monthly",
  "/api/artists(.*)",
  "/api/writers(.*)",
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
  const isApiRequest = req.nextUrl.pathname.startsWith("/api/");

  if (isRscRequest) {
    log.info(
      {
        method: req.method,
        middlewarePrefetch: req.headers.get("x-middleware-prefetch"),
        operation: "rsc_request",
        path: req.nextUrl.pathname,
        purpose: req.headers.get("purpose"),
      },
      "RSC request observed",
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
        "Unauthorized access attempt",
      );
      if (isApiRequest) {
        response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        addRequestIdHeader(response, requestId);
        return response;
      }

      response = NextResponse.redirect(new URL("/sign-in", req.url));
      addRequestIdHeader(response, requestId);
      return response;
    }
  }

  const { sessionClaims, userId } = await auth();
  const onboardingComplete = sessionClaims?.metadata?.onboardingComplete;
  const rawRole = sessionClaims?.metadata?.role;
  const parsedRole = parseRole(rawRole);
  const role: Roles = parsedRole ?? "fan";

  // Add user context to logger if authenticated
  if (userId) {
    if (parsedRole === null && rawRole != null) {
      log.warn(
        {
          operation: "invalid_role_metadata",
          rawRole,
          rawRoleType: typeof rawRole,
          userId,
        },
        "Unexpected role value in session metadata; applying fan fallback",
      );
    }

    const userLog = withUserContext(log, userId, role);
    userLog.debug(
      { onboardingComplete, path: req.nextUrl.pathname, role },
      "Authenticated request",
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
      log.info({ operation: "onboarding_redirect", userId }, "Redirecting to onboarding");
    }
    response = NextResponse.redirect(new URL("/onboarding", req.url));
    addRequestIdHeader(response, requestId);
    return response;
  }

  // Handle role-based routing for authenticated users with completed onboarding
  if (onboardingComplete) {
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
    if (isAdminRoute(req) || isArtistDashboardRoute(req) || isDashboardRoute(req)) {
      const targetPath =
        role === "super_admin" || role === "writer"
          ? "/admin"
          : role === "artist"
            ? "/artist-dashboard"
            : "/dashboard";

      if (userId) {
        log.info(
          { operation: "role_based_redirect", role, targetPath, userId },
          "Redirecting to role-appropriate dashboard",
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
