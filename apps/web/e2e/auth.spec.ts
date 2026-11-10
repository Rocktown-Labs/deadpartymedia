import { test, expect } from "@playwright/test";
test.describe("Native authentication", () => {
  test("redirects unauthenticated dashboard requests", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/sign-in/);
    await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  });
  test("shows email and password sign-in", async ({ page }) => {
    await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
    await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /forgot/i })).toBeVisible();
  });
  test("shows native registration", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.getByLabel("Name", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  });
  test("keeps credentials out of native form navigation before hydration", async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    try {
      const page = await context.newPage();
      await page.goto(`${baseURL}/sign-in`);
      await expect(page.getByLabel("Email", { exact: true })).toBeDisabled();
      await expect(page.getByLabel("Password", { exact: true })).toBeDisabled();
      await expect(page.locator("form")).toHaveAttribute("method", "post");
      expect(new URL(page.url()).searchParams.has("password")).toBe(false);
    } finally {
      await context.close();
    }
  });
  test("shows Google with its logo and a working Back link on both sites", async ({ page }) => {
    const { artsOrigin, webOrigin } = (await (
      await page.request.get("/api/sso/configuration")
    ).json()) as { artsOrigin: string; webOrigin: string };
    const providers = (await (await page.request.get("/api/rpc/music/auth/providers")).json()) as {
      google: boolean;
    };
    test.skip(!providers.google, "Google credentials are required for the provider UI check");
    for (const origin of [webOrigin, artsOrigin]) {
      for (const view of ["sign-in", "sign-up"]) {
        await page.goto(`${origin}/${view}`);
        const google = page.getByRole("button", { name: /continue with google/i });
        await expect(google).toBeVisible();
        await expect(google.getByRole("img", { name: "Google", exact: true })).toBeVisible();
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await page.getByRole("link", { name: /back to dead party/i }).click();
        await expect(page).toHaveURL(`${origin}/`);
      }
    }
  });
  test("keeps Arts signup and email verification inside its modal", async ({ page }) => {
    const { artsOrigin } = (await (await page.request.get("/api/sso/configuration")).json()) as {
      artsOrigin: string;
    };
    await page.goto(artsOrigin + "/");
    await page.getByRole("button", { name: "Get started", exact: true }).click();
    const modal = page.getByRole("dialog", { name: "Dead Party Arts account" });
    await expect(modal).toBeVisible();
    expect(new URL(page.url()).origin).toBe(artsOrigin);
    expect(new URL(page.url()).pathname).toBe("/");
    const destination = new URL(page.url()).searchParams.get("redirectTo");
    await page.route("**/api/auth/sign-up/email", (route) =>
      route.fulfill({
        json: {
          user: {
            id: "ui-verification-fixture",
            email: "ui@example.test",
            name: "UI signup",
            emailVerified: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          token: null,
        },
      }),
    );
    await modal.getByLabel("Name", { exact: true }).fill("UI signup");
    await modal.getByLabel("Email", { exact: true }).fill("ui@example.test");
    await modal.getByLabel("Password", { exact: true }).fill("a correct signup password");
    await modal.getByRole("button", { name: "Sign Up", exact: true }).click();
    await expect(modal.getByRole("button", { name: "Verify code", exact: true })).toBeVisible();
    expect(new URL(page.url()).searchParams.get("auth")).toBe("verify-email");
    expect(new URL(page.url()).searchParams.get("redirectTo")).toBe(destination);
    await modal.getByRole("button", { name: "Close sign-in", exact: true }).click();
    await expect(page).toHaveURL(artsOrigin + "/");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
  test("signs in and opens the original article editor", async ({ page }) => {
    test.setTimeout(60000);
    const email = process.env.E2E_ADMIN_EMAIL,
      password = process.env.E2E_ADMIN_PASSWORD;
    test.skip(
      !email || !password,
      "Set dedicated preview admin credentials to run the authenticated browser check",
    );
    await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Email", { exact: true }).fill(email!);
    await page.getByLabel("Password", { exact: true }).fill(password!);
    const { artsOrigin } = (await (await page.request.get("/api/sso/configuration")).json()) as {
      artsOrigin: string;
    };
    await page.locator("form").getByRole("button", { name: "Sign In", exact: true }).click();
    await expect(page).toHaveURL(/\/admin(?:\/)?$/);
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign Out", exact: true }).first()).toBeEnabled();
    await page.getByRole("button", { name: "Articles", exact: true }).click();
    await page.getByRole("link", { name: "Create New Article", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Create New Article", exact: true }),
    ).toBeVisible();
    await expect(page.getByPlaceholder("Enter post title...")).toBeVisible();
    const artsPage = await page.context().newPage();
    await artsPage.goto(`${artsOrigin}/admin`);
    await expect(artsPage.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
    const logout = artsPage.waitForResponse(
      (response) =>
        response.url().endsWith("/api/auth/sign-out") && response.request().method() === "POST",
    );
    await artsPage.getByRole("button", { name: "Sign Out", exact: true }).click();
    expect((await logout).ok()).toBe(true);
    await expect(artsPage).toHaveURL(`${artsOrigin}/`);
    await artsPage.close();
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/sign-in/);
  });
});
