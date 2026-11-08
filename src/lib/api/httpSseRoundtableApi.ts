import { parseCatalog, parseRunEvent, parseRunSnapshot } from '../domain/schemas'
import { assertRunEvent, assertRunSnapshot } from '../domain/invariants'
import { isTerminalStatus } from '../domain/reducer'
import type {
  Catalog,
  CommandContext,
  DiscussionConfig,
  Id,
  RunCommand,
  RunSnapshot,
} from '../domain/types'
import type { RoundtableApi } from './RoundtableApi'
import { SseParser } from './sseParser'
import { normalizeHttpError, TransportError, unavailableError } from './transportError'

type Observer = Parameters<RoundtableApi['subscribe']>[1]
export interface HttpSseDeps {
  fetch?: typeof fetch
  baseUrl: string
  reconnectDelaysMs?: number[]
  maxReconnectAttempts?: number
  requestTimeoutMs?: number
  now?: () => number
  setTimeout?: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>
  clearTimeout?: (id: ReturnType<typeof setTimeout>) => void
}
interface Subscription {
  runId: Id
  observer: Observer
  cursor: number
  closed: boolean
  retries: number
  abort: AbortController
  timer: ReturnType<typeof setTimeout> | null
}
const protocolError = (message: string) =>
  new TransportError({ code: 'protocol.invalid', message, retryable: false })

/** Only transport owns reconnect/backoff. Resync snapshots use a distinct callback, never fake events. */
export class HttpSseRoundtableApi implements RoundtableApi {
  private fetchImpl: typeof fetch
  private base: string
  private deps: HttpSseDeps
  private sub: Subscription | null = null
  private disposed = false
  private requests = new Set<AbortController>()
  constructor(deps: HttpSseDeps) {
    this.deps = deps
    this.fetchImpl = deps.fetch ?? fetch.bind(globalThis)
    this.base = deps.baseUrl.replace(/\/$/, '')
  }
  private later(fn: () => void, ms: number) {
    return (this.deps.setTimeout ?? setTimeout)(fn, ms)
  }
  private clear(id: ReturnType<typeof setTimeout>) {
    ;(this.deps.clearTimeout ?? clearTimeout)(id)
  }
  async getCatalog(signal?: AbortSignal): Promise<Catalog> {
    return parseCatalog(await this.json('GET', '/catalog', undefined, signal))
  }
  async createRun(input: { requestId: Id; config: DiscussionConfig }, signal?: AbortSignal) {
    return this.snapshot(await this.json('POST', '/runs', input, signal, 201))
  }
  async getRun(id: Id, signal?: AbortSignal) {
    const s = this.snapshot(
      await this.json('GET', `/runs/${encodeURIComponent(id)}`, undefined, signal),
    )
    if (s.id !== id) throw protocolError('Run identity mismatch.')
    return s
  }
  async command(id: Id, command: RunCommand, context: CommandContext, signal?: AbortSignal) {
    const s = this.snapshot(
      await this.json(
        'POST',
        `/runs/${encodeURIComponent(id)}/commands`,
        { ...context, command },
        signal,
      ),
    )
    if (s.id !== id) throw protocolError('Run identity mismatch.')
    return s
  }
  private snapshot(raw: unknown): RunSnapshot {
    try {
      const s = parseRunSnapshot(raw)
      assertRunSnapshot(s)
      return s
    } catch {
      throw protocolError('Invalid meeting snapshot received.')
    }
  }
  subscribe(runId: Id, observer: Observer): () => void {
    if (this.disposed) throw unavailableError('API disposed.')
    this.close()
    const sub: Subscription = {
      runId,
      observer,
      cursor: observer.afterSeq,
      closed: false,
      retries: 0,
      abort: new AbortController(),
      timer: null,
    }
    this.sub = sub
    void this.open(sub, false)
    return () => {
      if (this.sub === sub) this.close()
    }
  }
  dispose() {
    this.disposed = true
    this.close()
    for (const req of this.requests) req.abort()
    this.requests.clear()
  }
  private close() {
    const sub = this.sub
    if (!sub) return
    sub.closed = true
    sub.abort.abort()
    if (sub.timer !== null) this.clear(sub.timer)
    this.sub = null
    sub.observer.onConnection('closed')
  }
  private alive(sub: Subscription) {
    return !this.disposed && !sub.closed && this.sub === sub
  }
  private async open(sub: Subscription, resync: boolean): Promise<void> {
    if (!this.alive(sub)) return
    sub.observer.onConnection(resync ? 'reconnecting' : 'connecting')
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
    let handshake: ReturnType<typeof setTimeout> | undefined
    try {
      if (resync) {
        const fresh = await this.getRun(sub.runId, sub.abort.signal)
        if (!this.alive(sub)) return
        if (fresh.lastEventSeq < sub.cursor)
          throw protocolError('The service returned an older meeting snapshot.')
        // Without a snapshot consumer, preserve the replay cursor so no updates are lost.
        if (sub.observer.onSnapshot) {
          sub.observer.onSnapshot(fresh)
          sub.cursor = fresh.lastEventSeq
        }
        if (!this.alive(sub)) return
        if (isTerminalStatus(fresh.status)) {
          if (sub.observer.onSnapshot) {
            this.close()
            return
          }
          // Legacy consumers receive the missing terminal event through replay.
        }
      }
      handshake = this.later(() => sub.abort.abort(), this.deps.requestTimeoutMs ?? 15_000)
      const response = await this.fetchImpl(
        `${this.base}/runs/${encodeURIComponent(sub.runId)}/events?afterSeq=${sub.cursor}`,
        {
          method: 'GET',
          credentials: 'omit',
          headers: { Accept: 'text/event-stream' },
          signal: sub.abort.signal,
        },
      )
      this.clear(handshake)
      handshake = undefined
      if (!this.alive(sub)) return
      if (!response.ok) throw normalizeHttpError(response.status, null)
      if (!response.body || !response.headers.get('Content-Type')?.includes('text/event-stream'))
        throw protocolError('Expected an SSE event stream.')
      sub.observer.onConnection('connected')
      reader = response.body.getReader()
      const decoder = new TextDecoder()
      const parser = new SseParser()
      while (this.alive(sub)) {
        const { done, value } = await reader.read()
        if (done) break
        for (const message of parser.push(decoder.decode(value, { stream: true }))) {
          if (!this.alive(sub)) break
          if (message.event !== 'roundtable') continue
          let event
          try {
            event = parseRunEvent(JSON.parse(message.data))
            assertRunEvent(event)
          } catch {
            throw protocolError('Malformed event received. Retry connection to resynchronize.')
          }
          if (message.id !== String(event.seq) || event.runId !== sub.runId)
            throw protocolError('Event identity or sequence mismatch.')
          if (event.seq <= sub.cursor) continue
          if (event.seq !== sub.cursor + 1) {
            // Abort this stream; a bounded reconnect performs a GET snapshot first.
            throw unavailableError('Missing updates detected; resynchronizing the meeting.')
          }
          sub.observer.onEvent(event)
          if (!this.alive(sub)) break
          sub.cursor = event.seq
          sub.retries = 0 // A usable event, not just an HTTP 200, proves recovery.
          if (isTerminalStatus(event.snapshot.status)) {
            this.close()
            break
          }
        }
      }
      parser.flush() // An unterminated final record must never be dispatched.
      if (this.alive(sub)) this.reconnect(sub)
    } catch (error) {
      if (!this.alive(sub)) return
      const pub =
        error instanceof TransportError
          ? error.publicError
          : {
              code: 'stream_error',
              message: 'Connection lost; meeting status may be out of date.',
              retryable: true,
            }
      if (!pub.retryable) {
        this.close()
        sub.observer.onConnection('offline')
        sub.observer.onError(pub)
        return
      }
      sub.observer.onError(pub)
      this.reconnect(sub)
    } finally {
      if (handshake !== undefined) this.clear(handshake)
      if (reader) {
        try {
          await reader.cancel()
        } catch {}
        reader.releaseLock()
      }
    }
  }
  private reconnect(sub: Subscription) {
    if (!this.alive(sub)) return
    sub.abort.abort()
    if (sub.retries >= (this.deps.maxReconnectAttempts ?? 5)) {
      this.close()
      sub.observer.onConnection('offline')
      sub.observer.onError({
        code: 'reconnect_exhausted',
        message: 'Unable to reconnect. Use Retry connection.',
        retryable: true,
      })
      return
    }
    const delays = this.deps.reconnectDelaysMs ?? [1000, 2000, 4000, 8000, 15000]
    const delay = delays[Math.min(sub.retries, delays.length - 1)] ?? 15000
    sub.retries++
    sub.observer.onConnection('reconnecting')
    sub.timer = this.later(() => {
      sub.timer = null
      if (!this.alive(sub)) return
      sub.abort = new AbortController()
      void this.open(sub, true)
    }, delay)
  }
  private async json(
    method: string,
    path: string,
    body?: unknown,
    signal?: AbortSignal,
    expected = 200,
  ): Promise<unknown> {
    if (this.disposed) throw unavailableError('API disposed.')
    const abort = new AbortController()
    this.requests.add(abort)
    const cancel = () => abort.abort(signal?.reason)
    if (signal?.aborted) cancel()
    else signal?.addEventListener('abort', cancel, { once: true })
    let timedOut = false
    const timeout = this.later(() => {
      timedOut = true
      abort.abort()
    }, this.deps.requestTimeoutMs ?? 15_000)
    try {
      const response = await this.fetchImpl(`${this.base}${path}`, {
        method,
        credentials: 'omit',
        headers: body
          ? { 'Content-Type': 'application/json', Accept: 'application/json' }
          : { Accept: 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        signal: abort.signal,
      })
      const text = await response.text()
      let json: unknown = null
      try {
        json = text ? JSON.parse(text) : null
      } catch {
        if (response.status === expected) throw protocolError('Service returned non-JSON content.')
      }
      if (response.status !== expected) throw normalizeHttpError(response.status, json)
      return json
    } catch (error) {
      if (error instanceof TransportError) throw error
      if (timedOut)
        throw unavailableError(
          'The service did not respond in time. Retrying the same operation is safe.',
        )
      if (signal?.aborted || this.disposed) throw error
      throw unavailableError(
        'Cannot reach the roundtable API. Start a backend or switch VITE_ROUNDTABLE_MODE=mock.',
      )
    } finally {
      this.clear(timeout)
      signal?.removeEventListener('abort', cancel)
      this.requests.delete(abort)
    }
  }
}
