import type { DemoScenarioId } from '../../domain/types'

import type { DemoScenario } from '../../domain/types'
export type { DemoScenario } from '../../domain/types'

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'healthy-two-rounds',
    label: 'Healthy two rounds',
    description: 'All complete; one changes mind, one keeps disagreement.',
    recommendedRounds: 2,
  },
  {
    id: 'three-round-reversal',
    label: 'Three-round reversal',
    description: 'Architect changes in round 2 and revises again in round 3.',
    recommendedRounds: 3,
  },
  {
    id: 'slow-participant',
    label: 'Slow participant',
    description: 'Early responders wait; no premature publication.',
  },
  {
    id: 'timeout-then-retry',
    label: 'Timeout then retry',
    description: 'Round blocks on timeout; retry succeeds with same input.',
  },
  {
    id: 'failure-then-exclusion',
    label: 'Failure then exclusion',
    description: 'Exclude a failed participant; remaining agents continue.',
    recommendedParticipantCount: 3,
    recommendedRounds: 2,
  },
  {
    id: 'insufficient-participants',
    label: 'Insufficient participants',
    description: 'Two-person failure cannot be bypassed with exclusion.',
    recommendedParticipantCount: 2,
  },
  {
    id: 'disconnect-reconnect',
    label: 'Disconnect / reconnect',
    description: 'UI can recover missing state without duplicates (client-tested).',
  },
  {
    id: 'cancellation',
    label: 'Cancellation',
    description: 'Stop mid-flight; published and unpublished stay distinct.',
  },
  {
    id: 'malformed-gapped-event',
    label: 'Malformed / gapped event',
    description: 'Client detects protocol problems and resynchronizes.',
  },
]

export interface ScenarioBehavior {
  /** Delay multipliers / special participant behaviors keyed by participant id or index. */
  delayMsByParticipantId?: Record<string, number>
  failFirstAttemptFor?: string[]
  timeoutFirstAttemptFor?: string[]
  failPermanentlyFor?: string[]
  slowParticipantId?: string
  injectGapAfterSeq?: number
}

export function behaviorForScenario(
  scenario: DemoScenarioId,
  participantIds: string[],
): ScenarioBehavior {
  const first = participantIds[0]
  const second = participantIds[1]
  const third = participantIds[2]

  switch (scenario) {
    case 'healthy-two-rounds':
    case 'three-round-reversal':
    case 'disconnect-reconnect':
    case 'malformed-gapped-event':
      return {}
    case 'slow-participant':
      return {
        slowParticipantId: third ?? second ?? first,
        delayMsByParticipantId: {
          [first]: 400,
          ...(second ? { [second]: 700 } : {}),
          ...(third ? { [third]: 2200 } : second ? { [second]: 2200 } : {}),
        },
      }
    case 'timeout-then-retry':
      return {
        timeoutFirstAttemptFor: [second ?? first],
      }
    case 'failure-then-exclusion':
      return {
        failFirstAttemptFor: [third ?? second ?? first],
        failPermanentlyFor: [third ?? second ?? first],
      }
    case 'insufficient-participants':
      return {
        failFirstAttemptFor: [second ?? first],
        failPermanentlyFor: [second ?? first],
      }
    case 'cancellation':
      return {
        delayMsByParticipantId: Object.fromEntries(
          participantIds.map((id, i) => [id, 1500 + i * 400]),
        ),
      }
    default:
      return {}
  }
}
