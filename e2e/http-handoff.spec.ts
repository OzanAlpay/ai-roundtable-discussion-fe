import { expect, test } from '@playwright/test'
import { createTestMock } from '../src/lib/api/mock/mockRoundtableApi'
import type { Catalog, DiscussionConfig, RunEvent } from '../src/lib/domain/types'

// These are browser-intercepted responses, not an application backend.
const catalog: Catalog = {
  schemaVersion: 1,
  providers: [{ id: 'future-gateway', name: 'Work gateway', iconKey: 'neutral' }],
  models: [
    {
      id: 'backend-model-42',
      providerId: 'future-gateway',
      name: 'Backend model',
      isDemo: false,
      availability: 'available',
    },
  ],
}
test('HTTP mode uses backend catalog IDs and the same UI for JSON/SSE', async ({ page }) => {
  const mock = createTestMock({ catalog })
  let received: DiscussionConfig | undefined
  let events: RunEvent[] = []
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request(),
      url = new URL(request.url())
    if (url.pathname.endsWith('/catalog')) return route.fulfill({ json: catalog })
    if (url.pathname.endsWith('/runs') && request.method() === 'POST') {
      const input = request.postDataJSON()
      received = input.config
      const run = await mock.createRun(input)
      mock.subscribe(run.id, {
        afterSeq: run.lastEventSeq,
        onEvent: (e) => events.push(e),
        onConnection: () => {},
        onError: () => {},
      })
      mock.advance(1000)
      return route.fulfill({ status: 201, json: run })
    }
    if (url.pathname.endsWith('/events'))
      return route.fulfill({
        contentType: 'text/event-stream',
        body: events
          .map((e) => `id: ${e.seq}\nevent: roundtable\ndata: ${JSON.stringify(e)}\n\n`)
          .join(''),
      })
    return route.fulfill({
      status: 404,
      json: { error: { code: 'not_found', message: 'Not found', retryable: false } },
    })
  })
  await page.goto('http://127.0.0.1:5175/')
  await expect(page.getByText('Connected API mode', { exact: true })).toBeVisible()
  await expect(page.getByText('DEMO · Simulated agents', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Start roundtable' }).click()
  await expect(page.getByRole('button', { name: 'See what changed' })).toBeVisible()
  expect(
    received!.participants.every(
      (p) => p.providerId === 'future-gateway' && p.modelId === 'backend-model-42',
    ),
  ).toBe(true)
  await page.getByRole('tab', { name: 'Round 2', exact: true }).click()
  await expect(page.locator('[data-response-id]')).toHaveCount(3)
  await expect(
    page.getByText('Demo content only — responses are simulated fixtures.', { exact: true }),
  ).toHaveCount(0)
  mock.dispose()
})
test('HTTP catalog failure is recoverable and does not invent a demo catalog', async ({ page }) => {
  let unavailable = true
  await page.route('**/api/v1/catalog', (route) =>
    unavailable
      ? route.fulfill({
          status: 503,
          json: {
            error: { code: 'unavailable', message: 'Service is unavailable', retryable: true },
          },
        })
      : route.fulfill({ json: catalog }),
  )
  await page.goto('http://127.0.0.1:5175/')
  await expect(page.getByRole('alert')).toContainText('Cannot reach')
  await expect(page.getByRole('button', { name: 'Start roundtable' })).toHaveCount(0)
  unavailable = false
  await page.getByRole('button', { name: 'Retry catalog' }).click()
  await expect(page.getByRole('button', { name: 'Start roundtable' })).toBeEnabled()
})
