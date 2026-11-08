import { describe, it, expect, vi, afterEach } from 'vitest'
import { HttpSseRoundtableApi } from '../../lib/api/httpSseRoundtableApi'
import { createTestMock } from '../../lib/api/mock/mockRoundtableApi'
import { createDefaultDraftConfig } from '../../lib/api/mock/fixtures'
import type { RunEvent } from '../../lib/domain/types'

afterEach(() => vi.useRealTimers())
const flush = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve()
}
async function fixtures() {
  const mock = createTestMock()
  const initial = await mock.createRun({ requestId: 'stream', config: createDefaultDraftConfig() })
  const events: RunEvent[] = []
  mock.subscribe(initial.id, {
    afterSeq: initial.lastEventSeq,
    onEvent: (e) => events.push(e),
    onConnection: () => {},
    onError: () => {},
  })
  mock.advance(1000)
  const final = await mock.getRun(initial.id)
  mock.dispose()
  return { initial, events, final }
}
const frame = (e: RunEvent) => `id: ${e.seq}\nevent: roundtable\ndata: ${JSON.stringify(e)}\n\n`
const stream = (text: string) =>
  new Response(
    new ReadableStream({
      start(c) {
        if (text) c.enqueue(new TextEncoder().encode(text))
        c.close()
      },
    }),
    { headers: { 'Content-Type': 'text/event-stream' } },
  )
describe('HTTP/SSE reconnect contract', () => {
  it('resyncs through GET and never reopens a terminal run', async () => {
    const { initial, final } = await fixtures()
    vi.useFakeTimers()
    const fetcher = vi.fn(async (url: RequestInfo | URL) =>
      String(url).includes('/events?') ? stream('') : new Response(JSON.stringify(final)),
    )
    const api = new HttpSseRoundtableApi({
      baseUrl: '/api/v1',
      fetch: fetcher,
      reconnectDelaysMs: [10],
    })
    const snapshot = vi.fn()
    api.subscribe(initial.id, {
      afterSeq: initial.lastEventSeq,
      onEvent: vi.fn(),
      onSnapshot: snapshot,
      onConnection: vi.fn(),
      onError: vi.fn(),
    })
    await flush()
    await vi.advanceTimersByTimeAsync(10)
    await flush()
    expect(snapshot).toHaveBeenCalledWith(final)
    expect(fetcher.mock.calls.filter(([url]) => String(url).includes('/events?'))).toHaveLength(1)
    api.dispose()
  })
  it('stops after bounded empty streams rather than resetting retries on HTTP 200', async () => {
    const { initial } = await fixtures()
    vi.useFakeTimers()
    const fetcher = vi.fn(async (url: RequestInfo | URL) =>
      String(url).includes('/events?') ? stream('') : new Response(JSON.stringify(initial)),
    )
    const api = new HttpSseRoundtableApi({
      baseUrl: '/api',
      fetch: fetcher,
      reconnectDelaysMs: [1],
      maxReconnectAttempts: 2,
    })
    const error = vi.fn()
    api.subscribe(initial.id, {
      afterSeq: 1,
      onEvent: vi.fn(),
      onSnapshot: vi.fn(),
      onConnection: vi.fn(),
      onError: error,
    })
    await flush()
    await vi.advanceTimersByTimeAsync(10)
    await flush()
    expect(fetcher.mock.calls.filter(([url]) => String(url).includes('/events?'))).toHaveLength(3)
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ code: 'reconnect_exhausted' }))
    api.dispose()
  })
  it('rejects mismatched stream IDs and does not dispatch malformed state', async () => {
    const { initial, events } = await fixtures()
    vi.useFakeTimers()
    const api = new HttpSseRoundtableApi({
      baseUrl: '/api',
      fetch: async () => stream(frame(events[0]!).replace(/^id: \d+/, 'id: 999')),
    })
    const error = vi.fn(),
      event = vi.fn()
    api.subscribe(initial.id, {
      afterSeq: 1,
      onEvent: event,
      onConnection: vi.fn(),
      onError: error,
    })
    await flush()
    expect(event).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ retryable: false }))
    expect(vi.getTimerCount()).toBe(0)
    api.dispose()
  })
  it('never advances cursor across a gap; retrieves an authoritative snapshot', async () => {
    const { initial, events, final } = await fixtures()
    vi.useFakeTimers()
    const fetcher = vi.fn(async (url: RequestInfo | URL) =>
      String(url).includes('/events?')
        ? stream(frame(events[2]!))
        : new Response(JSON.stringify(final)),
    )
    const event = vi.fn(),
      snapshot = vi.fn()
    const api = new HttpSseRoundtableApi({
      baseUrl: '/api',
      fetch: fetcher,
      reconnectDelaysMs: [1],
    })
    api.subscribe(initial.id, {
      afterSeq: 1,
      onEvent: event,
      onSnapshot: snapshot,
      onConnection: vi.fn(),
      onError: vi.fn(),
    })
    await flush()
    await vi.advanceTimersByTimeAsync(2)
    expect(event).not.toHaveBeenCalled()
    expect(snapshot).toHaveBeenCalledWith(final)
    api.dispose()
  })
  it('bounds JSON waits without reporting that an operation was cancelled', async () => {
    vi.useFakeTimers()
    const api = new HttpSseRoundtableApi({
      baseUrl: '/api',
      requestTimeoutMs: 100,
      fetch: async (_url, init) =>
        new Promise((_resolve, reject) =>
          init!.signal!.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          ),
        ),
    })
    const result = expect(api.getCatalog()).rejects.toThrow('did not respond in time')
    await vi.advanceTimersByTimeAsync(100)
    await result
    expect(vi.getTimerCount()).toBe(0)
    api.dispose()
  })
})
