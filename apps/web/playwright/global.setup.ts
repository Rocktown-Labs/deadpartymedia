import { request, type FullConfig } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
export default async function globalSetup(config: FullConfig) {
  if (process.env.E2E_RUN_AUTHENTICATED !== "true") return;
  const baseURL = String(config.projects[0]?.use?.baseURL || "http://localhost:3001");
  const dir = path.join(import.meta.dirname, ".auth");
  await fs.mkdir(dir, { recursive: true });
  for (const [role, filename] of [
    ["FAN", "user"],
    ["ARTIST", "artist"],
    ["ADMIN", "admin"],
  ]) {
    const email = process.env[`E2E_${role}_EMAIL`];
    const password = process.env[`E2E_${role}_PASSWORD`];
    if (!email || !password)
      throw new Error(`Set E2E_${role}_EMAIL and E2E_${role}_PASSWORD for authenticated suites`);
    const client = await request.newContext({ baseURL });
    try {
      const response = await client.post("/api/auth/sign-in/email", {
        headers: { origin: baseURL },
        data: { email, password },
      });
      if (!response.ok())
        throw new Error(`Native ${role} test sign-in failed (${response.status()})`);
      await client.storageState({ path: path.join(dir, `${filename}.json`) });
    } finally {
      await client.dispose();
    }
  }
}
