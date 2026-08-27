import { withSentryConfig } from "@sentry/nextjs";
import { withWorkflow } from "workflow/next";
import "@dpmedia/env/web";
import type { NextConfig } from "next";
import path from "node:path";

const turbopackRoot = path.resolve(process.cwd(), "../..");

const nextConfig: NextConfig = {
  cacheComponents: true,
  typedRoutes: true,
  reactCompiler: true,
  allowedDevOrigins: ["deadpartymedia.localhost", "*.deadpartymedia.localhost"],
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
