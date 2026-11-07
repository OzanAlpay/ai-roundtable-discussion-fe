import { expect, test } from '@playwright/test'

test('mock home shows office and can start a healthy meeting', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/')
  await expect(page.getByText('Copilot Roundtable')).toBeVisible()
  await expect(page.getByText(/DEMO · Simulated agents/i).first()).toBeVisible()
  await expect(page.getByRole('group', { name: /Office roundtable scene/i })).toBeVisible()

  await page.locator('.scenarios select').selectOption('healthy-two-rounds')
  await page.getByRole('button', { name: 'Start roundtable' }).click()

  await expect(page.getByText(/round_active|Round 1/i).first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(/Meeting completed|completed/i).first()).toBeVisible({
    timeout: 60_000,
  })
  await page.getByRole('tab', { name: 'Comparison' }).click()
  await expect(page.getByText(/Investigate first|Keep|Migrate/i).first()).toBeVisible()
})
