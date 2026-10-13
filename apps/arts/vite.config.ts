import { defineConfig, lazyPlugins } from "vite-plus";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = defineConfig({
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  resolve: {
    tsconfigPaths: true,
    alias: {
      "@clerk/tanstack-react-start/server": path.resolve(
        __dirname,
        "node_modules/@clerk/tanstack-react-start/dist/server/index.js",
      ),
    },
  },
  test: {
    passWithNoTests: true,
    env: {
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/test",
    },
    server: {
      deps: {
        inline: true,
      },
    },
  },
  plugins: lazyPlugins(() => [
    devtools(),
    ...(process.env.VITEST ? [] : [nitro({ rollupConfig: { external: [/^@sentry\//] } })]),
    tailwindcss(),
    ...(process.env.VITEST ? [] : [tanstackStart()]),
    viteReact(),
  ]),
});

export default config;
