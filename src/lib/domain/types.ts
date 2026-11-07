export type Id = string
export type RoundNumber = number

export type RunStatus =
  | 'queued'
  | 'round_active'
  | 'round_blocked'
  | 'between_rounds'
  | 'completed'
  | 'cancelled'
  | 'failed'

export interface Provider {
  id: Id
  name: string
  iconKey: string
}

export interface Model {
  id: Id
  providerId: Id
  name: string
  family?: string
  availability: 'available' | 'unavailable'
  unavailableReason?: string
  isDemo: boolean
}

export interface Catalog {
  schemaVersion: 1
  providers: Provider[]
  models: Model[]
}

export type Accent = 'sage' | 'lavender' | 'peach' | 'sky'
export type AvatarVariant = 'round' | 'square' | 'antenna'

export interface ParticipantConfig {
  id: Id
  name: string
  providerId: Id
  modelId: Id
  roleLabel: string
  roleInstruction: string
  accent: Accent
  avatarVariant: AvatarVariant
}

export interface DiscussionConfig {
  question: string
  participants: ParticipantConfig[]
  totalRounds: 2 | 3
  attemptTimeoutMs: number
}

export interface ResponseRef {
  roundNumber: RoundNumber
  participantId: Id
  responseId: Id
}

export interface Opinion {
  id: Id
  participantId: Id
  roundNumber: RoundNumber
  position: string
  rationale: string
  supportingPoints: string[]
  concerns: string[]
  openQuestions: string[]
  confidence: 'low' | 'medium' | 'high' | 'unspecified'
  revision: {
    kind: 'initial' | 'changed' | 'unchanged' | 'unknown'
    reason: string | null
    influencedBy: ResponseRef[]
  }
  submittedAt: string
  elapsedMs?: number
}

export interface PublicError {
  code: string
  message: string
  retryable: boolean
}

export interface Attempt {
  id: Id
  number: number
  status: 'reading' | 'thinking' | 'succeeded' | 'failed' | 'cancelled'
  startedAt: string
  endedAt: string | null
  error: PublicError | null
}

export interface RoundSlot {
  participantId: Id
  status:
    | 'pending'
    | 'reading'
    | 'thinking'
    | 'submitted'
    | 'failed'
    | 'skipped'
    | 'cancelled'
  attempts: Attempt[]
  response: Opinion | null
}

export interface PublishedRound {
  id: Id
  number: RoundNumber
  publishedAt: string
  responses: Opinion[]
  excludedParticipantIds: Id[]
}

export interface RoundState {
  number: RoundNumber
  kind: 'independent' | 'reconsideration'
  status: 'active' | 'blocked' | 'published' | 'cancelled'
  inputSnapshotId: Id | null
  expectedParticipantIds: Id[]
  slots: RoundSlot[]
  startedAt: string
  published: PublishedRound | null
}

export interface ParticipantLabel {
  participantId: Id
  providerName: string
  modelName: string
}

export interface RunSnapshot {
  schemaVersion: 1
  id: Id
  revision: number
  lastEventSeq: number
  status: RunStatus
  config: DiscussionConfig
  participantLabels: ParticipantLabel[]
  excludedParticipantIds: Id[]
  currentRoundNumber: RoundNumber | null
  rounds: RoundState[]
  createdAt: string
  updatedAt: string
  endedAt: string | null
  terminalError: PublicError | null
}

export type RunEventDetail =
  | { type: 'run.created' }
  | { type: 'round.started'; roundNumber: number }
  | { type: 'participant.updated'; roundNumber: number; participantId: Id }
  | { type: 'round.blocked'; roundNumber: number }
  | { type: 'participant.retried'; roundNumber: number; participantId: Id }
  | { type: 'participant.excluded'; roundNumber: number; participantId: Id }
  | { type: 'round.published'; roundNumber: number; snapshotId: Id }
  | { type: 'run.completed' }
  | { type: 'run.cancelled' }
  | { type: 'run.failed' }

export interface RunEvent {
  schemaVersion: 1
  runId: Id
  eventId: Id
  seq: number
  occurredAt: string
  detail: RunEventDetail
  snapshot: RunSnapshot
}

export type ConnectionState =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'offline'
  | 'closed'

export interface CommandContext {
  requestId: Id
  expectedRevision: number
}

export type RunCommand =
  | { type: 'cancel' }
  | { type: 'retry'; roundNumber: number; participantId: Id }
  | { type: 'exclude'; roundNumber: number; participantId: Id }

export type DemoScenarioId =
  | 'healthy-two-rounds'
  | 'three-round-reversal'
  | 'slow-participant'
  | 'timeout-then-retry'
  | 'failure-then-exclusion'
  | 'insufficient-participants'
  | 'disconnect-reconnect'
  | 'cancellation'
  | 'malformed-gapped-event'

export type ViewPhase = 'setup' | 'submitting' | 'viewing' | 'create_error'

export const ROLE_PRESETS = [
  'Architect',
  'Skeptic',
  'Pragmatist',
  'Performance reviewer',
  'Product thinker',
  'Custom',
] as const

export type RolePreset = (typeof ROLE_PRESETS)[number]
