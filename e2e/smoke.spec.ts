import { expect, test, type Page } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

async function startBattle(page: Page, theme = /Classic Naval/) {
  await page.goto('./')
  await page.getByRole('button', { name: theme }).click()
  await page.getByRole('button', { name: /Auto-place/ }).click()
  await page.getByRole('button', { name: 'Start battle' }).click()
  await expect(page.getByText('Your turn')).toBeVisible()
}

const enemyCell = (page: Page, label: string) =>
  page.getByRole('group', { name: /Enemy waters|Hostile waters|Calico's waters/ }).locator(`[data-cell="${label}"]`)

test('home page loads with title and credit', async ({ page }) => {
  await page.goto('./')
  await expect(page).toHaveTitle(/AI Battleship/)
  await expect(page.getByText('Built by Blake with Devin')).toBeVisible()
  await expect(page.getByRole('button', { name: /Roman Navy/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Pirate Seas/ })).toBeVisible()
})

test('manual placement by tapping, then start', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: /Pirate Seas/ }).click()
  const board = page.getByRole('group', { name: /placement/ })
  for (const row of ['A', 'C', 'E', 'G', 'I']) await board.locator(`[data-cell="${row}1"]`).click()
  await expect(page.getByText('Fleet ready.')).toBeVisible()
  await page.getByRole('button', { name: 'Start battle' }).click()
  await expect(page.getByText('Your turn')).toBeVisible()
})

test('double tap fires only once and turn passes to the AI', async ({ page }) => {
  await startBattle(page)
  await enemyCell(page, 'E5').dblclick()
  await expect(page.getByRole('status').filter({ hasText: /You fired at E5|You sank|is aiming/ }).first()).toBeVisible()
  await expect(page.getByText('Your turn')).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: /fired at|hit your|sank your/ })).toBeVisible()
  await expect(enemyCell(page, 'E5')).toHaveAttribute('aria-label', /E5, (miss|hit)/)
})

test('leaving mid-turn does not leak the AI move into the next match', async ({ page }) => {
  await startBattle(page)
  await enemyCell(page, 'A1').click()
  await page.getByRole('button', { name: 'New game' }).click()
  await page.getByRole('button', { name: 'Yes' }).click()
  await page.getByRole('button', { name: /Roman Navy/ }).click()
  await page.getByRole('button', { name: /Auto-place/ }).click()
  await page.getByRole('button', { name: 'Start battle' }).click()
  await page.waitForTimeout(1500)
  await expect(page.getByText(/fleet is hidden/)).toBeVisible()
  await expect(page.getByText('Your turn')).toBeVisible()
})

test('full game reaches a result screen with rematch and change theme', async ({ page }) => {
  test.setTimeout(180_000)
  await startBattle(page)
  const rows = 'ABCDEFGHIJ'
  for (let i = 0; i < 100; i++) {
    const result = page.locator('.result-card')
    if (await result.isVisible()) break
    await expect(page.getByText('Your turn').or(result)).toBeVisible({ timeout: 10_000 })
    if (await result.isVisible()) break
    await enemyCell(page, `${rows[Math.floor(i / 10)]}${(i % 10) + 1}`).click()
  }
  await expect(page.getByRole('heading', { name: /Victory!|Defeat/ })).toBeVisible()
  await page.getByRole('button', { name: 'Rematch' }).click()
  await expect(page.getByText('Fleet ready.')).toBeVisible()
  await page.getByRole('button', { name: 'Start battle' }).click()
  await expect(page.getByText('Your turn')).toBeVisible()
  await page.getByRole('button', { name: 'New game' }).click()
  await page.getByRole('button', { name: 'Yes' }).click()
  await expect(page.getByText('Choose your opponent')).toBeVisible()
})
