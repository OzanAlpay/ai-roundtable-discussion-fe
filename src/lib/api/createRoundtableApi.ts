import type { DemoScenarioId } from '../domain/types'
import { HttpSseRoundtableApi } from './httpSseRoundtableApi'
import { createMockRoundtableApi, type MockRoundtableApi } from './mock/mockRoundtableApi'
import type { RoundtableApi } from './RoundtableApi'

export type RoundtableMode = 'mock' | 'http'

export interface CreateApiResult {
  api: RoundtableApi
  mode: RoundtableMode
  mock: MockRoundtableApi | null
}

export function resolveMode(raw: string | undefined): RoundtableMode {
  if (raw === 'http' || raw === 'mock') return raw
  if (!raw) return 'mock'
  throw new Error(`Unknown roundtable mode: ${raw}. Use mock or http.`)
}

export function createRoundtableApi(options?: {
  mode?: RoundtableMode
  baseUrl?: string
  scenario?: DemoScenarioId
}): CreateApiResult {
  const mode = options?.mode ?? resolveMode(import.meta.env.VITE_ROUNDTABLE_MODE)
  if (mode === 'http') {
    const baseUrl =
      options?.baseUrl ??
      (import.meta.env.VITE_ROUNDTABLE_API_BASE_URL as string | undefined) ??
      '/api/v1'
    return {
      mode,
      api: new HttpSseRoundtableApi({ baseUrl }),
      mock: null,
    }
  }

  const mock = createMockRoundtableApi({
    scenario: options?.scenario ?? 'healthy-two-rounds',
    humanDelays: true,
  })
  return { mode: 'mock', api: mock, mock }
}
