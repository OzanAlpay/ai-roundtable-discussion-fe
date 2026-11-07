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
import {
  clearDraft,
  loadDraft,
  loadPrefs,
  saveDraft,
  savePrefs,
} from './draftPersistence'

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
    this.demoScenarioId = (prefs.demoScenarioId as DemoScenarioId) || 'healthy-two-rounds'
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
      this.catalog = await this.api.getCatalog()
    } catch (error) {
      this.createError =
        error instanceof Error
          ? error.message
          : 'Unable to load model catalog.'
      if (this.mode === 'http') {
        this.createError =
          'Cannot reach the roundtable API. Configure a backend or set VITE_ROUNDTABLE_MODE=mock.'
      }
    }
  }

  setScenario(id: DemoScenarioId): void {
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
    this.persistPrefs()
  }

  updateDraft(mutator: (draft: DiscussionConfig) => DiscussionConfig): void {
    if (this.viewPhase === 'viewing' && this.snapshot && !isTerminalStatus(this.snapshot.status)) {
      return
    }
    this.draft = mutator(this.draft)
    const result = saveDraft(this.draft)
    this.draftMessage = result.ok
      ? 'Draft saved in this browser only.'
      : result.message ?? null
  }

  clearSavedDraft(): void {
    clearDraft()
    this.draft = createDefaultDraftConfig()
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
        this.catalog?.models.find((m) => m.providerId === provider?.id && m.availability === 'available') ??
        this.catalog?.models.find((m) => m.availability === 'available')
      return {
        ...draft,
        participants: [
          ...draft.participants,
          {
            id: newId('p'),
            name: `Agent ${i + 1}`,
            providerId: provider?.id ?? 'demo-copilot',
            modelId: model?.id ?? 'demo-gpt',
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
    if (!this.catalog) return
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
      const snapshot = await this.api.createRun({
        requestId: newId('req'),
        config: $state.snapshot(this.draft) as DiscussionConfig,
      })
      const applied = applySnapshot(this.client, snapshot, { allowJump: true })
      if (applied.kind === 'applied') {
        this.client = commitApplied(this.client, applied.snapshot)
        this.activeRunId = applied.snapshot.id
      }
      this.viewPhase = 'viewing'
      this.selectedTab = 'overview'
      this.subscribeToActiveRun()
      this.liveAnnouncement = 'Meeting started.'
    } catch (error) {
      this.viewPhase = 'create_error'
      this.createError =
        error instanceof Error
          ? error.message
          : 'Unable to start the meeting.'
    }
  }

  async newMeeting(forceCancel = false): Promise<void> {
    if (this.snapshot && !isTerminalStatus(this.snapshot.status)) {
      if (!forceCancel) return
      await this.sendCommand({ type: 'cancel' })
    }
    this.teardownSubscription()
    this.client = createClientRunState()
    this.activeRunId = null
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
    if (!this.snapshot) return
    const key = command.type === 'cancel'
      ? 'cancel'
      : `${command.type}:${'participantId' in command ? command.participantId : ''}`
    if (this.pendingCommand) return
    this.pendingCommand = key
    try {
      const snapshot = await this.api.command(
        this.snapshot.id,
        command,
        {
          requestId: newId('cmd'),
          expectedRevision: this.snapshot.revision,
        },
      )
      const applied = applySnapshot(this.client, snapshot, {
        allowJump: true,
        expectedRunId: this.snapshot.id,
      })
      if (applied.kind === 'applied') {
        this.client = commitApplied(this.client, applied.snapshot)
        this.announceFromSnapshot()
      }
    } catch (error) {
      this.client = setProtocolError(this.client, {
        code: 'command_failed',
        message: error instanceof Error ? error.message : 'Command failed.',
        retryable: true,
      })
      if (this.snapshot) {
        try {
          const fresh = await this.api.getRun(this.snapshot.id)
          const applied = applySnapshot(this.client, fresh, { allowJump: true })
          if (applied.kind === 'applied') this.client = commitApplied(this.client, applied.snapshot)
        } catch {
          // keep protocol error
        }
      }
    } finally {
      this.pendingCommand = null
    }
  }

  async retryConnection(): Promise<void> {
    if (!this.snapshot) return
    this.client = setProtocolError(this.client, null)
    try {
      const fresh = await this.api.getRun(this.snapshot.id)
      const applied = applySnapshot(this.client, fresh, {
        allowJump: true,
        expectedRunId: this.snapshot.id,
      })
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
    this.teardownSubscription()
    this.api.dispose()
  }

  private subscribeToActiveRun(): void {
    if (!this.snapshot) return
    this.teardownSubscription()
    this.client = bumpSubscriptionGeneration(this.client)
    const generation = this.client.subscriptionGeneration
    const runId = this.snapshot.id
    this.activeRunId = runId
    const afterSeq = this.client.lastAppliedSeq
    this.unsubscribe = this.api.subscribe(runId, {
      afterSeq,
      onConnection: (state) => {
        if (this.activeRunId !== runId) return
        this.client = setConnection(this.client, state)
      },
      onError: (error: PublicError) => {
        if (this.activeRunId !== runId) return
        this.client = setProtocolError(this.client, error)
        if (error.code.startsWith('protocol.') || error.code === 'reconnect_exhausted') {
          void this.handleProtocolRecovery(runId)
        }
      },
      onEvent: (event) => {
        if (this.activeRunId !== runId) return
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
  }

  private async handleProtocolRecovery(runId: string): Promise<void> {
    this.teardownSubscription()
    try {
      const fresh = await this.api.getRun(runId)
      const applied = applySnapshot(this.client, fresh, { allowJump: true, expectedRunId: runId })
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
    }
  }

  private teardownSubscription(): void {
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
