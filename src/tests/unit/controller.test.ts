import { describe, it, expect, vi } from 'vitest'
import { RoundtableController } from '../../lib/state/roundtable.svelte'
import { createTestMock } from '../../lib/api/mock/mockRoundtableApi'
import { unavailableError, conflictError } from '../../lib/api/transportError'

describe('controller recovery', () => {
  it('keeps the meeting when cancel-and-new is rejected', async () => {
    const api = createTestMock()
    const c = new RoundtableController(api, 'mock', api)
    await c.init()
    await c.start()
    vi.spyOn(api, 'command').mockRejectedValue(conflictError('Changed concurrently'))
    const id = c.snapshot!.id
    await c.newMeeting(true)
    expect(c.snapshot!.id).toBe(id)
    expect(c.viewPhase).toBe('viewing')
    c.dispose()
  })
  it('retries an uncertain create with the original idempotency key', async () => {
    const api = createTestMock(),
      real = api.createRun.bind(api)
    let first = true
    const spy = vi.spyOn(api, 'createRun').mockImplementation(async (input) => {
      const result = await real(input)
      if (first) {
        first = false
        throw unavailableError('Response lost')
      }
      return result
    })
    const c = new RoundtableController(api, 'mock', api)
    await c.init()
    await c.start()
    expect(c.viewPhase).toBe('create_error')
    await c.start()
    expect(c.viewPhase).toBe('viewing')
    expect(spy.mock.calls[0]![0].requestId).toBe(spy.mock.calls[1]![0].requestId)
    c.dispose()
  })
  it('does not turn exhausted reconnects into another automatic retry loop', async () => {
    const api = createTestMock()
    let observer: Parameters<typeof api.subscribe>[1] | undefined
    vi.spyOn(api, 'subscribe').mockImplementation((_id, o) => {
      observer = o
      return () => {}
    })
    const get = vi.spyOn(api, 'getRun')
    const c = new RoundtableController(api, 'mock', api)
    await c.init()
    await c.start()
    observer!.onError({ code: 'reconnect_exhausted', message: 'Retry connection', retryable: true })
    await Promise.resolve()
    expect(get).not.toHaveBeenCalled()
    expect(c.connection).toBe('offline')
    c.dispose()
  })
  it('ignores connection callbacks from an obsolete subscription', async () => {
    const api = createTestMock()
    const observers: Parameters<typeof api.subscribe>[1][] = []
    vi.spyOn(api, 'subscribe').mockImplementation((_id, o) => {
      observers.push(o)
      return () => {}
    })
    const c = new RoundtableController(api, 'mock', api)
    await c.init()
    await c.start()
    await c.retryConnection()
    observers[1]!.onConnection('connected')
    observers[0]!.onConnection('offline')
    expect(c.connection).toBe('connected')
    c.dispose()
  })
})
