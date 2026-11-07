import type { RunSnapshot } from '../domain/types'

export function exportJson(snapshot: RunSnapshot): string {
  return JSON.stringify(
    {
      schemaVersion: 1 as const,
      exportedAt: new Date().toISOString(),
      demo: true,
      run: snapshot,
    },
    null,
    2,
  )
}
