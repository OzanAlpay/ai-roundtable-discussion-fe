import { describe, it, expect } from 'vitest'
import { createTestMock } from '../../lib/api/mock/mockRoundtableApi'
import { createDefaultDraftConfig } from '../../lib/api/mock/fixtures'
import { createFakeClock } from '../../lib/api/mock/scheduler'
import { assertRunSnapshot } from '../../lib/domain/invariants'
import { applySnapshot, commitApplied, createClientRunState } from '../../lib/domain/reducer'
import { unpublishedPartials } from '../../lib/domain/selectors'
import { loadDraft } from '../../lib/state/draftPersistence'
import { reconcileDraft } from '../../lib/domain/draft'
import { exportMarkdown } from '../../lib/export/markdown'
import { exportJson } from '../../lib/export/json'
import { resolveMode } from '../../lib/api/createRoundtableApi'
import { SseParser } from '../../lib/api/sseParser'

describe('backend handoff regressions', () => {
  it('never exposes partial responses while the barrier is active', async () => {
    const clock = createFakeClock(),
      api = createTestMock({ clock, scenario: 'slow-participant' })
    const run = await api.createRun({ requestId: 'partial', config: createDefaultDraftConfig() })
    clock.advance(800)
    const mid = await api.getRun(run.id)
    expect(mid.rounds[0]!.slots.some((s) => s.status === 'submitted')).toBe(true)
    expect(mid.rounds[0]!.published).toBeNull()
    expect(unpublishedPartials(mid)).toEqual([])
    expect(exportMarkdown(mid)).not.toContain('A modern library')
    const stopped = await api.command(
      run.id,
      { type: 'cancel' },
      { requestId: 'cancel', expectedRevision: mid.revision },
    )
    expect(unpublishedPartials(stopped).length).toBeGreaterThan(0)
    expect(exportMarkdown(stopped)).toContain('Incomplete meeting')
    api.dispose()
  })
  it('accepts every emitted snapshot across three rounds', async () => {
    const clock = createFakeClock(),
      api = createTestMock({ clock })
    const run = await api.createRun({
      requestId: 'all',
      config: { ...createDefaultDraftConfig(), totalRounds: 3 },
    })
    let previous = commitApplied(createClientRunState(), run)
    api.subscribe(run.id, {
      afterSeq: run.lastEventSeq,
      onConnection: () => {},
      onError: () => {},
      onEvent: (e) => {
        expect(() => assertRunSnapshot(e.snapshot)).not.toThrow()
        const result = applySnapshot(previous, e.snapshot, { allowJump: true })
        expect(result.kind).toBe('applied')
        if (result.kind === 'applied') previous = commitApplied(previous, result.snapshot)
      },
    })
    clock.advance(1000)
    expect(previous.snapshot?.status).toBe('completed')
    expect(previous.snapshot?.rounds[2]?.published?.responses[0]?.revision.kind).toBe('changed')
    api.dispose()
  })
  it('rejects rewritten published history and unresolved publication', async () => {
    const clock = createFakeClock(),
      api = createTestMock({ clock, scenario: 'slow-participant' })
    const run = await api.createRun({ requestId: 'history', config: createDefaultDraftConfig() })
    clock.advance(2300)
    const first = await api.getRun(run.id)
    const edited = structuredClone(first)
    edited.revision++
    edited.lastEventSeq++
    edited.rounds[0]!.published!.responses[0]!.position = 'Rewritten'
    edited.rounds[0]!.slots[0]!.response!.position = 'Rewritten'
    const state = commitApplied(createClientRunState(), first)
    expect(applySnapshot(state, edited, { allowJump: true }).kind).toBe('error')
    const invalid = structuredClone(first)
    invalid.rounds[0]!.slots[0]!.status = 'thinking'
    expect(() => assertRunSnapshot(invalid)).toThrow()
    api.dispose()
  })
  it('respects configured timeout duration', async () => {
    const clock = createFakeClock(),
      api = createTestMock({ clock, scenario: 'timeout-then-retry' })
    const run = await api.createRun({
      requestId: 'timeout',
      config: { ...createDefaultDraftConfig(), attemptTimeoutMs: 10000 },
    })
    clock.advance(9999)
    expect((await api.getRun(run.id)).status).toBe('round_active')
    clock.advance(1)
    expect((await api.getRun(run.id)).status).toBe('round_blocked')
    api.dispose()
  })
  it('reconciles demo IDs using an unrelated backend catalog', () => {
    const draft = reconcileDraft(createDefaultDraftConfig(), {
      schemaVersion: 1,
      providers: [{ id: 'gateway', name: 'Gateway', iconKey: 'neutral' }],
      models: [
        {
          id: 'model-real',
          providerId: 'gateway',
          name: 'Backend model',
          availability: 'available',
          isDemo: false,
        },
      ],
    })
    expect(
      draft.participants.every((p) => p.providerId === 'gateway' && p.modelId === 'model-real'),
    ).toBe(true)
  })
  it('does not trust malformed persisted drafts', () => {
    localStorage.setItem(
      'copilot-roundtable.draft.v1',
      JSON.stringify({ schemaVersion: 1, config: { participants: [] } }),
    )
    expect(loadDraft().participants).toHaveLength(3)
    localStorage.clear()
  })
  it('distinguishes API outputs from simulated exports', async () => {
    const api = createTestMock()
    const run = await api.createRun({ requestId: 'export', config: createDefaultDraftConfig() })
    expect(exportMarkdown(run, 'http')).not.toContain('Simulated demo')
    expect(JSON.parse(exportJson(run, 'http')).demo).toBe(false)
    expect(() => resolveMode('htttp')).toThrow()
    api.dispose()
  })
  it('handles CRLF split at every byte and discards incomplete SSE records', () => {
    const parser = new SseParser(),
      messages = []
    for (const c of 'id: 3\r\nevent: roundtable\r\ndata: hello\r\n\r\n')
      messages.push(...parser.push(c))
    expect(messages).toHaveLength(1)
    expect(messages[0]!.data).toBe('hello')
    parser.push('data: unfinished\n')
    expect(parser.flush()).toEqual([])
  })
})
