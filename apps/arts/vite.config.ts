import { defineConfig, lazyPlugins } from "vite-plus";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Server function files are imported by client components to get RPC stubs, but
// the TanStack Start client transform keeps their top-level imports, so the
// browser would evaluate @dpmedia/db (which pulls in the `pg` driver and crashes
// with "Buffer is not defined" before hydration) and the Clerk server SDK.
// The handlers themselves are extracted server-side, so the client never calls
// into these modules: stub them out for the client environment only (issue #128).
const CLIENT_SERVER_STUBS = [
  {
    // Matches the bare specifier and the resolved workspace path. Only the db
    // root is stubbed: it pulls in the `pg` driver, which crashes in the
    // browser. `@dpmedia/db/schema` stays real (pure drizzle table defs), and
    // the Clerk server module stays real too — src/start.ts imports
    // clerkMiddleware from it in the shared graph.
    pattern:
      /(^|\/)node_modules\/@dpmedia\/db\/src\/index\.ts$|\/packages\/db\/src\/index\.ts(\?|$)/,
    code: `export const db = new Proxy({}, {
  get() { throw new Error("@dpmedia/db is server-only and was accessed from the client."); },
});`,
  },
];

function stubServerOnlyModulesForClient() {
  return {
    name: "dpmedia:stub-server-only-modules-for-client",
    applyToEnvironment(env) {
      return env.name === "client";
    },
    resolveId(source) {
      if (source === "@dpmedia/db") {
        return "\0dpmedia-client-stub:@dpmedia/db";
      }
      return null;
    },
    load(id) {
      if (id.startsWith("\0dpmedia-client-stub:@dpmedia/db")) {
        return CLIENT_SERVER_STUBS[0].code;
      }
      if (this.environment?.name !== "client") {
        return null;
      }
      const cleanId = id.split("?")[0];
      for (const stub of CLIENT_SERVER_STUBS) {
        if (stub.pattern.test(cleanId)) {
          return stub.code;
        }
      }
      return null;
    },
  };
}

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
    ...(process.env.VITEST ? [] : [tanstackStart()]),
    ...(process.env.VITEST ? [] : [nitro({ rollupConfig: { external: [/^@sentry\//] } })]),
    tailwindcss(),
    stubServerOnlyModulesForClient(),
    viteReact(),
  ]),
});

export default config;
