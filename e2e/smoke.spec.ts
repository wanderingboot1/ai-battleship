import { expect, test } from '@playwright/test'

test('home page loads with title and credit', async ({ page }) => {
  await page.goto('./')
  await expect(page).toHaveTitle(/AI Battleship/)
  await expect(page.getByText('Built by Blake with Devin')).toBeVisible()
})
