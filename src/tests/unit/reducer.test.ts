import { describe, expect, it } from 'vitest'
import {
  applyEvent,
  applySnapshot,
  commitApplied,
  createClientRunState,
} from '../../lib/domain/reducer'
import { createDefaultDraftConfig } from '../../lib/api/mock/fixtures'
import type { RunEvent, RunSnapshot } from '../../lib/domain/types'

function baseSnapshot(overrides: Partial<RunSnapshot> = {}): RunSnapshot {
  const config = createDefaultDraftConfig()
  return {
    schemaVersion: 1,
    id: 'run-1',
    revision: 1,
    lastEventSeq: 1,
    status: 'queued',
    config,
    participantLabels: config.participants.map((p) => ({
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
    ...overrides,
  }
}

function event(seq: number, snapshot: RunSnapshot): RunEvent {
  return {
    schemaVersion: 1,
    runId: snapshot.id,
    eventId: `e-${seq}`,
    seq,
    occurredAt: snapshot.updatedAt,
    detail: { type: 'run.created' },
    snapshot: { ...snapshot, revision: seq, lastEventSeq: seq },
  }
}

describe('client reducer', () => {
  it('applies the next event and ignores duplicates', () => {
    let state = createClientRunState()
    const snap = baseSnapshot()
    const first = applyEvent(state, event(1, snap))
    expect(first.kind).toBe('applied')
    if (first.kind !== 'applied') return
    state = commitApplied(state, first.snapshot)
    const dup = applyEvent(state, event(1, snap))
    expect(dup.kind).toBe('ignored')
  })

  it('detects sequence gaps', () => {
    let state = createClientRunState()
    const snap = baseSnapshot()
    const first = applyEvent(state, event(1, snap))
    if (first.kind === 'applied') state = commitApplied(state, first.snapshot)
    const gap = applyEvent(state, event(3, baseSnapshot({ revision: 3, lastEventSeq: 3 })))
    expect(gap.kind).toBe('gap')
  })

  it('rejects terminal resurrection via late active snapshot', () => {
    let state = createClientRunState()
    const terminal = baseSnapshot({
      status: 'cancelled',
      revision: 5,
      lastEventSeq: 5,
      endedAt: '2026-01-01T00:01:00.000Z',
    })
    const applied = applySnapshot(state, terminal, { allowJump: true })
    if (applied.kind === 'applied') state = commitApplied(state, applied.snapshot)
    const late = applySnapshot(
      state,
      baseSnapshot({ status: 'round_active', revision: 6, lastEventSeq: 6 }),
      { allowJump: true },
    )
    expect(late.kind).toBe('terminal_closed')
  })
})
