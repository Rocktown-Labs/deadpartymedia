import { test, expect } from "@playwright/test";
test.describe("Native authentication", () => {
  test("redirects unauthenticated dashboard requests", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/sign-in/);
    await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  });
  test("shows email and password sign-in", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /forgot/i })).toBeVisible();
  });
  test("shows native registration", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.getByLabel("Name", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  });
  test("signs in and opens the original article editor", async ({ page }) => {
    const email = process.env.E2E_ADMIN_EMAIL,
      password = process.env.E2E_ADMIN_PASSWORD;
    test.skip(
      !email || !password,
      "Set dedicated preview admin credentials to run the authenticated browser check",
    );
    await page.goto("/sign-in");
    await page.getByLabel("Email", { exact: true }).fill(email!);
    await page.getByLabel("Password", { exact: true }).fill(password!);
    await page.locator("form").getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/(admin|onboarding)(?:\/|$)/);
    await page.goto("/admin/posts/new");
    await expect(
      page.getByRole("heading", { name: "Create New Article", exact: true }),
    ).toBeVisible();
    await expect(page.getByPlaceholder("Enter post title...")).toBeVisible();
    await page.getByRole("button", { name: "Sign Out", exact: true }).click();
    await page.goto("/admin");
    await expect(page).toHaveURL(/sign-in/);
  });
});
