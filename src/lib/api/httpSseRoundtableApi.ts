import { parseCatalog, parseRunEvent, parseRunSnapshot } from '../domain/schemas'
import type {
  Catalog,
  CommandContext,
  ConnectionState,
  DiscussionConfig,
  Id,
  PublicError,
  RunCommand,
  RunEvent,
  RunSnapshot,
} from '../domain/types'
import type { RoundtableApi } from './RoundtableApi'
import { SseParser } from './sseParser'
import {
  normalizeHttpError,
  TransportError,
  unavailableError,
} from './transportError'

export interface HttpSseDeps {
  fetch?: typeof fetch
  baseUrl: string
  reconnectDelaysMs?: number[]
  maxReconnectAttempts?: number
  now?: () => number
  setTimeout?: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>
  clearTimeout?: (id: ReturnType<typeof setTimeout>) => void
}

interface ActiveSubscription {
  runId: Id
  abort: AbortController
  generation: number
  closed: boolean
  lastAppliedSeq: number
  options: {
    afterSeq: number
    onEvent: (event: RunEvent) => void
    onConnection: (state: ConnectionState) => void
    onError: (error: PublicError) => void
  }
  reconnectAttempts: number
  reconnectTimer: ReturnType<typeof setTimeout> | null
}

export class HttpSseRoundtableApi implements RoundtableApi {
  private readonly fetchImpl: typeof fetch
  private readonly baseUrl: string
  private readonly reconnectDelaysMs: number[]
  private readonly maxReconnectAttempts: number
  private readonly setTimeoutImpl: HttpSseDeps['setTimeout']
  private readonly clearTimeoutImpl: HttpSseDeps['clearTimeout']
  private disposed = false
  private subscription: ActiveSubscription | null = null
  private generation = 0

  constructor(deps: HttpSseDeps) {
    this.fetchImpl = deps.fetch ?? fetch.bind(globalThis)
    this.baseUrl = deps.baseUrl.replace(/\/$/, '')
    this.reconnectDelaysMs = deps.reconnectDelaysMs ?? [1000, 2000, 4000, 8000, 15000]
    this.maxReconnectAttempts = deps.maxReconnectAttempts ?? 5
    this.setTimeoutImpl = deps.setTimeout ?? setTimeout
    this.clearTimeoutImpl = deps.clearTimeout ?? clearTimeout
  }

  async getCatalog(signal?: AbortSignal): Promise<Catalog> {
    return parseCatalog(await this.requestJson('GET', '/catalog', undefined, signal))
  }

  async createRun(
    input: { requestId: Id; config: DiscussionConfig },
    signal?: AbortSignal,
  ): Promise<RunSnapshot> {
    return parseRunSnapshot(await this.requestJson('POST', '/runs', input, signal, 201))
  }

  async getRun(runId: Id, signal?: AbortSignal): Promise<RunSnapshot> {
    return parseRunSnapshot(
      await this.requestJson('GET', `/runs/${encodeURIComponent(runId)}`, undefined, signal),
    )
  }

  async command(
    runId: Id,
    command: RunCommand,
    context: CommandContext,
    signal?: AbortSignal,
  ): Promise<RunSnapshot> {
    return parseRunSnapshot(
      await this.requestJson(
        'POST',
        `/runs/${encodeURIComponent(runId)}/commands`,
        {
          requestId: context.requestId,
          expectedRevision: context.expectedRevision,
          command,
        },
        signal,
      ),
    )
  }

  subscribe(
    runId: Id,
    options: {
      afterSeq: number
      onEvent: (event: RunEvent) => void
      onConnection: (state: ConnectionState) => void
      onError: (error: PublicError) => void
    },
  ): () => void {
    this.closeSubscription()
    const generation = ++this.generation
    const sub: ActiveSubscription = {
      runId,
      abort: new AbortController(),
      generation,
      closed: false,
      lastAppliedSeq: options.afterSeq,
      options,
      reconnectAttempts: 0,
      reconnectTimer: null,
    }
    this.subscription = sub
    void this.openStream(sub)
    return () => {
      if (this.subscription?.generation === generation) this.closeSubscription()
    }
  }

  dispose(): void {
    this.disposed = true
    this.closeSubscription()
  }

  private closeSubscription(): void {
    const sub = this.subscription
    if (!sub) return
    sub.closed = true
    if (sub.reconnectTimer) this.clearTimeoutImpl?.(sub.reconnectTimer)
    sub.abort.abort()
    sub.options.onConnection('closed')
    this.subscription = null
  }

  private async openStream(sub: ActiveSubscription): Promise<void> {
    if (sub.closed || this.disposed) return
    sub.options.onConnection(sub.reconnectAttempts > 0 ? 'reconnecting' : 'connecting')
    try {
      const url = `${this.baseUrl}/runs/${encodeURIComponent(sub.runId)}/events?afterSeq=${encodeURIComponent(String(sub.lastAppliedSeq))}`
      const response = await this.fetchImpl(url, {
        method: 'GET',
        credentials: 'omit',
        headers: { Accept: 'text/event-stream' },
        signal: sub.abort.signal,
      })
      if (!response.ok || !response.body) {
        throw unavailableError('Event stream unavailable.')
      }
      sub.options.onConnection('connected')
      sub.reconnectAttempts = 0
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      const parser = new SseParser()
      while (!sub.closed) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value, { stream: true })
        for (const message of parser.push(text)) {
          this.handleMessage(sub, message)
        }
      }
      for (const message of parser.flush()) this.handleMessage(sub, message)
      if (!sub.closed) this.scheduleReconnect(sub)
    } catch (error) {
      if (sub.closed || this.disposed) return
      if ((error as { name?: string })?.name === 'AbortError') return
      const publicError =
        error instanceof TransportError
          ? error.publicError
          : { code: 'stream_error', message: 'Connection lost; meeting status may be out of date.', retryable: true }
      sub.options.onError(publicError)
      sub.options.onConnection('offline')
      this.scheduleReconnect(sub)
    }
  }

  private handleMessage(
    sub: ActiveSubscription,
    message: { id: string | null; event: string | null; data: string; comments: string[] },
  ): void {
    if (!message.data && message.comments.length) return // heartbeat
    if (message.event && message.event !== 'roundtable') return
    let event: RunEvent
    try {
      event = parseRunEvent(JSON.parse(message.data))
    } catch {
      sub.options.onError({
        code: 'protocol.malformed',
        message: 'Malformed event payload received.',
        retryable: false,
      })
      return
    }
    if (message.id != null && message.id !== String(event.seq)) {
      sub.options.onError({
        code: 'protocol.sse_id_mismatch',
        message: 'SSE id does not match event seq.',
        retryable: false,
      })
      return
    }
    sub.lastAppliedSeq = event.seq
    sub.options.onEvent(event)
  }

  private scheduleReconnect(sub: ActiveSubscription): void {
    if (sub.closed || this.disposed) return
    if (sub.reconnectAttempts >= this.maxReconnectAttempts) {
      sub.options.onConnection('offline')
      sub.options.onError({
        code: 'reconnect_exhausted',
        message: 'Unable to reconnect. Use Retry connection.',
        retryable: true,
      })
      return
    }
    const delay =
      this.reconnectDelaysMs[Math.min(sub.reconnectAttempts, this.reconnectDelaysMs.length - 1)] ??
      15000
    sub.reconnectAttempts += 1
    sub.options.onConnection('reconnecting')
    sub.reconnectTimer = this.setTimeoutImpl?.(() => {
      if (sub.closed) return
      // Resync via GET before opening a new stream is owned by the controller;
      // adapter reconnects the stream from lastAppliedSeq.
      sub.abort = new AbortController()
      void this.openStream(sub)
    }, delay) ?? null
  }

  private async requestJson(
    method: string,
    path: string,
    body?: unknown,
    signal?: AbortSignal,
    expectedStatus = 200,
  ): Promise<unknown> {
    this.assertAlive()
    try {
      const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method,
        credentials: 'omit',
        headers: body ? { 'Content-Type': 'application/json', Accept: 'application/json' } : { Accept: 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        signal,
      })
      const text = await response.text()
      let json: unknown = null
      if (text) {
        try {
          json = JSON.parse(text)
        } catch {
          throw unavailableError('Service returned non-JSON content.')
        }
      }
      if (response.status !== expectedStatus) {
        throw normalizeHttpError(response.status, json)
      }
      return json
    } catch (error) {
      if (error instanceof TransportError) throw error
      if ((error as { name?: string })?.name === 'AbortError') throw error
      throw unavailableError(
        'Cannot reach the roundtable API. Start a backend or switch VITE_ROUNDTABLE_MODE=mock.',
      )
    }
  }

  private assertAlive(): void {
    if (this.disposed) {
      throw new TransportError({ code: 'disposed', message: 'API disposed.', retryable: false })
    }
  }
}
