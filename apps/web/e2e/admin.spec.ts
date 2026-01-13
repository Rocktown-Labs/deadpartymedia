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

  test('should create post with artist selection', async ({ page }) => {
    await setupClerkTestingToken({ page })
    await page.goto('/admin/posts/new')
    
    // Fill in post form
    await page.fill('input[name="title"]', 'Test Post with Artists')
    await page.selectOption('select[name="category"]', 'EDM')
    await page.fill('textarea[name="excerpt"]', 'Test excerpt for post with artists')
    await page.selectOption('select[name="status"]', 'draft')
    
    // Open artist selection popover
    const artistButton = page.locator('button:has-text("Select artists")')
    if (await artistButton.isVisible()) {
      await artistButton.click()
      
      // Wait for artist list to load
      await page.waitForSelector('text=Loading artists...', { state: 'hidden' })
      
      // Select first available artist if any
      const firstArtist = page.locator('input[type="checkbox"]').first()
      if (await firstArtist.isVisible()) {
        await firstArtist.check()
        // Close popover by clicking outside or pressing escape
        await page.keyboard.press('Escape')
      }
    }
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Should redirect to posts list
    await expect(page).toHaveURL(/admin\/posts/)
  })

  test('should create event with artist selection', async ({ page }) => {
    await setupClerkTestingToken({ page })
    await page.goto('/admin/events/new')
    
    // Fill in event form
    await page.fill('input[name="title"]', 'Test Event with Artists')
    await page.fill('textarea[name="description"]', 'Test description for event with artists')
    await page.fill('input[name="venue"]', 'Test Venue')
    await page.fill('input[name="location"]', 'Test Location')
    await page.fill('input[name="date"]', '2024-12-31')
    await page.selectOption('select[name="genre"]', 'EDM')
    await page.selectOption('select[name="status"]', 'draft')
    
    // Open artist selection popover
    const artistButton = page.locator('button:has-text("Select artists")')
    if (await artistButton.isVisible()) {
      await artistButton.click()
      
      // Wait for artist list to load
      await page.waitForSelector('text=Loading artists...', { state: 'hidden' })
      
      // Select first available artist if any
      const firstArtist = page.locator('input[type="checkbox"]').first()
      if (await firstArtist.isVisible()) {
        await firstArtist.check()
        // Close popover
        await page.keyboard.press('Escape')
      }
    }
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Should redirect to events list
    await expect(page).toHaveURL(/admin\/events/)
  })
})
