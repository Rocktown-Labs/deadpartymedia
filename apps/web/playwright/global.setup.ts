import { clerk, clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "@playwright/test";
import type { FullConfig } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

async function signInAndSaveState(args: {
  baseUrl: string;
  storagePath: string;
  verifyPath: string;
  identifier: string;
  password: string;
}) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await setupClerkTestingToken({ page });
    await page.goto(args.baseUrl);
    await clerk.loaded({ page });

    await clerk.signIn({
      page,
      signInParams: {
        identifier: args.identifier,
        password: args.password,
        strategy: "password",
      },
    });

    await page.goto(`${args.baseUrl}${args.verifyPath}`);
    await page.waitForSelector("body", { timeout: 15_000 });
    await page.context().storageState({ path: args.storagePath });
  } finally {
    await browser.close();
  }
}

export default async function globalSetup(config: FullConfig) {
  await clerkSetup();

  const baseUrl =
    (config.projects[0]?.use?.baseURL as string | undefined) || "http://localhost:3001";

  const clerkDir = path.join(__dirname, ".clerk");
  await fs.mkdir(clerkDir, { recursive: true });

  const fanStorage = path.join(clerkDir, "user.json");
  const artistStorage = path.join(clerkDir, "artist.json");
  const adminStorage = path.join(clerkDir, "admin.json");

  const fanIdentifier =
    process.env.E2E_CLERK_USER_USERNAME || process.env.E2E_CLERK_FAN_EMAIL || "";
  const fanPassword =
    process.env.E2E_CLERK_USER_PASSWORD || process.env.E2E_CLERK_FAN_PASSWORD || "";

  const artistIdentifier =
    process.env.E2E_CLERK_ARTIST_EMAIL || process.env.E2E_CLERK_USER_USERNAME || "";
  const artistPassword =
    process.env.E2E_CLERK_ARTIST_PASSWORD || process.env.E2E_CLERK_USER_PASSWORD || "";

  const adminIdentifier =
    process.env.E2E_CLERK_ADMIN_EMAIL || process.env.E2E_CLERK_USER_USERNAME || "";
  const adminPassword =
    process.env.E2E_CLERK_ADMIN_PASSWORD || process.env.E2E_CLERK_USER_PASSWORD || "";

  // Only attempt sign-in if credentials are provided, otherwise rely on existing storageState files.
  if (fanIdentifier && fanPassword) {
    await signInAndSaveState({
      baseUrl,
      identifier: fanIdentifier,
      password: fanPassword,
      storagePath: fanStorage,
      verifyPath: "/dashboard",
    });
  }

  if (artistIdentifier && artistPassword) {
    await signInAndSaveState({
      baseUrl,
      identifier: artistIdentifier,
      password: artistPassword,
      storagePath: artistStorage,
      verifyPath: "/artist-dashboard",
    });
  }

  if (adminIdentifier && adminPassword) {
    await signInAndSaveState({
      baseUrl,
      identifier: adminIdentifier,
      password: adminPassword,
      storagePath: adminStorage,
      verifyPath: "/admin",
    });
  }
}
