import { defineConfig, lazyPlugins } from "vite-plus";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/postcss";

/**
 * TanStack Start conversion — runs alongside the existing Next.js app.
 * The Next.js dev server (`next dev`) and the TanStack Start dev server
 * (`vite dev`) coexist on different ports during migration.
 *
 * Route files live in src/routes/ (TanStack convention).
 * Components, lib, hooks are shared between both.
 */
const config = defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "@clerk/tanstack-react-start/server": new URL(
        "./node_modules/@clerk/tanstack-react-start/dist/server/index.js",
        import.meta.url,
      ).pathname,
    },
  },
  plugins: lazyPlugins(() => [tanstackStart(), viteReact()]),
});

export default config;
