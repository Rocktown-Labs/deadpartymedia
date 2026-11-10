import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { readMigrationFiles } from "drizzle-orm/migrator";
const readD1Migrations = (migrationsFolder: string) =>
  readMigrationFiles({ migrationsFolder }).map((m) => ({
    name: m.name,
    queries: m.sql.filter((q) => q.trim()),
  }));
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [
    cloudflareTest({
      main: "./src/index.ts",
      miniflare: {
        compatibilityDate: "2026-03-17",
        workflows: {
          BACKFILL: { name: "test-backfill", className: "WordPressBackfill" },
          DEDUPE: { name: "test-dedupe", className: "PostDedupe" },
        },
        compatibilityFlags: ["nodejs_compat"],
        d1Databases: ["ARTS_DB", "MUSIC_DB", "AUTH_DB"],
        r2Buckets: ["ARTS_MEDIA", "MUSIC_MEDIA"],
        bindings: {
          BETTER_AUTH_SECRET: "integration-tests-only-secret-at-least-32-characters",
          BETTER_AUTH_URL: "http://localhost:3000",
          TRUSTED_ORIGINS: "http://localhost:3000,http://localhost:3001,http://localhost:3002",
          ARTS_APP_URL: "http://localhost:3002",
          WEB_APP_URL: "http://localhost:3001",
          MAIL_FROM: "noreply@example.test",
          MUSIC_MEDIA_URL: "",
          SPOTIFY_CLIENT_ID: "",
          SPOTIFY_CLIENT_SECRET: "",
          CLOUDFLARE_R2_PUBLIC_URL: "https://media.example.test",
          FW_API_URL: "https://storefront-api.fourthwall.com/v1",
          FW_STOREFRONT_TOKEN: "",
          FW_CHECKOUT_URL: "",
          FW_ARTS_COLLECTION_ID: "",
          ARTS_MIGRATIONS: await readD1Migrations("../../packages/db/migrations/arts"),
          MUSIC_MIGRATIONS: readD1Migrations("../../packages/db/migrations/music"),
          AUTH_MIGRATIONS: await readD1Migrations("../../packages/auth/migrations"),
        },
      },
    }),
  ],
  test: { setupFiles: ["./test/setup.ts"] },
});
