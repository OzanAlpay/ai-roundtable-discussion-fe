import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const outDir = '/cursor/stores/self/media'
await mkdir(outDir, { recursive: true })

const browser = await chromium.launch()
const base = process.env.BASE_URL ?? 'http://127.0.0.1:5173'

async function shot(name, width, height, after) {
  const page = await browser.newPage({ viewport: { width, height } })
  await page.goto(base, { waitUntil: 'networkidle' })
  if (after) await after(page)
  await page.screenshot({
    path: path.join(outDir, name),
    fullPage: false,
  })
  await page.close()
  console.log('wrote', name)
}

await shot('office-desktop.png', 1440, 900)
await shot('office-mobile.png', 390, 844)

await shot('comparison-desktop.png', 1440, 900, async (page) => {
  await page.locator('.scenarios select').selectOption('healthy-two-rounds')
  await page.getByRole('button', { name: 'Start roundtable' }).click()
  await page.getByText(/Meeting completed|status completed/i).first().waitFor({ timeout: 90_000 })
  await page.getByRole('tab', { name: 'Comparison' }).click()
  await page.waitForTimeout(500)
})

await browser.close()
console.log('done')
