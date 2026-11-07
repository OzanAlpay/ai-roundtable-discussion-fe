import type { DiscussionConfig, Opinion, ParticipantConfig } from '../../domain/types'
import { DEMO_CATALOG, DEFAULT_ROLE_INSTRUCTIONS } from './catalog'

const SAMPLE_QUESTION = 'Should we replace our current frontend state-management library?'

export function createDefaultParticipants(): ParticipantConfig[] {
  return [
    {
      id: 'p-architect',
      name: 'Architect',
      providerId: 'demo-copilot',
      modelId: 'demo-gpt',
      roleLabel: 'Architect',
      roleInstruction: DEFAULT_ROLE_INSTRUCTIONS.Architect,
      accent: 'sage',
      avatarVariant: 'round',
    },
    {
      id: 'p-skeptic',
      name: 'Skeptic',
      providerId: 'demo-anthropic',
      modelId: 'demo-claude',
      roleLabel: 'Skeptic',
      roleInstruction: DEFAULT_ROLE_INSTRUCTIONS.Skeptic,
      accent: 'lavender',
      avatarVariant: 'antenna',
    },
    {
      id: 'p-pragmatist',
      name: 'Pragmatist',
      providerId: 'demo-openai',
      modelId: 'demo-gpt-fast',
      roleLabel: 'Pragmatist',
      roleInstruction: DEFAULT_ROLE_INSTRUCTIONS.Pragmatist,
      accent: 'peach',
      avatarVariant: 'square',
    },
  ]
}

export function createDefaultDraftConfig(): DiscussionConfig {
  return {
    question: SAMPLE_QUESTION,
    participants: createDefaultParticipants(),
    totalRounds: 2,
    attemptTimeoutMs: 30_000,
  }
}

export function isSampleQuestion(question: string): boolean {
  return question.trim().toLowerCase() === SAMPLE_QUESTION.toLowerCase()
}

type FixtureOpinion = Omit<Opinion, 'id' | 'participantId' | 'roundNumber' | 'submittedAt' | 'elapsedMs'>

const SAMPLE_ROUND1: Record<string, FixtureOpinion> = {
  'p-architect': {
    position: 'Migrate',
    rationale: 'A modern library would simplify long-term maintenance and reduce custom glue.',
    supportingPoints: [
      'Current abstractions leak into feature code',
      'Migration can be staged by domain',
    ],
    concerns: ['Short-term throughput dip during migration'],
    openQuestions: ['Which modules own the highest churn today?'],
    confidence: 'medium',
    revision: { kind: 'initial', reason: null, influencedBy: [] },
  },
  'p-skeptic': {
    position: 'Keep',
    rationale: 'Migration risk currently outweighs demonstrated benefit.',
    supportingPoints: [
      'Team already ships features on the existing stack',
      'No clear incident or velocity evidence yet',
    ],
    concerns: ['Hidden rewrite cost and regression risk'],
    openQuestions: ['What measurable pain threshold would justify change?'],
    confidence: 'high',
    revision: { kind: 'initial', reason: null, influencedBy: [] },
  },
  'p-pragmatist': {
    position: 'Investigate first',
    rationale: 'Establish evidence of pain and measurable success criteria before committing.',
    supportingPoints: [
      'A time-boxed spike can bound risk',
      'Criteria make a later decision cheaper',
    ],
    concerns: ['Analysis paralysis if the spike is unbounded'],
    openQuestions: ['Which two metrics would decide go/no-go?'],
    confidence: 'medium',
    revision: { kind: 'initial', reason: null, influencedBy: [] },
  },
}

export function sampleRound2(
  participantId: string,
  previousByParticipant: Record<string, Opinion>,
): FixtureOpinion | null {
  if (participantId === 'p-architect') {
    const pragmatist = previousByParticipant['p-pragmatist']
    return {
      position: 'Investigate first',
      rationale:
        'The missing-evidence argument is persuasive; migrate only after a bounded proof.',
      supportingPoints: ['Evidence first reduces rewrite risk', 'Architecture goals still matter later'],
      concerns: ['Delaying migration prolongs current friction'],
      openQuestions: ['How large should the spike be?'],
      confidence: 'medium',
      revision: {
        kind: 'changed',
        reason: 'Changed after Pragmatist’s missing-evidence argument.',
        influencedBy: pragmatist
          ? [
              {
                roundNumber: 1,
                participantId: pragmatist.participantId,
                responseId: pragmatist.id,
              },
            ]
          : [],
      },
    }
  }
  if (participantId === 'p-skeptic') {
    return {
      position: 'Keep',
      rationale: 'Still unconvinced; disagreement remains until pain is measured.',
      supportingPoints: ['No new production evidence appeared', 'Spike must not become a soft rewrite'],
      concerns: ['Investigation can quietly expand scope'],
      openQuestions: ['Who owns the decision gate?'],
      confidence: 'high',
      revision: {
        kind: 'unchanged',
        reason: 'Maintaining disagreement until evidence thresholds are met.',
        influencedBy: [],
      },
    }
  }
  if (participantId === 'p-pragmatist') {
    return {
      position: 'Investigate first',
      rationale: 'Recommend a small evidence-gathering exercise with explicit exit criteria.',
      supportingPoints: ['Keeps options open', 'Creates a shared decision artifact'],
      concerns: ['Needs executive air cover for the spike'],
      openQuestions: [],
      confidence: 'high',
      revision: {
        kind: 'unchanged',
        reason: 'Still recommend investigation before migration.',
        influencedBy: [],
      },
    }
  }
  return null
}

export function sampleRound3(
  participantId: string,
  previousByParticipant: Record<string, Opinion>,
): FixtureOpinion | null {
  if (participantId === 'p-architect') {
    const skeptic = previousByParticipant['p-skeptic']
    return {
      position: 'Keep for now',
      rationale: 'After another pass, defer migration until evidence exists; revisit architecture later.',
      supportingPoints: ['Preserves delivery capacity', 'Leaves a clear reconsideration trigger'],
      concerns: ['Technical debt continues accumulating'],
      openQuestions: [],
      confidence: 'medium',
      revision: {
        kind: 'changed',
        reason: 'Revised again after Skeptic’s insistence on measurable thresholds.',
        influencedBy: skeptic
          ? [{ roundNumber: 2, participantId: skeptic.participantId, responseId: skeptic.id }]
          : [],
      },
    }
  }
  if (participantId === 'p-skeptic') {
    return {
      position: 'Keep',
      rationale: 'No change: thresholds still unmet.',
      supportingPoints: ['Consistency with prior round'],
      concerns: [],
      openQuestions: [],
      confidence: 'high',
      revision: {
        kind: 'unchanged',
        reason: 'Evidence bar unchanged.',
        influencedBy: [],
      },
    }
  }
  if (participantId === 'p-pragmatist') {
    return {
      position: 'Investigate first',
      rationale: 'Still the cheapest reversible path.',
      supportingPoints: ['Aligns Architect and Skeptic on a temporary keep'],
      concerns: [],
      openQuestions: [],
      confidence: 'high',
      revision: {
        kind: 'unchanged',
        reason: 'Investigation plan still fits.',
        influencedBy: [],
      },
    }
  }
  return null
}

export function illustrativeOpinion(
  participant: ParticipantConfig,
  roundNumber: number,
  question: string,
  previous?: Opinion | null,
): FixtureOpinion {
  const excerpt = question.trim().slice(0, 48)
  if (roundNumber === 1) {
    return {
      position: `${participant.roleLabel} lean`,
      rationale: `Illustrative demo response for “${excerpt}…”. Not real model output.`,
      supportingPoints: [`Role lens: ${participant.roleLabel}`, 'Simulated independent opinion'],
      concerns: ['This is demo content for an arbitrary question'],
      openQuestions: ['What evidence would change your mind?'],
      confidence: 'unspecified',
      revision: { kind: 'initial', reason: null, influencedBy: [] },
    }
  }
  return {
    position: previous?.position ?? `${participant.roleLabel} lean`,
    rationale: `Illustrative reconsideration using the shared previous-round snapshot. Demo only.`,
    supportingPoints: ['Same immutable snapshot for all peers', 'No same-round leakage'],
    concerns: ['Not generated by a live model'],
    openQuestions: [],
    confidence: 'unspecified',
    revision: {
      kind: 'unchanged',
      reason: 'Demo fixture maintains position for this arbitrary question.',
      influencedBy: [],
    },
  }
}

export function getSampleRound1(participantId: string): FixtureOpinion | null {
  return SAMPLE_ROUND1[participantId] ?? null
}

export function providerModelLabels(participant: ParticipantConfig): {
  providerName: string
  modelName: string
} {
  const provider = DEMO_CATALOG.providers.find((p) => p.id === participant.providerId)
  const model = DEMO_CATALOG.models.find((m) => m.id === participant.modelId)
  return {
    providerName: provider?.name ?? participant.providerId,
    modelName: model?.name ?? participant.modelId,
  }
}
