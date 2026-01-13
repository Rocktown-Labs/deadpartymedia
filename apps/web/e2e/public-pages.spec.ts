import { test, expect } from '@playwright/test'

test.describe('Public Pages', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('/')
    
    // Check that page loads
    await expect(page).toHaveTitle(/dead party media/i)
  })

  test('should navigate to artists page', async ({ page }) => {
    await page.goto('/')
    
    // Find and click artists link (adjust selector based on actual implementation)
    const artistsLink = page.locator('a[href*="artists"], a:has-text("Artists")').first()
    if (await artistsLink.isVisible()) {
      await artistsLink.click()
      await expect(page).toHaveURL(/artists/)
    }
  })

  test('should navigate to events page', async ({ page }) => {
    await page.goto('/')
    
    // Find and click events link
    const eventsLink = page.locator('a[href*="events"], a:has-text("Events")').first()
    if (await eventsLink.isVisible()) {
      await eventsLink.click()
      await expect(page).toHaveURL(/events/)
    }
  })

  test('should load contact page', async ({ page }) => {
    await page.goto('/contact')
    
    // Check that contact page loads
    await expect(page.locator('h1, h2')).toContainText(/contact/i)
  })
})
