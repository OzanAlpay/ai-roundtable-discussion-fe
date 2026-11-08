import { deepFreeze } from '../../domain/invariants'
import { validateDraftConfig } from '../../domain/schemas'
import type {
  Attempt,
  Catalog,
  CommandContext,
  ConnectionState,
  DemoScenarioId,
  DiscussionConfig,
  Id,
  Opinion,
  PublicError,
  RoundSlot,
  RoundState,
  RunCommand,
  RunEvent,
  RunEventDetail,
  RunSnapshot,
} from '../../domain/types'
import type { RoundtableApi } from '../RoundtableApi'
import { conflictError, notFoundError, validationError, TransportError } from '../transportError'
import { DEMO_CATALOG } from './catalog'
import {
  getSampleRound1,
  illustrativeOpinion,
  isSampleQuestion,
  sampleRound2,
  sampleRound3,
} from './fixtures'
import { behaviorForScenario, type ScenarioBehavior } from './scenarios'
import {
  createFakeClock,
  createRealClock,
  createSeededRandom,
  type Cancel,
  type Clock,
} from './scheduler'

export interface MockRoundtableApiOptions {
  clock?: Clock
  seed?: number
  scenario?: DemoScenarioId
  /** Human demo pacing; tests usually pass a fake clock and smaller delays via scenario. */
  humanDelays?: boolean
  catalog?: Catalog
}

interface Subscriber {
  onSnapshot?: (snapshot: RunSnapshot) => void
  paused?: boolean
  afterSeq: number
  onEvent: (event: RunEvent) => void
  onConnection: (state: ConnectionState) => void
  onError: (error: PublicError) => void
}

interface StoredRun {
  snapshot: RunSnapshot
  events: RunEvent[]
  inputSnapshots: Map<Id, { id: Id; roundNumber: number; responses: Opinion[] }>
  cancels: Cancel[]
  behavior: ScenarioBehavior
  retryCount: Map<string, number>
  scenario: DemoScenarioId
  injected: boolean
  createRequestId: Id
}

interface IdempotencyRecord {
  bodyKey: string
  snapshot: RunSnapshot
}

function iso(clock: Clock): string {
  return new Date(clock.now()).toISOString()
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function bodyKey(value: unknown): string {
  return JSON.stringify(value)
}

export class MockRoundtableApi implements RoundtableApi {
  private readonly clock: Clock
  private readonly random: () => number
  private readonly humanDelays: boolean
  private readonly catalog: Catalog
  private scenario: DemoScenarioId
  private readonly runs = new Map<Id, StoredRun>()
  private readonly subscribers = new Map<Id, Set<Subscriber>>()
  private readonly createIdempotency = new Map<Id, IdempotencyRecord>()
  private readonly commandIdempotency = new Map<string, IdempotencyRecord>()
  private connectionCancels: Cancel[] = []
  private disposed = false
  private nextIds = 1

  constructor(options: MockRoundtableApiOptions = {}) {
    this.clock = options.clock ?? createRealClock()
    this.random = createSeededRandom(options.seed ?? 42)
    this.humanDelays = options.humanDelays ?? !(options.clock && 'advance' in options.clock)
    this.catalog = options.catalog ?? DEMO_CATALOG
    this.scenario = options.scenario ?? 'healthy-two-rounds'
  }

  setScenario(scenario: DemoScenarioId): void {
    this.scenario = scenario
  }

  getScenario(): DemoScenarioId {
    return this.scenario
  }

  /** Test helper: advance fake clock if present. */
  advance(ms: number): void {
    const clock = this.clock as Clock & { advance?: (ms: number) => void }
    clock.advance?.(ms)
  }

  async getCatalog(_signal?: AbortSignal): Promise<Catalog> {
    this.assertAlive()
    return clone(this.catalog)
  }

  async createRun(
    input: { requestId: Id; config: DiscussionConfig },
    _signal?: AbortSignal,
  ): Promise<RunSnapshot> {
    this.assertAlive()
    const existing = this.createIdempotency.get(input.requestId)
    if (existing) {
      if (existing.bodyKey !== bodyKey(input.config)) {
        throw validationError(
          'Idempotency key reused with a different body.',
          'idempotency_mismatch',
        )
      }
      return clone(existing.snapshot)
    }

    const issues = validateDraftConfig(input.config, this.catalog)
    if (issues.length) {
      throw validationError(issues[0]!.message)
    }

    const config = deepFreeze(clone(input.config))
    const id = this.id('run')
    const now = iso(this.clock)
    const snapshot: RunSnapshot = {
      schemaVersion: 1,
      id,
      revision: 0,
      lastEventSeq: 0,
      status: 'queued',
      config,
      participantLabels: config.participants.map((p) => ({
        participantId: p.id,
        providerName:
          this.catalog.providers.find((x) => x.id === p.providerId)?.name ?? p.providerId,
        modelName: this.catalog.models.find((x) => x.id === p.modelId)?.name ?? p.modelId,
      })),
      excludedParticipantIds: [],
      currentRoundNumber: null,
      rounds: [],
      createdAt: now,
      updatedAt: now,
      endedAt: null,
      terminalError: null,
    }

    const stored: StoredRun = {
      snapshot,
      scenario: this.scenario,
      injected: false,
      events: [],
      inputSnapshots: new Map(),
      cancels: [],
      behavior: behaviorForScenario(
        this.scenario,
        config.participants.map((p) => p.id),
      ),
      retryCount: new Map(),
      createRequestId: input.requestId,
    }
    this.runs.set(id, stored)
    this.emit(stored, { type: 'run.created' })
    this.createIdempotency.set(input.requestId, {
      bodyKey: bodyKey(input.config),
      snapshot: clone(stored.snapshot),
    })

    this.scheduleOn(stored, () => this.startRound(id, 1), this.humanDelays ? 200 : 0)
    return clone(stored.snapshot)
  }

  async getRun(runId: Id, _signal?: AbortSignal): Promise<RunSnapshot> {
    this.assertAlive()
    const run = this.runs.get(runId)
    if (!run) throw notFoundError(`Run ${runId} not found.`)
    return clone(run.snapshot)
  }

  async command(
    runId: Id,
    command: RunCommand,
    context: CommandContext,
    _signal?: AbortSignal,
  ): Promise<RunSnapshot> {
    this.assertAlive()
    const key = `${runId}:${context.requestId}`
    const existing = this.commandIdempotency.get(key)
    if (existing) {
      if (existing.bodyKey !== bodyKey({ command, expectedRevision: context.expectedRevision })) {
        throw validationError(
          'Idempotency key reused with a different body.',
          'idempotency_mismatch',
        )
      }
      return clone(existing.snapshot)
    }

    const run = this.runs.get(runId)
    if (!run) throw notFoundError(`Run ${runId} not found.`)

    if (context.expectedRevision !== run.snapshot.revision) {
      // Same-ID replay already handled. Fresh command with stale revision conflicts.
      throw conflictError('expectedRevision does not match current revision.', 'stale_revision')
    }

    if (command.type === 'cancel') {
      this.cancelRun(run)
    } else if (command.type === 'retry') {
      this.retryParticipant(run, command.roundNumber, command.participantId)
    } else if (command.type === 'exclude') {
      this.excludeParticipant(run, command.roundNumber, command.participantId)
    }

    this.commandIdempotency.set(key, {
      bodyKey: bodyKey({ command, expectedRevision: context.expectedRevision }),
      snapshot: clone(run.snapshot),
    })
    return clone(run.snapshot)
  }

  subscribe(
    runId: Id,
    options: {
      afterSeq: number
      onSnapshot?: (snapshot: RunSnapshot) => void
      onEvent: (event: RunEvent) => void
      onConnection: (state: ConnectionState) => void
      onError: (error: PublicError) => void
    },
  ): () => void {
    this.assertAlive()
    const run = this.runs.get(runId)
    if (!run) {
      options.onError({ code: 'not_found', message: `Run ${runId} not found.`, retryable: false })
      options.onConnection('closed')
      return () => {}
    }

    const subscriber: Subscriber = { ...options }
    let set = this.subscribers.get(runId)
    if (!set) {
      set = new Set()
      this.subscribers.set(runId, set)
    }
    set.add(subscriber)
    options.onConnection('connecting')
    options.onConnection('connected')

    queueMicrotask(() => {
      for (const event of [...run.events]) {
        if (!set!.has(subscriber)) break
        if (event.seq > subscriber.afterSeq) {
          subscriber.afterSeq = event.seq
          options.onEvent(clone(event))
        }
      }
    })

    return () => {
      set!.delete(subscriber)
      options.onConnection('closed')
    }
  }

  dispose(): void {
    this.disposed = true
    for (const cancel of this.connectionCancels) cancel()
    this.connectionCancels = []
    for (const run of this.runs.values()) {
      for (const cancel of run.cancels) cancel()
      run.cancels = []
    }
    this.subscribers.clear()
  }

  private assertAlive(): void {
    if (this.disposed)
      throw new TransportError({ code: 'disposed', message: 'API disposed.', retryable: false })
  }

  private id(prefix: string): string {
    return `${prefix}-${this.nextIds++}`
  }

  private trackCancel(run: StoredRun, cancel: Cancel): void {
    run.cancels.push(cancel)
  }

  private scheduleOn(run: StoredRun, fn: () => void, ms: number): void {
    const cancel = this.clock.setTimeout(() => {
      if (this.isTerminal(run.snapshot.status)) return
      fn()
    }, ms)
    this.trackCancel(run, cancel)
  }

  private isTerminal(status: RunSnapshot['status']): boolean {
    return status === 'completed' || status === 'cancelled' || status === 'failed'
  }

  private emit(run: StoredRun, detail: RunEventDetail): void {
    const nextRev = run.snapshot.revision + 1
    const now = iso(this.clock)
    run.snapshot = {
      ...run.snapshot,
      revision: nextRev,
      lastEventSeq: nextRev,
      updatedAt: now,
    }
    const event: RunEvent = deepFreeze({
      schemaVersion: 1,
      runId: run.snapshot.id,
      eventId: this.id('evt'),
      seq: nextRev,
      occurredAt: now,
      detail,
      snapshot: clone(run.snapshot),
    })
    run.events.push(event)
    run.snapshot = clone(event.snapshot)

    const subs = this.subscribers.get(run.snapshot.id)
    if (!subs) return
    if (!run.injected && event.seq >= 6 && run.scenario === 'malformed-gapped-event') {
      run.injected = true
      return
    }
    if (!run.injected && event.seq >= 6 && run.scenario === 'disconnect-reconnect') {
      run.injected = true
      for (const sub of subs) {
        sub.paused = true
        sub.onConnection('reconnecting')
      }
      const resume = this.clock.setTimeout(
        () => {
          for (const sub of this.subscribers.get(run.snapshot.id) ?? []) {
            sub.paused = false
            if (sub.onSnapshot) {
              sub.afterSeq = run.snapshot.lastEventSeq
              sub.onSnapshot(clone(run.snapshot))
            } else
              for (const past of run.events) {
                if (past.seq > sub.afterSeq) {
                  sub.afterSeq = past.seq
                  sub.onEvent(clone(past))
                }
              }
            sub.onConnection(this.isTerminal(run.snapshot.status) ? 'closed' : 'connected')
          }
        },
        this.humanDelays ? 1800 : 50,
      )
      this.connectionCancels.push(resume)
      return
    }
    for (const sub of [...subs]) {
      if (!sub.paused && event.seq > sub.afterSeq) {
        sub.afterSeq = event.seq
        sub.onEvent(clone(event))
      }
    }
  }

  private startRound(runId: Id, roundNumber: number): void {
    const run = this.runs.get(runId)
    if (!run || this.isTerminal(run.snapshot.status)) return

    const expected = run.snapshot.config.participants
      .map((p) => p.id)
      .filter((id) => !run.snapshot.excludedParticipantIds.includes(id))

    let inputSnapshotId: Id | null = null
    if (roundNumber > 1) {
      const prev = run.snapshot.rounds.find((r) => r.number === roundNumber - 1)?.published
      if (!prev) return
      inputSnapshotId = prev.id
      run.inputSnapshots.set(prev.id, {
        id: prev.id,
        roundNumber: prev.number,
        responses: deepFreeze(clone(prev.responses)),
      })
    }

    const round: RoundState = {
      number: roundNumber,
      kind: roundNumber === 1 ? 'independent' : 'reconsideration',
      status: 'active',
      inputSnapshotId,
      expectedParticipantIds: expected,
      slots: expected.map((participantId) => ({
        participantId,
        status: roundNumber === 1 ? 'thinking' : 'reading',
        attempts: [],
        response: null,
      })),
      startedAt: iso(this.clock),
      published: null,
    }

    run.snapshot = {
      ...run.snapshot,
      status: 'round_active',
      currentRoundNumber: roundNumber,
      rounds: [...run.snapshot.rounds, round],
    }
    this.emit(run, { type: 'round.started', roundNumber })

    for (const participantId of expected) {
      this.beginAttempt(run, roundNumber, participantId)
    }
  }

  private beginAttempt(run: StoredRun, roundNumber: number, participantId: Id): void {
    if (this.isTerminal(run.snapshot.status)) return
    const round = run.snapshot.rounds.find((r) => r.number === roundNumber)
    if (!round || round.status === 'published' || round.status === 'cancelled') return
    const slot = round.slots.find((s) => s.participantId === participantId)
    if (!slot || slot.status === 'skipped' || slot.status === 'submitted') return

    const attemptNumber = slot.attempts.length + 1
    const attempt: Attempt = {
      id: this.id('attempt'),
      number: attemptNumber,
      status: roundNumber === 1 ? 'thinking' : 'reading',
      startedAt: iso(this.clock),
      endedAt: null,
      error: null,
    }
    slot.attempts = [...slot.attempts, attempt]
    slot.status =
      attempt.status === 'thinking' || attempt.status === 'reading' ? attempt.status : 'pending'
    slot.response = null
    this.patchRound(run, round)
    this.emit(run, { type: 'participant.updated', roundNumber, participantId })

    const delay = this.attemptDelay(run, participantId, attemptNumber)
    const timeoutMs = run.snapshot.config.attemptTimeoutMs
    const shouldTimeout =
      roundNumber === 1 &&
      !!run.behavior.timeoutFirstAttemptFor?.includes(participantId) &&
      attemptNumber === 1
    const shouldFail =
      (!!run.behavior.failFirstAttemptFor?.includes(participantId) && attemptNumber === 1) ||
      !!run.behavior.failPermanentlyFor?.includes(participantId)

    if (roundNumber > 1) {
      this.scheduleOn(
        run,
        () => {
          this.updateAttemptStatus(run, roundNumber, participantId, attempt.id, 'thinking')
        },
        Math.min(200, delay / 3),
      )
    }

    if (shouldTimeout) {
      this.scheduleOn(
        run,
        () => {
          this.failAttempt(run, roundNumber, participantId, attempt.id, {
            code: 'timeout',
            message: 'Participant attempt timed out.',
            retryable: true,
          })
        },
        timeoutMs,
      )
      return
    }

    if (shouldFail) {
      this.scheduleOn(
        run,
        () => {
          this.failAttempt(run, roundNumber, participantId, attempt.id, {
            code: 'model_error',
            message: 'Simulated participant failure.',
            retryable: !run.behavior.failPermanentlyFor?.includes(participantId),
          })
        },
        delay,
      )
      return
    }

    this.scheduleOn(
      run,
      () =>
        this.failAttempt(run, roundNumber, participantId, attempt.id, {
          code: 'timeout',
          message: 'Participant attempt timed out.',
          retryable: true,
        }),
      timeoutMs,
    )
    this.scheduleOn(
      run,
      () => {
        this.succeedAttempt(run, roundNumber, participantId, attempt.id)
      },
      delay,
    )
  }

  private attemptDelay(run: StoredRun, participantId: Id, attemptNumber: number): number {
    const configured = run.behavior.delayMsByParticipantId?.[participantId]
    if (configured != null) return configured
    if (!this.humanDelays) return 10 + attemptNumber
    const base = 800 + Math.floor(this.random() * 2200)
    if (run.behavior.slowParticipantId === participantId) return base + 1500
    return base
  }

  private updateAttemptStatus(
    run: StoredRun,
    roundNumber: number,
    participantId: Id,
    attemptId: Id,
    status: Attempt['status'],
  ): void {
    if (this.isTerminal(run.snapshot.status)) return
    const round = run.snapshot.rounds.find((r) => r.number === roundNumber)
    const slot = round?.slots.find((s) => s.participantId === participantId)
    const attempt = slot?.attempts.find((a) => a.id === attemptId)
    if (
      !round ||
      !slot ||
      !attempt ||
      attempt.status === 'succeeded' ||
      attempt.status === 'failed' ||
      attempt.status === 'cancelled'
    ) {
      return
    }
    attempt.status = status
    slot.status = status === 'thinking' || status === 'reading' ? status : slot.status
    this.patchRound(run, round)
    this.emit(run, { type: 'participant.updated', roundNumber, participantId })
  }

  private succeedAttempt(
    run: StoredRun,
    roundNumber: number,
    participantId: Id,
    attemptId: Id,
  ): void {
    if (this.isTerminal(run.snapshot.status)) return
    const round = run.snapshot.rounds.find((r) => r.number === roundNumber)
    const slot = round?.slots.find((s) => s.participantId === participantId)
    const attempt = slot?.attempts.find((a) => a.id === attemptId)
    if (!round || !slot || !attempt || attempt.endedAt) return

    const opinion = this.buildOpinion(run, roundNumber, participantId, attempt)
    attempt.status = 'succeeded'
    attempt.endedAt = iso(this.clock)
    slot.status = 'submitted'
    slot.response = opinion
    this.patchRound(run, round)
    this.emit(run, { type: 'participant.updated', roundNumber, participantId })
    this.maybeSettleRound(run, roundNumber)
  }

  private failAttempt(
    run: StoredRun,
    roundNumber: number,
    participantId: Id,
    attemptId: Id,
    error: PublicError,
  ): void {
    if (this.isTerminal(run.snapshot.status)) return
    const round = run.snapshot.rounds.find((r) => r.number === roundNumber)
    const slot = round?.slots.find((s) => s.participantId === participantId)
    const attempt = slot?.attempts.find((a) => a.id === attemptId)
    if (!round || !slot || !attempt || attempt.endedAt) return

    attempt.status = 'failed'
    attempt.endedAt = iso(this.clock)
    attempt.error = error
    slot.status = 'failed'
    slot.response = null
    this.patchRound(run, round)
    this.emit(run, { type: 'participant.updated', roundNumber, participantId })
    this.maybeSettleRound(run, roundNumber)
  }

  private buildOpinion(
    run: StoredRun,
    roundNumber: number,
    participantId: Id,
    attempt: Attempt,
  ): Opinion {
    const participant = run.snapshot.config.participants.find((p) => p.id === participantId)!
    const question = run.snapshot.config.question
    const started = Date.parse(attempt.startedAt)
    const elapsedMs = Math.max(0, this.clock.now() - started)

    let fixture
    if (isSampleQuestion(question)) {
      if (roundNumber === 1) fixture = getSampleRound1(participantId)
      else if (roundNumber === 2) {
        const prev = this.previousResponses(run, 1)
        fixture = sampleRound2(participantId, prev)
      } else if (roundNumber === 3) {
        const prev = this.previousResponses(run, 2)
        fixture = sampleRound3(participantId, prev)
      }
    }

    if (!fixture) {
      const prevOpinion =
        roundNumber > 1
          ? (this.previousResponses(run, roundNumber - 1)[participantId] ?? null)
          : null
      fixture = illustrativeOpinion(participant, roundNumber, question, prevOpinion)
    }

    return {
      id: this.id('resp'),
      participantId,
      roundNumber,
      ...fixture,
      submittedAt: iso(this.clock),
      elapsedMs,
    }
  }

  private previousResponses(run: StoredRun, roundNumber: number): Record<string, Opinion> {
    const round = run.snapshot.rounds.find((r) => r.number === roundNumber + 1)
    const published = round?.inputSnapshotId ? run.inputSnapshots.get(round.inputSnapshotId) : null
    const map: Record<string, Opinion> = {}
    for (const response of published?.responses ?? []) map[response.participantId] = response
    return map
  }

  private patchRound(run: StoredRun, round: RoundState): void {
    run.snapshot = {
      ...run.snapshot,
      rounds: run.snapshot.rounds.map((r) => (r.number === round.number ? round : r)),
    }
  }

  private maybeSettleRound(run: StoredRun, roundNumber: number): void {
    const round = run.snapshot.rounds.find((r) => r.number === roundNumber)
    if (!round || round.published || this.isTerminal(run.snapshot.status)) return

    const unsettled = round.slots.some(
      (s) => s.status === 'pending' || s.status === 'reading' || s.status === 'thinking',
    )
    if (unsettled) return

    const failures = round.slots.filter((s) => s.status === 'failed')
    if (failures.length) {
      round.status = 'blocked'
      run.snapshot = { ...run.snapshot, status: 'round_blocked' }
      this.patchRound(run, round)
      this.emit(run, { type: 'round.blocked', roundNumber })
      return
    }

    this.publishRound(run, roundNumber)
  }

  private publishRound(run: StoredRun, roundNumber: number): void {
    const round = run.snapshot.rounds.find((r) => r.number === roundNumber)
    if (!round || round.published) return

    const responses = round.slots
      .filter((s) => s.status === 'submitted' && s.response)
      .map((s) => clone(s.response!))
    if (responses.length < 2) {
      round.status = 'blocked'
      run.snapshot = { ...run.snapshot, status: 'round_blocked' }
      this.patchRound(run, round)
      this.emit(run, { type: 'round.blocked', roundNumber })
      return
    }

    const published = {
      id: this.id('snap'),
      number: roundNumber,
      publishedAt: iso(this.clock),
      responses,
      excludedParticipantIds: [...run.snapshot.excludedParticipantIds],
    }
    round.status = 'published'
    round.published = published
    run.inputSnapshots.set(published.id, {
      id: published.id,
      roundNumber,
      responses: deepFreeze(clone(responses)),
    })
    run.snapshot = {
      ...run.snapshot,
      status: 'between_rounds',
    }
    this.patchRound(run, round)
    this.emit(run, { type: 'round.published', roundNumber, snapshotId: published.id })

    if (roundNumber >= run.snapshot.config.totalRounds) {
      run.snapshot = {
        ...run.snapshot,
        status: 'completed',
        endedAt: iso(this.clock),
        currentRoundNumber: roundNumber,
      }
      for (const cancel of run.cancels) cancel()
      run.cancels = []
      this.emit(run, { type: 'run.completed' })
      return
    }

    this.scheduleOn(
      run,
      () => this.startRound(run.snapshot.id, roundNumber + 1),
      this.humanDelays ? 400 : 0,
    )
  }

  private retryParticipant(run: StoredRun, roundNumber: number, participantId: Id): void {
    if (run.snapshot.status !== 'round_blocked') {
      throw conflictError('Retry is only accepted while the round is blocked.')
    }
    const round = run.snapshot.rounds.find((r) => r.number === roundNumber)
    const slot = round?.slots.find((s) => s.participantId === participantId)
    if (!round || !slot || slot.status !== 'failed') {
      throw conflictError('Participant is not retryable in this round.')
    }
    const last = slot.attempts.at(-1)
    if (!last?.error?.retryable) throw conflictError('Failure is not retryable.')

    // Preserve same immutable input: round.inputSnapshotId unchanged.
    run.snapshot = { ...run.snapshot, status: 'round_active' }
    round.status = 'active'
    this.patchRound(run, round)
    this.emit(run, { type: 'participant.retried', roundNumber, participantId })
    this.beginAttempt(run, roundNumber, participantId)
  }

  private excludeParticipant(run: StoredRun, roundNumber: number, participantId: Id): void {
    if (run.snapshot.status !== 'round_blocked') {
      throw conflictError('Exclude is only accepted while the round is blocked.')
    }
    const round = run.snapshot.rounds.find((r) => r.number === roundNumber)
    const slot = round?.slots.find((s) => s.participantId === participantId)
    if (!round || !slot || slot.status !== 'failed') {
      throw conflictError('Only failed participants can be excluded.')
    }

    const viableAfter = round.slots.filter(
      (s) => s.participantId !== participantId && s.status !== 'skipped',
    ).length
    if (viableAfter < 2) {
      throw validationError(
        'Exclusion would leave fewer than two possible successful participants.',
      )
    }

    slot.status = 'skipped'
    slot.response = null
    run.snapshot = {
      ...run.snapshot,
      excludedParticipantIds: [...new Set([...run.snapshot.excludedParticipantIds, participantId])],
    }
    this.patchRound(run, round)
    this.emit(run, { type: 'participant.excluded', roundNumber, participantId })

    const unresolvedFailures = round.slots.some((s) => s.status === 'failed')
    const unsettled = round.slots.some(
      (s) => s.status === 'pending' || s.status === 'reading' || s.status === 'thinking',
    )
    if (!unresolvedFailures && !unsettled) {
      this.publishRound(run, roundNumber)
    }
  }

  private cancelRun(run: StoredRun): void {
    if (this.isTerminal(run.snapshot.status)) {
      throw conflictError('Run is already terminal.')
    }
    for (const cancel of run.cancels) cancel()
    run.cancels = []

    const current = run.snapshot.rounds.find((r) => r.number === run.snapshot.currentRoundNumber)
    if (current && !current.published) {
      current.status = 'cancelled'
      current.slots = current.slots.map((slot) => this.cancelSlot(slot))
      this.patchRound(run, current)
    }

    run.snapshot = {
      ...run.snapshot,
      status: 'cancelled',
      endedAt: iso(this.clock),
    }
    this.emit(run, { type: 'run.cancelled' })
  }

  private cancelSlot(slot: RoundSlot): RoundSlot {
    if (slot.status === 'submitted' || slot.status === 'skipped') return slot
    const attempts = slot.attempts.map((a) =>
      a.endedAt
        ? a
        : {
            ...a,
            status: 'cancelled' as const,
            endedAt: iso(this.clock),
          },
    )
    return {
      ...slot,
      status: 'cancelled',
      attempts,
    }
  }
}

export function createMockRoundtableApi(options?: MockRoundtableApiOptions): MockRoundtableApi {
  return new MockRoundtableApi(options)
}

export function createTestMock(options?: MockRoundtableApiOptions): MockRoundtableApi {
  const clock = options?.clock ?? createFakeClock()
  return new MockRoundtableApi({ ...options, clock, humanDelays: false })
}
