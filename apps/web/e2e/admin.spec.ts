import { test, expect } from '@playwright/test'
import { setupClerkTestingToken } from '@clerk/testing/playwright'

/**
 * These tests use the authenticated admin user state
 * from the global setup (playwright/.clerk/admin.json)
 */
test.describe('Admin User Flows', () => {
  test('should access admin dashboard', async ({ page }) => {
    // This test automatically uses the authenticated admin state from global setup
    await setupClerkTestingToken({ page })
    await page.goto('/admin')
    
    // Should not be redirected
    await expect(page).not.toHaveURL(/sign-in|onboarding/)
    
    // Should see admin content
    await expect(page.locator('body')).toBeVisible()
  })

  test('should access admin artists page', async ({ page }) => {
    await setupClerkTestingToken({ page })
    await page.goto('/admin/artists')
    
    // Should see artists management page
    await expect(page).toHaveURL(/admin\/artists/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('should access admin posts page', async ({ page }) => {
    await setupClerkTestingToken({ page })
    await page.goto('/admin/posts')
    
    // Should see posts management page
    await expect(page).toHaveURL(/admin\/posts/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('should access admin events page', async ({ page }) => {
    await setupClerkTestingToken({ page })
    await page.goto('/admin/events')
    
    // Should see events management page
    await expect(page).toHaveURL(/admin\/events/)
    await expect(page.locator('body')).toBeVisible()
  })
})
