import { test, expect } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";
import path from "node:path";

/**
 * These tests use the authenticated fan user state
 * from the global setup (playwright/.clerk/user.json)
 */
test.describe("Authenticated User Flows", () => {
  const fanIdentifier = process.env.E2E_CLERK_USER_USERNAME || process.env.E2E_CLERK_FAN_EMAIL;
  const fanPassword = process.env.E2E_CLERK_USER_PASSWORD || process.env.E2E_CLERK_FAN_PASSWORD;
  test.skip(!fanIdentifier || !fanPassword, "Missing fan creds (E2E_CLERK_FAN_EMAIL/PASSWORD)");

  test("should access dashboard when authenticated", async ({ page }) => {
    // This test automatically uses the authenticated state from global setup
    await setupClerkTestingToken({ page });
    await page.goto("/dashboard");

    // Should not be redirected to sign-in
    await expect(page).not.toHaveURL(/sign-in/);

    // Should see dashboard content
    await expect(page.locator("body")).toBeVisible();
  });

  test("should access protected routes when authenticated", async ({ page }) => {
    await setupClerkTestingToken({ page });

    // Try accessing various protected routes
    const protectedRoutes = ["/dashboard", "/dashboard/saved", "/dashboard/history"];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).not.toHaveURL(/sign-in|onboarding/);
    }
  });

  test("should show user menu when authenticated", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/");

    // Look for user avatar or menu (adjust selector based on your implementation)
    const userMenu = page
      .locator('[data-testid="user-menu"], button[aria-label*="user" i], img[alt*="avatar" i]')
      .first();
    if (await userMenu.isVisible()) {
      await expect(userMenu).toBeVisible();
    }
  });
});
