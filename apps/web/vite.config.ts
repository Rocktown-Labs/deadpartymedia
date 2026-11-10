import { defineConfig, lazyPlugins } from "vite-plus";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  resolve: { tsconfigPaths: true, dedupe: ["react", "react-dom", "@tanstack/react-query"] },
  ssr: {
    external: ["cloudflare:workers"],
    noExternal: ["react", "react-dom", "@tanstack/react-query"],
  },
  build: { rolldownOptions: { external: ["cloudflare:workers"] } },
  test: { passWithNoTests: true, server: { deps: { inline: true } } },
  // Alchemy supplies the Cloudflare Vite integration in dev and deployment.
  plugins: lazyPlugins(() => [
    ...(process.env.VITEST ? [] : [tanstackStart()]),
    tailwindcss(),
    viteReact(),
  ]),
});
