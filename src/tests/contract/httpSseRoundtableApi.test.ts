import { describe, expect, it, vi } from 'vitest'
import { HttpSseRoundtableApi } from '../../lib/api/httpSseRoundtableApi'
import { DEMO_CATALOG } from '../../lib/api/mock/catalog'
import { createDefaultDraftConfig } from '../../lib/api/mock/fixtures'

describe('HttpSseRoundtableApi', () => {
  it('calls catalog and create routes with omit credentials', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/catalog')) {
        return new Response(JSON.stringify(DEMO_CATALOG), { status: 200 })
      }
      if (url.endsWith('/runs')) {
        const body = JSON.parse(String(init?.body))
        expect(body.requestId).toBe('r1')
        return new Response(
          JSON.stringify({
            schemaVersion: 1,
            id: 'run-http',
            revision: 1,
            lastEventSeq: 1,
            status: 'queued',
            config: body.config,
            participantLabels: body.config.participants.map((p: { id: string }) => ({
              participantId: p.id,
              providerName: 'Copilot',
              modelName: 'Example GPT',
            })),
            excludedParticipantIds: [],
            currentRoundNumber: null,
            rounds: [],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            endedAt: null,
            terminalError: null,
          }),
          { status: 201 },
        )
      }
      return new Response('missing', { status: 404 })
    })

    const api = new HttpSseRoundtableApi({
      baseUrl: '/api/v1',
      fetch: fetchMock as unknown as typeof fetch,
    })
    const catalog = await api.getCatalog()
    expect(catalog.providers.length).toBeGreaterThan(0)
    const run = await api.createRun({ requestId: 'r1', config: createDefaultDraftConfig() })
    expect(run.id).toBe('run-http')
    expect(fetchMock.mock.calls[0]![1]?.credentials).toBe('omit')
    api.dispose()
  })

  it('surfaces a clear error when the backend is missing', async () => {
    const api = new HttpSseRoundtableApi({
      baseUrl: '/api/v1',
      fetch: async () => {
        throw new TypeError('Failed to fetch')
      },
    })
    await expect(api.getCatalog()).rejects.toThrow(/Cannot reach the roundtable API/i)
    api.dispose()
  })
})
