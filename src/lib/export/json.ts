import type { RunSnapshot } from '../domain/types'

export function exportJson(snapshot: RunSnapshot, mode: 'mock' | 'http' = 'mock'): string {
  return JSON.stringify(
    {
      schemaVersion: 1 as const,
      exportedAt: new Date().toISOString(),
      demo: mode === 'mock',
      incomplete: snapshot.status !== 'completed',
      run: snapshot,
    },
    null,
    2,
  )
}
