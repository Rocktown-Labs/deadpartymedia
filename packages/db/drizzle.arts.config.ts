import { defineConfig } from "drizzle-kit";
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/d1/arts-schema.ts",
  out: "./migrations/arts",
});
