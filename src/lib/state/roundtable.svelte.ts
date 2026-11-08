import type { RoundtableApi } from '../api/RoundtableApi'
import type { MockRoundtableApi } from '../api/mock/mockRoundtableApi'
import { DEMO_SCENARIOS } from '../api/mock/scenarios'
import { createDefaultDraftConfig } from '../api/mock/fixtures'
import {
  applyEvent,
  applySnapshot,
  bumpSubscriptionGeneration,
  commitApplied,
  createClientRunState,
  isTerminalStatus,
  setConnection,
  setProtocolError,
  type ClientRunState,
} from '../domain/reducer'
import { reconcileDraft } from '../domain/draft'
import { TransportError } from '../api/transportError'
import { validateDraftConfig } from '../domain/schemas'
import type {
  Catalog,
  ConnectionState,
  DemoScenarioId,
  DiscussionConfig,
  PublicError,
  RunCommand,
  ViewPhase,
} from '../domain/types'
import { clearDraft, loadDraft, loadPrefs, saveDraft, savePrefs } from './draftPersistence'

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

export class RoundtableController {
  catalog: Catalog | null = $state(null)
  draft: DiscussionConfig = $state(createDefaultDraftConfig())
  viewPhase: ViewPhase = $state('setup')
  createError: string | null = $state(null)
  client: ClientRunState = $state(createClientRunState())
  selectedParticipantId: string | null = $state(null)
  selectedTab: string = $state('overview')
  demoScenarioId: DemoScenarioId = $state('healthy-two-rounds')
  pendingCommand: string | null = $state(null)
  draftMessage: string | null = $state(null)
  reloadNotice: string | null = $state(null)
  liveAnnouncement: string = $state('')
  mode: 'mock' | 'http' = $state('mock')

  private disposed = false
  private recoveryPending = false
  private recoveryCount = 0
  private pendingCreate: { requestId: string; config: DiscussionConfig } | null = null
  private uncertainCommand: {
    command: RunCommand
    context: { requestId: string; expectedRevision: number }
  } | null = null
  private api: RoundtableApi
  private mock: MockRoundtableApi | null
  private unsubscribe: (() => void) | null = null
  private activeRunId: string | null = null

  constructor(api: RoundtableApi, mode: 'mock' | 'http', mock: MockRoundtableApi | null) {
    this.api = api
    this.mode = mode
    this.mock = mock
    const prefs = loadPrefs()
    this.selectedTab = prefs.selectedTab
    this.demoScenarioId = DEMO_SCENARIOS.some((s) => s.id === prefs.demoScenarioId)
      ? (prefs.demoScenarioId as DemoScenarioId)
      : 'healthy-two-rounds'
    this.draft = loadDraft()
    if (this.mock) this.mock.setScenario(this.demoScenarioId)
    this.reloadNotice =
      'Draft restored from this browser when available. In-memory demo runs do not survive refresh.'
  }

  get snapshot() {
    return this.client.snapshot
  }

  get connection(): ConnectionState {
    return this.client.connection
  }

  get scenarios() {
    return DEMO_SCENARIOS
  }

  get fieldErrors() {
    if (!this.catalog) return []
    return validateDraftConfig(this.draft, this.catalog)
  }

  async init(): Promise<void> {
    try {
      const catalog = await this.api.getCatalog()
      if (this.disposed) return
      this.catalog = catalog
      this.draft = reconcileDraft(this.draft, catalog)
      this.createError = null
    } catch (error) {
      this.createError = error instanceof Error ? error.message : 'Unable to load model catalog.'
      if (this.mode === 'http') {
        this.createError =
          'Cannot reach the roundtable API. Configure a backend or set VITE_ROUNDTABLE_MODE=mock.'
      }
    }
  }

  setScenario(id: DemoScenarioId): void {
    if (
      this.viewPhase === 'submitting' ||
      (this.snapshot && !isTerminalStatus(this.snapshot.status))
    )
      return
    this.demoScenarioId = id
    this.mock?.setScenario(id)
    const scenario = DEMO_SCENARIOS.find((s) => s.id === id)
    if (scenario?.recommendedRounds) this.draft.totalRounds = scenario.recommendedRounds
    if (scenario?.recommendedParticipantCount) {
      const n = scenario.recommendedParticipantCount
      if (this.draft.participants.length > n) {
        this.draft = {
          ...this.draft,
          participants: this.draft.participants.slice(0, n),
        }
      }
      while (this.draft.participants.length < n) this.addParticipant()
    }
    saveDraft($state.snapshot(this.draft))
    this.persistPrefs()
  }

  updateDraft(mutator: (draft: DiscussionConfig) => DiscussionConfig): void {
    if (this.viewPhase === 'submitting') return
    if (this.viewPhase === 'viewing' && this.snapshot && !isTerminalStatus(this.snapshot.status)) {
      return
    }
    this.draft = mutator(this.draft)
    const result = saveDraft(this.draft)
    this.draftMessage = result.ok ? 'Draft saved in this browser only.' : (result.message ?? null)
  }

  clearSavedDraft(): void {
    clearDraft()
    this.draft = this.catalog
      ? reconcileDraft(createDefaultDraftConfig(), this.catalog)
      : createDefaultDraftConfig()
    this.draftMessage = 'Saved draft cleared.'
  }

  addParticipant(): void {
    this.updateDraft((draft) => {
      if (draft.participants.length >= 6) return draft
      const accents = ['sage', 'lavender', 'peach', 'sky'] as const
      const variants = ['round', 'square', 'antenna'] as const
      const i = draft.participants.length
      const provider = this.catalog?.providers[i % (this.catalog.providers.length || 1)]
      const model =
        this.catalog?.models.find(
          (m) => m.providerId === provider?.id && m.availability === 'available',
        ) ?? this.catalog?.models.find((m) => m.availability === 'available')
      return {
        ...draft,
        participants: [
          ...draft.participants,
          {
            id: newId('p'),
            name: `Agent ${i + 1}`,
            providerId: model?.providerId ?? '',
            modelId: model?.id ?? '',
            roleLabel: 'Custom',
            roleInstruction: 'Contribute a clear engineering opinion.',
            accent: accents[i % accents.length]!,
            avatarVariant: variants[i % variants.length]!,
          },
        ],
      }
    })
  }

  removeParticipant(id: string): void {
    this.updateDraft((draft) => {
      if (draft.participants.length <= 2) return draft
      return {
        ...draft,
        participants: draft.participants.filter((p) => p.id !== id),
      }
    })
  }

  async start(): Promise<void> {
    if (
      !this.catalog ||
      this.disposed ||
      (this.snapshot && !isTerminalStatus(this.snapshot.status))
    )
      return
    const issues = validateDraftConfig(this.draft, this.catalog)
    if (issues.length) {
      this.createError = issues[0]!.message
      this.viewPhase = 'create_error'
      return
    }
    if (this.viewPhase === 'submitting') return
    this.viewPhase = 'submitting'
    this.createError = null
    this.liveAnnouncement = 'Starting roundtable…'

    try {
      this.teardownSubscription()
      this.client = createClientRunState()
      const config = $state.snapshot(this.draft) as DiscussionConfig
      if (
        !this.pendingCreate ||
        JSON.stringify(this.pendingCreate.config) !== JSON.stringify(config)
      )
        this.pendingCreate = { requestId: newId('req'), config }
      const snapshot = await this.api.createRun(this.pendingCreate)
      if (this.disposed) return
      const applied = applySnapshot(this.client, snapshot, { allowJump: true })
      if (applied.kind === 'error') throw new Error(applied.error.message)
      if (applied.kind === 'applied') {
        this.pendingCreate = null
        this.recoveryCount = 0
        this.client = commitApplied(this.client, applied.snapshot)
        this.activeRunId = applied.snapshot.id
      }
      this.viewPhase = 'viewing'
      this.selectedParticipantId = null
      this.selectedTab = 'overview'
      this.subscribeToActiveRun()
      this.liveAnnouncement = 'Meeting started.'
    } catch (error) {
      this.viewPhase = 'create_error'
      this.createError = error instanceof Error ? error.message : 'Unable to start the meeting.'
    }
  }

  async newMeeting(forceCancel = false): Promise<void> {
    if (this.snapshot && !isTerminalStatus(this.snapshot.status)) {
      if (!forceCancel) return
      await this.sendCommand({ type: 'cancel' })
      if (!this.snapshot || !isTerminalStatus(this.snapshot.status)) return
    }
    this.teardownSubscription()
    this.client = createClientRunState()
    this.activeRunId = null
    this.uncertainCommand = null
    this.pendingCreate = null
    this.viewPhase = 'setup'
    this.selectedParticipantId = null
    this.createError = null
    this.liveAnnouncement = 'Ready for a new meeting draft.'
  }

  selectParticipant(id: string | null): void {
    this.selectedParticipantId = id
  }

  setTab(tab: string): void {
    this.selectedTab = tab
    this.persistPrefs()
  }

  async sendCommand(command: RunCommand): Promise<void> {
    if (!this.snapshot || isTerminalStatus(this.snapshot.status)) return
    const key =
      command.type === 'cancel'
        ? 'cancel'
        : `${command.type}:${'participantId' in command ? command.participantId : ''}`
    if (this.pendingCommand) return
    this.pendingCommand = key
    const runId = this.snapshot.id
    const context =
      this.uncertainCommand &&
      JSON.stringify(this.uncertainCommand.command) === JSON.stringify(command)
        ? this.uncertainCommand.context
        : { requestId: newId('cmd'), expectedRevision: this.snapshot.revision }
    this.uncertainCommand = { command, context }
    try {
      const snapshot = await this.api.command(this.snapshot.id, command, context)
      if (this.disposed || this.activeRunId !== runId) return
      this.uncertainCommand = null
      const applied = applySnapshot(this.client, snapshot, {
        allowJump: true,
        expectedRunId: runId,
      })
      if (applied.kind === 'applied') {
        this.client = commitApplied(this.client, applied.snapshot)
        this.announceFromSnapshot()
      }
    } catch (error) {
      if (this.disposed || this.activeRunId !== runId) return
      if (error instanceof TransportError && error.httpStatus && error.httpStatus < 500)
        this.uncertainCommand = null
      this.client = setProtocolError(this.client, {
        code: 'command_failed',
        message: error instanceof Error ? error.message : 'Command failed.',
        retryable: true,
      })
      if (this.snapshot) {
        try {
          const fresh = await this.api.getRun(this.snapshot.id)
          const applied = applySnapshot(this.client, fresh, { allowJump: true })
          if (!this.disposed && this.activeRunId === runId && applied.kind === 'applied') {
            const error = this.client.protocolError
            this.client = { ...commitApplied(this.client, applied.snapshot), protocolError: error }
          }
        } catch {
          // keep protocol error
        }
      }
    } finally {
      if (this.snapshot && isTerminalStatus(this.snapshot.status)) {
        this.teardownSubscription()
        this.client = setConnection(this.client, 'closed')
      }
      this.pendingCommand = null
    }
  }

  async retryConnection(): Promise<void> {
    if (!this.snapshot) {
      await this.init()
      return
    }
    this.recoveryCount = 0
    this.teardownSubscription()
    const runId = this.snapshot.id
    this.client = setProtocolError(this.client, null)
    try {
      const fresh = await this.api.getRun(this.snapshot.id)
      if (this.disposed || this.activeRunId !== runId) return
      const applied = applySnapshot(this.client, fresh, {
        allowJump: true,
        expectedRunId: this.snapshot.id,
      })
      if (applied.kind === 'error') throw new Error(applied.error.message)
      if (applied.kind === 'applied') {
        this.client = commitApplied(this.client, applied.snapshot)
      }
      if (this.snapshot && isTerminalStatus(this.snapshot.status)) {
        this.teardownSubscription()
        this.client = setConnection(this.client, 'closed')
        return
      }
      this.subscribeToActiveRun()
    } catch (error) {
      this.client = setProtocolError(this.client, {
        code: 'reconnect_failed',
        message: error instanceof Error ? error.message : 'Reconnect failed.',
        retryable: true,
      })
    }
  }

  dispose(): void {
    this.disposed = true
    this.activeRunId = null
    this.teardownSubscription()
    this.api.dispose()
  }

  private subscribeToActiveRun(): void {
    if (!this.snapshot || this.disposed || isTerminalStatus(this.snapshot.status)) return
    this.teardownSubscription()
    this.client = bumpSubscriptionGeneration(this.client)
    const generation = this.client.subscriptionGeneration
    const runId = this.snapshot.id
    this.activeRunId = runId
    const afterSeq = this.client.lastAppliedSeq
    const unsubscribe = this.api.subscribe(runId, {
      afterSeq,
      onSnapshot: (snapshot) => {
        if (
          this.disposed ||
          this.activeRunId !== runId ||
          this.client.subscriptionGeneration !== generation
        )
          return
        const result = applySnapshot(this.client, snapshot, {
          allowJump: true,
          expectedRunId: runId,
        })
        if (result.kind === 'applied') {
          this.client = commitApplied(this.client, result.snapshot)
          this.announceFromSnapshot()
          if (isTerminalStatus(result.snapshot.status)) {
            this.teardownSubscription()
            this.client = setConnection(this.client, 'closed')
          }
        } else if (result.kind === 'error') {
          this.client = setProtocolError(this.client, result.error)
          this.teardownSubscription()
        }
      },
      onConnection: (state) => {
        if (
          this.disposed ||
          this.activeRunId !== runId ||
          this.client.subscriptionGeneration !== generation
        )
          return
        this.client = setConnection(this.client, state)
      },
      onError: (error: PublicError) => {
        if (
          this.disposed ||
          this.activeRunId !== runId ||
          this.client.subscriptionGeneration !== generation
        )
          return
        this.client = setProtocolError(this.client, error)
        if (error.code === 'reconnect_exhausted' || !error.retryable) {
          this.teardownSubscription()
          this.client = setConnection(this.client, 'offline')
        }
      },
      onEvent: (event) => {
        if (
          this.disposed ||
          this.activeRunId !== runId ||
          this.client.subscriptionGeneration !== generation
        )
          return
        const result = applyEvent(this.client, event, {
          generation,
          expectedRunId: runId,
        })
        if (result.kind === 'applied') {
          this.client = commitApplied(this.client, result.snapshot)
          this.announceFromSnapshot()
          if (isTerminalStatus(result.snapshot.status)) {
            this.teardownSubscription()
            this.client = setConnection(this.client, 'closed')
          }
        } else if (result.kind === 'gap') {
          void this.handleProtocolRecovery(runId)
        } else if (result.kind === 'error') {
          this.client = setProtocolError(this.client, result.error)
          void this.handleProtocolRecovery(runId)
        }
      },
    })
    if (
      this.client.subscriptionGeneration !== generation ||
      (this.snapshot && isTerminalStatus(this.snapshot.status))
    ) {
      unsubscribe()
    } else {
      this.unsubscribe = unsubscribe
    }
  }

  private async handleProtocolRecovery(runId: string): Promise<void> {
    if (this.recoveryPending) return
    this.teardownSubscription()
    if (this.recoveryCount++ >= 1) {
      this.client = setConnection(this.client, 'offline')
      this.client = setProtocolError(this.client, {
        code: 'protocol.repeated',
        message: 'Repeated inconsistent updates. Retry connection to resynchronize.',
        retryable: true,
      })
      return
    }
    this.recoveryPending = true
    try {
      const fresh = await this.api.getRun(runId)
      if (this.disposed || this.activeRunId !== runId) return
      const applied = applySnapshot(this.client, fresh, { allowJump: true, expectedRunId: runId })
      if (applied.kind === 'error') throw new Error(applied.error.message)
      if (applied.kind === 'applied') {
        this.client = commitApplied(this.client, applied.snapshot)
      }
      if (this.snapshot && isTerminalStatus(this.snapshot.status)) {
        this.client = setConnection(this.client, 'closed')
        return
      }
      this.subscribeToActiveRun()
    } catch (error) {
      this.client = setProtocolError(this.client, {
        code: 'resync_failed',
        message: error instanceof Error ? error.message : 'Resynchronization failed.',
        retryable: true,
      })
      this.client = setConnection(this.client, 'offline')
    } finally {
      this.recoveryPending = false
    }
  }

  private teardownSubscription(): void {
    this.client = bumpSubscriptionGeneration(this.client)
    this.unsubscribe?.()
    this.unsubscribe = null
  }

  private announceFromSnapshot(): void {
    const snap = this.snapshot
    if (!snap) return
    if (snap.status === 'round_blocked') {
      this.liveAnnouncement = `Round ${snap.currentRoundNumber} blocked. Retry or exclude failed participants.`
    } else if (snap.status === 'completed') {
      this.liveAnnouncement = 'Meeting completed.'
    } else if (snap.status === 'cancelled') {
      this.liveAnnouncement = 'Meeting cancelled.'
    } else if (snap.status === 'round_active') {
      this.liveAnnouncement = `Round ${snap.currentRoundNumber} in progress.`
    }
  }

  private persistPrefs(): void {
    savePrefs({
      schemaVersion: 1,
      selectedTab: this.selectedTab,
      demoScenarioId: this.demoScenarioId,
    })
  }
}
