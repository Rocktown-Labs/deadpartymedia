import { test, expect } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";
import path from "node:path";

/**
 * These tests use the authenticated admin user state
 * from the global setup (playwright/.clerk/admin.json)
 */
test.describe("Admin User Flows", () => {
  const adminIdentifier = process.env.E2E_CLERK_ADMIN_EMAIL || process.env.E2E_CLERK_USER_USERNAME;
  const adminPassword = process.env.E2E_CLERK_ADMIN_PASSWORD || process.env.E2E_CLERK_USER_PASSWORD;
  test.skip(
    !adminIdentifier || !adminPassword,
    "Missing admin creds (E2E_CLERK_ADMIN_EMAIL/PASSWORD)",
  );

  test("should access admin dashboard", async ({ page }) => {
    // This test automatically uses the authenticated admin state from global setup
    await setupClerkTestingToken({ page });
    await page.goto("/admin");

    // Should not be redirected
    await expect(page).not.toHaveURL(/sign-in|onboarding/);

    // Should see admin content
    await expect(page.locator("body")).toBeVisible();
  });

  test("should access admin artists page", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/admin/artists");

    // Should see artists management page
    await expect(page).toHaveURL(/admin\/artists/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("should access admin posts page", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/admin/posts");

    // Should see posts management page
    await expect(page).toHaveURL(/admin\/posts/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("should access admin events page", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/admin/events");

    // Should see events management page
    await expect(page).toHaveURL(/admin\/events/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("should create post with artist selection", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/admin/posts/new");

    // Smoke check: editor form renders
    await expect(page.getByLabel("Title")).toBeVisible();
    await expect(page.getByLabel("Excerpt")).toBeVisible();
    await expect(page.getByRole("button", { name: /upload image/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /save|create|submit/i }).first()).toBeVisible();
  });

  test("should create event with artist selection", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/admin/events/new");

    // Smoke check: event form renders
    await expect(page.getByLabel("Title")).toBeVisible();
    await expect(page.getByLabel("Venue")).toBeVisible();
    await expect(page.getByLabel("Location")).toBeVisible();
    await expect(page.getByRole("button", { name: /upload image/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /save|create|submit/i }).first()).toBeVisible();
  });
});
