import { defineConfig } from "drizzle-kit";
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/d1/music-schema.ts",
  out: "./migrations/music",
});
