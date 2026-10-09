import { withSentryConfig } from "@sentry/nextjs";
import { withWorkflow } from "workflow/next";
import "@dpmedia/env/web";
import type { NextConfig } from "next";
import path from "node:path";

const turbopackRoot = path.resolve(process.cwd(), "../..");

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  allowedDevOrigins: ["deadpartymedia.localhost", "*.deadpartymedia.localhost"],
  // @vercel/oidc ships CommonJS; Turbopack stubs its require() calls in the
  // bundled workflow step route ("dynamic usage of require is not supported").
  // Loading it natively keeps fs/require working in the Node step runtime.
  serverExternalPackages: ["@vercel/oidc"],
  turbopack: {
    root: turbopackRoot,
  },
  images: {
    remotePatterns: [
      {
        hostname: "*.fourthwall.com",
        pathname: "/**",
        protocol: "https",
      },
      {
        hostname: "*.fourthwall.dev",
        pathname: "/**",
        protocol: "https",
      },
      // Add other image domains as needed (e.g., S3 for Django uploads)
      {
        hostname: "**.amazonaws.com",
        pathname: "/**",
        protocol: "https",
      },
      // Vercel Blob storage for uploaded images
      {
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
        protocol: "https",
      },
      {
        hostname: "i.scdn.co",
        pathname: "/image/**",
        protocol: "https",
      },
    ],
  },
  // PostHog reverse proxy rewrites
  async rewrites() {
    return [
      {
        destination: "https://us-assets.i.posthog.com/static/:path*",
        source: "/ingest/static/:path*",
      },
      {
        destination: "https://us.i.posthog.com/:path*",
        source: "/ingest/:path*",
      },
    ];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
  async headers() {
    // Security hardening flagged by Lighthouse best practices. The CSP allows
    // Next.js inline bootstrap scripts and the third parties the site loads:
    // Clerk auth, Sentry, PostHog, Fourthwall merch, and Spotify artwork.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.deadpartymedia.com https://*.ingest.us.sentry.io https://us-assets.i.posthog.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://img.clerk.com https://*.public.blob.vercel-storage.com https://*.fourthwall.com https://*.fourthwall.dev https://i.scdn.co https://*.ingest.us.sentry.io",
      "font-src 'self' data:",
      "connect-src 'self' https://clerk.deadpartymedia.com https://*.ingest.us.sentry.io https://us.i.posthog.com https://us-assets.i.posthog.com https://api.fourthwall.com wss://clerk.deadpartymedia.com",
      "frame-src 'self' https://clerk.deadpartymedia.com https://www.fourthwall.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: csp,
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

const sentryConfig = withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "rocktown-labs-tq",

  project: "deadpartymedia-web",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});

export default withWorkflow(process.env.NODE_ENV === "development" ? nextConfig : sentryConfig);
