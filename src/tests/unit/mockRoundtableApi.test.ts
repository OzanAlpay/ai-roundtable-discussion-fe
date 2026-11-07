import { describe, expect, it } from 'vitest'
import { createFakeClock } from '../../lib/api/mock/scheduler'
import { createTestMock } from '../../lib/api/mock/mockRoundtableApi'
import { createDefaultDraftConfig, createDefaultParticipants } from '../../lib/api/mock/fixtures'

function waitFor(
  mock: ReturnType<typeof createTestMock>,
  clock: ReturnType<typeof createFakeClock>,
  predicate: () => boolean,
  maxMs = 20_000,
): void {
  let elapsed = 0
  while (!predicate() && elapsed < maxMs) {
    clock.advance(25)
    elapsed += 25
    mock.advance(0)
  }
  expect(predicate()).toBe(true)
}

describe('MockRoundtableApi', () => {
  it('runs a healthy two-round barrier with mind-change and disagreement', async () => {
    const clock = createFakeClock()
    const mock = createTestMock({ clock, scenario: 'healthy-two-rounds', seed: 7 })
    const config = createDefaultDraftConfig()
    const events: string[] = []
    const run = await mock.createRun({ requestId: 'req-1', config })
    mock.subscribe(run.id, {
      afterSeq: run.lastEventSeq,
      onEvent: (e) => events.push(e.detail.type),
      onConnection: () => {},
      onError: () => {},
    })

    waitFor(mock, clock, () => {
      const snap = events.includes('run.completed')
      return snap
    })

    const final = await mock.getRun(run.id)
    expect(final.status).toBe('completed')
    expect(final.rounds).toHaveLength(2)
    expect(final.rounds[0]!.published?.responses).toHaveLength(3)
    expect(final.rounds[1]!.published?.responses).toHaveLength(3)

    const r1 = final.rounds[0]!.published!.responses
    const r2 = final.rounds[1]!.published!.responses
    const architect2 = r2.find((r) => r.participantId === 'p-architect')!
    const skeptic2 = r2.find((r) => r.participantId === 'p-skeptic')!
    expect(architect2.revision.kind).toBe('changed')
    expect(architect2.revision.reason).toBeTruthy()
    expect(architect2.revision.influencedBy.length).toBeGreaterThan(0)
    expect(skeptic2.revision.kind).toBe('unchanged')
    expect(skeptic2.position).toBe(r1.find((r) => r.participantId === 'p-skeptic')!.position)

    // Barrier: first finished participant must not publish early
    expect(events.indexOf('round.published')).toBeGreaterThan(events.indexOf('participant.updated'))
    mock.dispose()
  })

  it('blocks on timeout and succeeds after retry with same input', async () => {
    const clock = createFakeClock()
    const mock = createTestMock({ clock, scenario: 'timeout-then-retry', seed: 3 })
    const config = { ...createDefaultDraftConfig(), attemptTimeoutMs: 10_000 }
    const created = await mock.createRun({ requestId: 'req-timeout', config })
    let blocked = false
    for (let i = 0; i < 800 && !blocked; i++) {
      clock.advance(25)
      const snap = await mock.getRun(created.id)
      blocked = snap.status === 'round_blocked'
    }
    expect(blocked).toBe(true)
    const before = await mock.getRun(created.id)
    const round = before.rounds[0]!
    const failed = round.slots.find((s) => s.status === 'failed')!
    const inputId = round.inputSnapshotId
    const peer = round.slots.find((s) => s.status === 'submitted')!

    const afterRetry = await mock.command(
      created.id,
      { type: 'retry', roundNumber: 1, participantId: failed.participantId },
      { requestId: 'retry-1', expectedRevision: before.revision },
    )
    expect(afterRetry.status).toBe('round_active')

    for (let i = 0; i < 800; i++) {
      clock.advance(25)
      const snap = await mock.getRun(created.id)
      if (snap.rounds[0]?.published) break
    }
    const published = await mock.getRun(created.id)
    expect(published.rounds[0]!.inputSnapshotId).toBe(inputId)
    expect(
      published.rounds[0]!.slots.find((s) => s.participantId === peer.participantId)?.response?.id,
    ).toBe(peer.response!.id)
    expect(published.rounds[0]!.published?.responses.length).toBeGreaterThanOrEqual(2)
    mock.dispose()
  })

  it('rejects exclusion that would leave fewer than two participants', async () => {
    const clock = createFakeClock()
    const mock = createTestMock({ clock, scenario: 'insufficient-participants', seed: 1 })
    const participants = createDefaultParticipants().slice(0, 2)
    const config = { ...createDefaultDraftConfig(), participants }
    const created = await mock.createRun({ requestId: 'req-insuf', config })
    for (let i = 0; i < 800; i++) {
      clock.advance(25)
      if ((await mock.getRun(created.id)).status === 'round_blocked') break
    }
    const blocked = await mock.getRun(created.id)
    expect(blocked.status).toBe('round_blocked')
    const failed = blocked.rounds[0]!.slots.find((s) => s.status === 'failed')!
    await expect(
      mock.command(
        created.id,
        { type: 'exclude', roundNumber: 1, participantId: failed.participantId },
        { requestId: 'ex-1', expectedRevision: blocked.revision },
      ),
    ).rejects.toThrow(/fewer than two/i)
    mock.dispose()
  })

  it('cancels scheduled work and keeps unpublished distinct', async () => {
    const clock = createFakeClock()
    const mock = createTestMock({ clock, scenario: 'cancellation', seed: 9 })
    const created = await mock.createRun({
      requestId: 'req-cancel',
      config: createDefaultDraftConfig(),
    })
    clock.advance(30)
    const mid = await mock.getRun(created.id)
    const cancelled = await mock.command(
      created.id,
      { type: 'cancel' },
      { requestId: 'cancel-1', expectedRevision: mid.revision },
    )
    expect(cancelled.status).toBe('cancelled')
    clock.advance(10_000)
    const later = await mock.getRun(created.id)
    expect(later.status).toBe('cancelled')
    expect(later.rounds.every((r) => !r.published || r.status === 'published')).toBe(true)
    mock.dispose()
  })

  it('is idempotent on create request IDs', async () => {
    const clock = createFakeClock()
    const mock = createTestMock({ clock, seed: 2 })
    const config = createDefaultDraftConfig()
    const a = await mock.createRun({ requestId: 'same', config })
    const b = await mock.createRun({ requestId: 'same', config })
    expect(a.id).toBe(b.id)
    await expect(
      mock.createRun({ requestId: 'same', config: { ...config, totalRounds: 3 } }),
    ).rejects.toThrow(/idempotency/i)
    mock.dispose()
  })
})
