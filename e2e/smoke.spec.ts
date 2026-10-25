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

test('ships fill their squares in both orientations', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: /Roman Navy/ }).click()
  const board = page.getByRole('group', { name: /placement/ })
  await board.locator('[data-cell="J1"]').click()
  await page.getByRole('button', { name: /Rotate/ }).click()
  await board.locator('[data-cell="A10"]').click()

  const cell = (await board.locator('[data-cell="E5"]').boundingBox())!
  const sprites = page.locator('.ship .ship-hull')
  const carrier = (await sprites.nth(0).boundingBox())!
  const battleship = (await sprites.nth(1).boundingBox())!
  expect(carrier.width).toBeGreaterThan(cell.width * 5 * 0.9)
  expect(battleship.height).toBeGreaterThan(cell.height * 4 * 0.9)
})

test('special mode: pick mode before placing, then use an ability', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('radio', { name: /Special/ }).click()
  await page.getByRole('button', { name: /Classic Naval/ }).click()
  await page.getByRole('button', { name: /Auto-place/ }).click()
  await page.getByRole('button', { name: 'Start battle' }).click()

  const cards = page.locator('.ability-card')
  await expect(cards).toHaveCount(3)
  await expect(page.locator('.ability-chips li')).toHaveCount(3)

  const card = cards.first()
  await card.click()
  // Aim and confirm on open squares until the ability resolves (Broadside needs three).
  const targets = ['E5', 'C3', 'H8', 'B9', 'J2', 'F6']
  for (const label of targets) {
    if (await card.isDisabled()) break
    const cell = page.getByRole('group', { name: /Enemy waters/ }).locator(`[data-cell="${label}"]`)
    await cell.click()
    if (!(await card.isDisabled()) && (await card.getAttribute('aria-pressed')) === 'true') await cell.click()
  }
  await expect(card).toBeDisabled()
  await expect(card).toContainText('Used')
  await expect(page.getByRole('status').filter({ hasText: /used|spotted|unhit ship/ }).first()).toBeVisible()
})

test('trading post: buy a co-captain, it persists and rides into battle', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return
    localStorage.setItem('ai-battleship:wallet', JSON.stringify({ gold: 120, owned: [], equipped: null, lastRewarded: null }))
    sessionStorage.setItem('seeded', '1')
  })
  await page.goto('./')
  await page.getByRole('button', { name: /Trading Post/ }).click()
  await expect(page.locator('.gold-balance')).toContainText('120 gold')
  await expect(page.locator('.pet-card', { hasText: 'Sharky' }).getByRole('button', { name: /Buy/ })).toBeDisabled()
  const dragon = page.locator('.pet-card', { hasText: 'Dragon' })
  await dragon.getByRole('button', { name: /Buy/ }).click()
  await expect(page.locator('.gold-balance')).toContainText('20 gold')
  await expect(dragon.getByRole('button', { name: /Equipped/ })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('button', { name: /Trading Post/ })).toContainText('20 gold')
  await page.getByRole('button', { name: /Classic Naval/ }).click()
  await page.getByRole('button', { name: /Auto-place/ }).click()
  await page.getByRole('button', { name: 'Start battle' }).click()
  await expect(page.getByRole('img', { name: /Co-captain: Dragon/ })).toBeVisible()
  await page.getByRole('group', { name: /Enemy waters/ }).locator('[data-cell="A1"]').click()
  await expect(page.locator('.pet-drop')).toHaveCount(1)
})

test("two open tabs never overwrite each other's gold or pets", async ({ context }) => {
  const a = await context.newPage()
  await a.goto('./')
  await a.evaluate(() =>
    localStorage.setItem('ai-battleship:wallet', JSON.stringify({ gold: 150, owned: [], equipped: null, lastRewarded: null })),
  )
  await a.reload()
  const b = await context.newPage()
  await b.goto('./')
  for (const p of [a, b]) await p.getByRole('button', { name: /Trading Post/ }).click()

  await a.locator('.pet-card', { hasText: 'Dragon' }).getByRole('button', { name: /Buy/ }).click()
  await expect(b.locator('.gold-balance')).toHaveText(/🪙 50 gold/)
  await b.locator('.pet-card', { hasText: 'Parrot' }).getByRole('button', { name: /Buy/ }).click()
  await expect(b.locator('.gold-balance')).toHaveText(/🪙 0 gold/)

  await a.reload()
  await a.getByRole('button', { name: /Trading Post/ }).click()
  await expect(a.locator('.pet-card', { hasText: 'Dragon' }).getByRole('button', { name: 'Equip' })).toBeVisible()
  await expect(a.locator('.pet-card', { hasText: 'Parrot' }).getByRole('button', { name: /Equipped/ })).toBeVisible()
})
