import type { Opinion, RoundSlot, RoundState, RunSnapshot } from './types'

export function currentRound(snapshot: RunSnapshot | null): RoundState | null {
  if (!snapshot?.currentRoundNumber) return null
  return snapshot.rounds.find((r) => r.number === snapshot.currentRoundNumber) ?? null
}

export function publishedRounds(snapshot: RunSnapshot | null): RoundState[] {
  return snapshot?.rounds.filter((r) => r.published) ?? []
}

export function readyCount(round: RoundState | null): { ready: number; total: number } {
  if (!round) return { ready: 0, total: 0 }
  const ready = round.slots.filter((s) => s.status === 'submitted' || s.status === 'skipped').length
  return { ready, total: round.slots.length }
}

export function slotFor(round: RoundState | null, participantId: string): RoundSlot | null {
  return round?.slots.find((s) => s.participantId === participantId) ?? null
}

export function statusLabel(
  slot: RoundSlot | null,
  runStatus: RunSnapshot['status'] | null,
): string {
  if (!slot) return 'Waiting'
  switch (slot.status) {
    case 'pending':
      return 'Waiting'
    case 'reading':
      return 'Reading previous round'
    case 'thinking':
      return 'Thinking'
    case 'submitted':
      return runStatus === 'round_active' || runStatus === 'round_blocked'
        ? 'Ready—waiting for others'
        : 'Ready'
    case 'failed':
      return slot.attempts.at(-1)?.error?.code === 'timeout' ? 'Timed out' : 'Failed'
    case 'skipped':
      return 'Excluded'
    case 'cancelled':
      return 'Cancelled'
    default:
      return 'Waiting'
  }
}

export function participantDisplayName(
  snapshot: RunSnapshot,
  participantId: string,
): { name: string; seatNumber: number | null } {
  const names = snapshot.config.participants.map((p) => p.name.trim().toLowerCase())
  const participant = snapshot.config.participants.find((p) => p.id === participantId)
  if (!participant) return { name: participantId, seatNumber: null }
  const duplicates = names.filter((n) => n === participant.name.trim().toLowerCase()).length > 1
  const seatNumber = duplicates
    ? snapshot.config.participants.findIndex((p) => p.id === participantId) + 1
    : null
  return { name: participant.name, seatNumber }
}

export interface ComparisonRow {
  participantId: string
  name: string
  providerName: string
  modelName: string
  initial: Opinion | null
  latest: Opinion | null
  revisionKind: Opinion['revision']['kind'] | 'missing'
  revisionReason: string | null
  influencedBy: Opinion['revision']['influencedBy']
  history: Array<{ roundNumber: number; position: string; kind: Opinion['revision']['kind'] }>
  excluded: boolean
}

export function comparisonRows(snapshot: RunSnapshot | null): ComparisonRow[] {
  if (!snapshot) return []
  const published = publishedRounds(snapshot)
  return snapshot.config.participants.map((participant) => {
    const label = snapshot.participantLabels.find((l) => l.participantId === participant.id)
    const history = published
      .map((round) => {
        const response = round.published?.responses.find((r) => r.participantId === participant.id)
        return response
          ? {
              roundNumber: round.number,
              position: response.position,
              kind: response.revision.kind,
            }
          : null
      })
      .filter((x): x is NonNullable<typeof x> => !!x)

    const initial =
      published[0]?.published?.responses.find((r) => r.participantId === participant.id) ?? null
    const latest =
      [...published]
        .reverse()
        .map((r) => r.published?.responses.find((x) => x.participantId === participant.id) ?? null)
        .find(Boolean) ?? null

    return {
      participantId: participant.id,
      name: participant.name,
      providerName: label?.providerName ?? participant.providerId,
      modelName: label?.modelName ?? participant.modelId,
      initial,
      latest,
      revisionKind: latest?.revision.kind ?? 'missing',
      revisionReason: latest?.revision.reason ?? null,
      influencedBy: latest?.revision.influencedBy ?? [],
      history,
      excluded: snapshot.excludedParticipantIds.includes(participant.id),
    }
  })
}

export function activityEntries(snapshot: RunSnapshot | null): Array<{ id: string; text: string }> {
  if (!snapshot) return []
  const entries: Array<{ id: string; text: string }> = [
    {
      id: `${snapshot.id}-created`,
      text: `Meeting created (${snapshot.config.participants.length} participants, ${snapshot.config.totalRounds} rounds).`,
    },
  ]
  for (const round of snapshot.rounds) {
    entries.push({
      id: `${snapshot.id}-r${round.number}-start`,
      text: `Round ${round.number} started (${round.kind}).`,
    })
    for (const slot of round.slots) {
      for (const attempt of slot.attempts) {
        if (attempt.number > 1)
          entries.push({
            id: `${attempt.id}-retry`,
            text: `${participantName(snapshot, slot.participantId)} retried in round ${round.number} (attempt ${attempt.number}).`,
          })
        if (attempt.error)
          entries.push({
            id: `${attempt.id}-error`,
            text: `${participantName(snapshot, slot.participantId)} in round ${round.number}: ${attempt.error.message}`,
          })
      }
      if (slot.status === 'skipped') {
        entries.push({
          id: `${snapshot.id}-r${round.number}-skip-${slot.participantId}`,
          text: `${participantName(snapshot, slot.participantId)} excluded from round ${round.number} onward.`,
        })
      }
    }
    if (round.published) {
      entries.push({
        id: round.published.id,
        text: `Round ${round.number} published (${round.published.responses.length} responses).`,
      })
    }
  }
  if (snapshot.status === 'completed')
    entries.push({ id: `${snapshot.id}-done`, text: 'Meeting completed.' })
  if (snapshot.status === 'cancelled')
    entries.push({ id: `${snapshot.id}-cancel`, text: 'Meeting cancelled.' })
  if (snapshot.status === 'failed') {
    entries.push({
      id: `${snapshot.id}-failed`,
      text: `Meeting failed: ${snapshot.terminalError?.message ?? 'unknown error'}.`,
    })
  }
  return entries
}

function participantName(snapshot: RunSnapshot, participantId: string): string {
  return snapshot.config.participants.find((p) => p.id === participantId)?.name ?? participantId
}

export function unpublishedPartials(snapshot: RunSnapshot | null): Opinion[] {
  if (!snapshot || !['cancelled', 'failed'].includes(snapshot.status)) return []
  const round = currentRound(snapshot)
  if (!round || round.published) return []
  return round.slots.filter((s) => s.status === 'submitted' && s.response).map((s) => s.response!)
}

export function canRetry(snapshot: RunSnapshot | null, participantId: string): boolean {
  if (!snapshot || snapshot.status !== 'round_blocked') return false
  const round = currentRound(snapshot)
  const slot = slotFor(round, participantId)
  return !!slot && slot.status === 'failed' && !!slot.attempts.at(-1)?.error?.retryable
}

export function canExclude(snapshot: RunSnapshot | null, participantId: string): boolean {
  if (!snapshot || snapshot.status !== 'round_blocked') return false
  const round = currentRound(snapshot)
  const slot = slotFor(round, participantId)
  if (!slot || slot.status !== 'failed') return false
  const remainingPossible = round!.slots.filter(
    (s) =>
      s.participantId !== participantId &&
      (s.status === 'submitted' ||
        s.status === 'failed' ||
        s.status === 'pending' ||
        s.status === 'thinking' ||
        s.status === 'reading'),
  ).length
  // After exclusion, need at least two possible successful participants among remaining non-skipped.
  const viableAfter = round!.slots.filter((s) => {
    if (s.participantId === participantId) return false
    if (s.status === 'skipped') return false
    return true
  }).length
  return viableAfter >= 2 && remainingPossible >= 2
}
