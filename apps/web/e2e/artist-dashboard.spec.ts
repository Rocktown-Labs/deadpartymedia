import { test, expect } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

/**
 * These tests use the authenticated artist user state
 * from the global setup (playwright/.clerk/artist.json)
 */
test.describe("Artist Dashboard Flows", () => {
  const artistIdentifier =
    process.env.E2E_CLERK_ARTIST_EMAIL || process.env.E2E_CLERK_USER_USERNAME;
  const artistPassword =
    process.env.E2E_CLERK_ARTIST_PASSWORD || process.env.E2E_CLERK_USER_PASSWORD;
  test.skip(
    !artistIdentifier || !artistPassword,
    "Missing artist creds (E2E_CLERK_ARTIST_EMAIL/PASSWORD)",
  );

  test("should access artist dashboard", async ({ page }) => {
    // This test automatically uses the authenticated artist state from global setup
    await setupClerkTestingToken({ page });
    await page.goto("/artist-dashboard");

    // Should not be redirected
    await expect(page).not.toHaveURL(/sign-in|onboarding/);

    // Should see artist dashboard content
    await expect(page.locator("body")).toBeVisible();
  });

  test("should access artist profile page", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/artist-dashboard/profile");

    // Should see profile page
    await expect(page).toHaveURL(/artist-dashboard\/profile/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("should access artist articles page", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/artist-dashboard/articles");

    // Should see articles page
    await expect(page).toHaveURL(/artist-dashboard\/articles/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("should access artist events page", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/artist-dashboard/events");

    // Should see events page
    await expect(page).toHaveURL(/artist-dashboard\/events/);
    await expect(page.locator("body")).toBeVisible();
  });
});
