import { z } from 'zod'
import type { Catalog, DiscussionConfig, RunEvent, RunSnapshot } from './types'

const idSchema = z.string().min(1)
const accentSchema = z.enum(['sage', 'lavender', 'peach', 'sky'])
const avatarSchema = z.enum(['round', 'square', 'antenna'])
const confidenceSchema = z.enum(['low', 'medium', 'high', 'unspecified'])
const revisionKindSchema = z.enum(['initial', 'changed', 'unchanged', 'unknown'])

export const providerSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  iconKey: z.string().min(1),
})

export const modelSchema = z.object({
  id: idSchema,
  providerId: idSchema,
  name: z.string().min(1),
  family: z.string().optional(),
  availability: z.enum(['available', 'unavailable']),
  unavailableReason: z.string().optional(),
  isDemo: z.boolean(),
})

export const catalogSchema = z.object({
  schemaVersion: z.literal(1),
  providers: z.array(providerSchema),
  models: z.array(modelSchema),
})

export const participantConfigSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(40),
  providerId: idSchema,
  modelId: idSchema,
  roleLabel: z.string().min(1).max(80),
  roleInstruction: z.string().max(1000),
  accent: accentSchema,
  avatarVariant: avatarSchema,
})

export const discussionConfigSchema = z.object({
  question: z.string().min(20).max(8000),
  participants: z.array(participantConfigSchema).min(2).max(6),
  totalRounds: z.union([z.literal(2), z.literal(3)]),
  attemptTimeoutMs: z.number().int().min(10_000).max(120_000),
})

const responseRefSchema = z.object({
  roundNumber: z.number().int().positive(),
  participantId: idSchema,
  responseId: idSchema,
})

export const opinionSchema = z.object({
  id: idSchema,
  participantId: idSchema,
  roundNumber: z.number().int().positive(),
  position: z.string(),
  rationale: z.string(),
  supportingPoints: z.array(z.string()),
  concerns: z.array(z.string()),
  openQuestions: z.array(z.string()),
  confidence: confidenceSchema,
  revision: z.object({
    kind: revisionKindSchema,
    reason: z.string().nullable(),
    influencedBy: z.array(responseRefSchema),
  }),
  submittedAt: z.string(),
  elapsedMs: z.number().optional(),
})

export const publicErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  retryable: z.boolean(),
})

const attemptSchema = z.object({
  id: idSchema,
  number: z.number().int().positive(),
  status: z.enum(['reading', 'thinking', 'succeeded', 'failed', 'cancelled']),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  error: publicErrorSchema.nullable(),
})

const roundSlotSchema = z.object({
  participantId: idSchema,
  status: z.enum([
    'pending',
    'reading',
    'thinking',
    'submitted',
    'failed',
    'skipped',
    'cancelled',
  ]),
  attempts: z.array(attemptSchema),
  response: opinionSchema.nullable(),
})

const publishedRoundSchema = z.object({
  id: idSchema,
  number: z.number().int().positive(),
  publishedAt: z.string(),
  responses: z.array(opinionSchema),
  excludedParticipantIds: z.array(idSchema),
})

const roundStateSchema = z.object({
  number: z.number().int().positive(),
  kind: z.enum(['independent', 'reconsideration']),
  status: z.enum(['active', 'blocked', 'published', 'cancelled']),
  inputSnapshotId: idSchema.nullable(),
  expectedParticipantIds: z.array(idSchema),
  slots: z.array(roundSlotSchema),
  startedAt: z.string(),
  published: publishedRoundSchema.nullable(),
})

export const runSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  id: idSchema,
  revision: z.number().int().nonnegative(),
  lastEventSeq: z.number().int().nonnegative(),
  status: z.enum([
    'queued',
    'round_active',
    'round_blocked',
    'between_rounds',
    'completed',
    'cancelled',
    'failed',
  ]),
  config: discussionConfigSchema,
  participantLabels: z.array(
    z.object({
      participantId: idSchema,
      providerName: z.string(),
      modelName: z.string(),
    }),
  ),
  excludedParticipantIds: z.array(idSchema),
  currentRoundNumber: z.number().int().positive().nullable(),
  rounds: z.array(roundStateSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
  endedAt: z.string().nullable(),
  terminalError: publicErrorSchema.nullable(),
})

const runEventDetailSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('run.created') }),
  z.object({ type: z.literal('round.started'), roundNumber: z.number().int().positive() }),
  z.object({
    type: z.literal('participant.updated'),
    roundNumber: z.number().int().positive(),
    participantId: idSchema,
  }),
  z.object({ type: z.literal('round.blocked'), roundNumber: z.number().int().positive() }),
  z.object({
    type: z.literal('participant.retried'),
    roundNumber: z.number().int().positive(),
    participantId: idSchema,
  }),
  z.object({
    type: z.literal('participant.excluded'),
    roundNumber: z.number().int().positive(),
    participantId: idSchema,
  }),
  z.object({
    type: z.literal('round.published'),
    roundNumber: z.number().int().positive(),
    snapshotId: idSchema,
  }),
  z.object({ type: z.literal('run.completed') }),
  z.object({ type: z.literal('run.cancelled') }),
  z.object({ type: z.literal('run.failed') }),
])

export const runEventSchema = z.object({
  schemaVersion: z.literal(1),
  runId: idSchema,
  eventId: idSchema,
  seq: z.number().int().positive(),
  occurredAt: z.string(),
  detail: runEventDetailSchema,
  snapshot: runSnapshotSchema,
})

export function parseCatalog(data: unknown): Catalog {
  return catalogSchema.parse(data)
}

export function parseDiscussionConfig(data: unknown): DiscussionConfig {
  return discussionConfigSchema.parse(data)
}

export function parseRunSnapshot(data: unknown): RunSnapshot {
  return runSnapshotSchema.parse(data)
}

export function parseRunEvent(data: unknown): RunEvent {
  return runEventSchema.parse(data)
}

export interface DraftValidationIssue {
  path: string
  message: string
}

export function validateDraftConfig(
  config: DiscussionConfig,
  catalog: Catalog,
): DraftValidationIssue[] {
  const issues: DraftValidationIssue[] = []
  const q = config.question.trim()
  if (q.length < 20) issues.push({ path: 'question', message: 'Question must be at least 20 characters.' })
  if (q.length > 8000) issues.push({ path: 'question', message: 'Question must be at most 8000 characters.' })
  if (config.participants.length < 2 || config.participants.length > 6) {
    issues.push({ path: 'participants', message: 'Use between 2 and 6 participants.' })
  }
  if (config.totalRounds !== 2 && config.totalRounds !== 3) {
    issues.push({ path: 'totalRounds', message: 'Choose 2 or 3 rounds.' })
  }
  if (config.attemptTimeoutMs < 10_000 || config.attemptTimeoutMs > 120_000) {
    issues.push({ path: 'attemptTimeoutMs', message: 'Timeout must be 10–120 seconds.' })
  }

  const ids = new Set<string>()
  for (const [index, p] of config.participants.entries()) {
    if (ids.has(p.id)) issues.push({ path: `participants.${index}.id`, message: 'Participant IDs must be unique.' })
    ids.add(p.id)
    if (!p.name.trim()) issues.push({ path: `participants.${index}.name`, message: 'Name is required.' })
    if (p.name.trim().length > 40) {
      issues.push({ path: `participants.${index}.name`, message: 'Name must be at most 40 characters.' })
    }
    const provider = catalog.providers.find((x) => x.id === p.providerId)
    if (!provider) {
      issues.push({ path: `participants.${index}.providerId`, message: 'Unknown provider.' })
    }
    const model = catalog.models.find((x) => x.id === p.modelId)
    if (!model) {
      issues.push({ path: `participants.${index}.modelId`, message: 'Unknown model.' })
    } else if (model.providerId !== p.providerId) {
      issues.push({ path: `participants.${index}.modelId`, message: 'Model does not belong to the selected provider.' })
    } else if (model.availability !== 'available') {
      issues.push({ path: `participants.${index}.modelId`, message: model.unavailableReason ?? 'Model unavailable.' })
    }
    if (p.roleLabel === 'Custom' && !p.roleInstruction.trim()) {
      issues.push({
        path: `participants.${index}.roleInstruction`,
        message: 'Custom roles require instructions.',
      })
    }
    if (p.roleInstruction.length > 1000) {
      issues.push({
        path: `participants.${index}.roleInstruction`,
        message: 'Role instructions must be at most 1000 characters.',
      })
    }
  }
  return issues
}
