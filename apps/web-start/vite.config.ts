import { defineConfig, lazyPlugins } from "vite-plus";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

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
