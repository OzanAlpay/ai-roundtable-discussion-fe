import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function scenario(page: import('@playwright/test').Page, id: string) {
  await page.getByText('Meeting options & demo scenarios', { exact: true }).click()
  await page.getByRole('combobox', { name: 'Scenario', exact: true }).selectOption(id)
}
test('healthy meeting, keyboard tabs, accessible details and exports', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('DEMO · Simulated agents', { exact: true })).toBeVisible()
  await expect(page.locator('[data-chair]')).toHaveCount(8)
  await page.getByRole('button', { name: 'Start roundtable' }).click()
  await expect(page.getByRole('heading', { name: 'What’s on the table?' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'See what changed' })).toBeVisible({
    timeout: 20000,
  })
  const overview = page.getByRole('tab', { name: 'Overview', exact: true })
  await overview.focus()
  await overview.press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Round 1', exact: true })).toBeFocused()
  await page.getByRole('tab', { name: 'Comparison' }).click()
  await expect(page.getByText('Investigate first', { exact: true }).first()).toBeVisible()
  const seat = page.getByRole('button', { name: /Architect, Example GPT Fast via OpenAI/ })
  await seat.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(seat).toBeFocused()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export Markdown' }).click()
  expect((await download).suggestedFilename()).toMatch(/\.md$/)
})
test('slow barrier conceals initial answers; cancellation reveals labeled partials', async ({
  page,
}) => {
  await page.goto('/')
  await scenario(page, 'slow-participant')
  await page.getByRole('button', { name: 'Start roundtable' }).click()
  await expect(page.getByText('2 of 3 responses ready', { exact: true })).toBeVisible()
  await expect(
    page.getByText(
      'A modern library would simplify long-term maintenance and reduce custom glue.',
      { exact: true },
    ),
  ).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Export JSON' })).toBeDisabled()
  await page.getByRole('button', { name: 'Stop', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Unpublished partial results' })).toBeVisible()
  await expect(page.getByText('Meeting cancelled.', { exact: true })).toBeAttached()
})
test('failed participant can be excluded and the remaining crew finishes', async ({ page }) => {
  await page.goto('/')
  await scenario(page, 'failure-then-exclusion')
  await page.getByRole('button', { name: 'Start roundtable' }).click()
  await page.getByRole('button', { name: 'Review Pragmatist' }).click({ timeout: 15000 })
  await page.getByRole('button', { name: 'Exclude', exact: true }).click()
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(page.getByRole('button', { name: 'See what changed' })).toBeVisible({
    timeout: 15000,
  })
  await expect(page.getByRole('button', { name: /Pragmatist.*Excluded/ })).toBeVisible()
})
test('disconnect and gapped event scenarios recover without duplicate opinions', async ({
  page,
}) => {
  for (const id of ['disconnect-reconnect', 'malformed-gapped-event']) {
    await page.goto('/')
    await scenario(page, id)
    await page.getByRole('button', { name: 'Start roundtable' }).click()
    await expect(page.getByRole('button', { name: 'See what changed' })).toBeVisible({
      timeout: 20000,
    })
    await page.getByRole('tab', { name: 'Round 2', exact: true }).click()
    await expect(page.locator('[data-response-id]')).toHaveCount(3)
  }
})
test('three rounds preserve the full revision history', async ({ page }) => {
  await page.goto('/')
  await scenario(page, 'three-round-reversal')
  await page.getByRole('button', { name: 'Start roundtable' }).click()
  await expect(page.getByRole('button', { name: 'See what changed' })).toBeVisible({
    timeout: 25000,
  })
  await page.getByRole('tab', { name: 'Comparison' }).click()
  await expect(page.getByText('Keep for now', { exact: true })).toBeVisible()
  await expect(page.getByText('R2: Investigate first (changed)', { exact: true })).toBeVisible()
})
test('all crew sizes keep eight chairs and mobile reflows without overflow', async ({ page }) => {
  await page.goto('/')
  for (let n = 3; n <= 6; n++) {
    await expect(page.locator('[data-chair]')).toHaveCount(8)
    await expect(page.locator('.room .agent')).toHaveCount(n)
    if (n < 6) await page.getByRole('button', { name: 'Add participant' }).click()
  }
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    await expect(page.locator('[data-chair]')).toHaveCount(8)
  }
})
test('setup passes automated accessibility checks and malformed saved draft recovers', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'copilot-roundtable.draft.v1',
      JSON.stringify({ schemaVersion: 1, config: { participants: [] } }),
    ),
  )
  await page.goto('/')
  await expect(page.locator('.room .agent')).toHaveCount(3)
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(results.violations).toEqual([])
})
