import { defineConfig, lazyPlugins } from "vite-plus";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * web-start — the TanStack Start successor to apps/web (Next.js),
 * scaffolded alongside it per the official migration guide:
 * https://tanstack.com/start/latest/docs/framework/react/migrate-from-next-js
 *
 * Next.js stays runnable until parity; this app is dev-served at
 * https://start.deadpartymedia.localhost via portless.
 *
 * At the Cloudflare cutover (MIGRATION_PLAN.md Phase 5) the nitro plugin is
 * swapped for @cloudflare/vite-plugin per TanStack's official Workers path.
 */
const config = defineConfig({
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  resolve: {
    tsconfigPaths: true,
    alias: {
      // Same resolution quirk as apps/arts: the Clerk TanStack server module
      // must resolve to its built dist file.
      "@clerk/tanstack-react-start/server": path.resolve(
        __dirname,
        "node_modules/@clerk/tanstack-react-start/dist/server/index.js",
      ),
    },
  },
  test: {
    passWithNoTests: true,
  },
  plugins: lazyPlugins(() => [
    ...(process.env.VITEST ? [] : [tanstackStart()]),
    ...(process.env.VITEST ? [] : [nitro()]),
    tailwindcss(),
    viteReact(),
  ]),
});

export default config;
