import type { Opinion, PublishedRound, RunEvent, RunSnapshot } from './types'

export class ProtocolError extends Error {
  readonly code: string
  readonly retryable: boolean

  constructor(code: string, message: string, retryable = false) {
    super(message)
    this.name = 'ProtocolError'
    this.code = code
    this.retryable = retryable
  }
}

function assert(condition: unknown, code: string, message: string): asserts condition {
  if (!condition) throw new ProtocolError(code, message)
}

export function assertOpinionConsistency(opinion: Opinion, roundNumber: number): void {
  assert(
    opinion.roundNumber === roundNumber,
    'opinion.round_mismatch',
    'Opinion round does not match slot.',
  )
  if (roundNumber === 1) {
    assert(
      opinion.revision.kind === 'initial',
      'opinion.revision_initial',
      'Round 1 revisions must be initial.',
    )
  } else {
    assert(
      opinion.revision.kind !== 'initial',
      'opinion.revision_later',
      'Later revisions cannot be initial.',
    )
  }
  if (opinion.revision.kind === 'changed') {
    assert(
      !!opinion.revision.reason?.trim(),
      'opinion.changed_reason',
      'Changed revisions require a reason.',
    )
  }
}

export function assertPublishedRound(published: PublishedRound): void {
  assert(
    published.responses.length >= 2,
    'publish.min_success',
    'Published round needs at least two responses.',
  )
  const ids = new Set<string>()
  for (const response of published.responses) {
    assert(
      !ids.has(response.id),
      'publish.duplicate_response',
      'Duplicate response IDs in publication.',
    )
    ids.add(response.id)
    assertOpinionConsistency(response, published.number)
  }
}

export function assertRunSnapshot(snapshot: RunSnapshot): void {
  assert(
    snapshot.schemaVersion === 1,
    'schema.unsupported',
    `Unsupported schema version ${snapshot.schemaVersion}`,
  )
  assert(
    snapshot.revision === snapshot.lastEventSeq,
    'seq.revision_mismatch',
    'revision must equal lastEventSeq',
  )

  const participantIds = new Set(snapshot.config.participants.map((p) => p.id))
  assert(
    participantIds.size === snapshot.config.participants.length,
    'config.duplicate_participants',
    'Duplicate participant IDs',
  )

  for (const label of snapshot.participantLabels) {
    assert(
      participantIds.has(label.participantId),
      'labels.unknown_participant',
      'Unknown participant label',
    )
  }

  for (const excluded of snapshot.excludedParticipantIds) {
    assert(participantIds.has(excluded), 'exclude.unknown', 'Excluded participant not in config')
  }

  assert(
    snapshot.participantLabels.length === participantIds.size &&
      new Set(snapshot.participantLabels.map((l) => l.participantId)).size === participantIds.size,
    'labels.incomplete',
    'Each participant needs one frozen identity label',
  )
  assert(
    snapshot.rounds.length <= snapshot.config.totalRounds,
    'round.excess',
    'More rounds than configured',
  )
  if (snapshot.status === 'completed')
    assert(
      snapshot.rounds.length === snapshot.config.totalRounds &&
        snapshot.rounds.every((r) => r.published),
      'run.incomplete',
      'Completed runs require every configured round to be published',
    )
  if (['completed', 'cancelled', 'failed'].includes(snapshot.status))
    assert(!!snapshot.endedAt, 'run.end_missing', 'Terminal runs require an end time')
  const responseIds = new Set<string>()
  const publishedByNumber = new Map<number, PublishedRound>()
  for (const [index, round] of snapshot.rounds.entries()) {
    assert(round.number === index + 1, 'round.order', 'Rounds must be contiguous and ordered')
    assert(
      round.status !== 'published' || !!round.published,
      'round.publication_missing',
      'Published status requires a publication',
    )
    const expected = new Set(round.expectedParticipantIds)
    assert(
      expected.size === round.expectedParticipantIds.length,
      'round.duplicate_expected',
      'Duplicate expected IDs',
    )
    for (const id of expected) {
      assert(
        participantIds.has(id),
        'round.unknown_expected',
        'Expected participant missing from config',
      )
    }
    assert(
      round.slots.length === expected.size,
      'round.slot_count',
      'One slot required per expected participant',
    )
    const slotIds = new Set(round.slots.map((s) => s.participantId))
    assert(
      slotIds.size === expected.size,
      'round.slot_ids',
      'Slot participant IDs must match expected set',
    )
    for (const id of expected)
      assert(slotIds.has(id), 'round.slot_missing', 'Missing slot for expected participant')

    if (round.number === 1) {
      assert(round.kind === 'independent', 'round.kind_1', 'Round 1 must be independent')
      assert(
        round.inputSnapshotId === null,
        'round.input_1',
        'Round 1 must have null input snapshot',
      )
    } else {
      assert(
        round.kind === 'reconsideration',
        'round.kind_later',
        'Later rounds must be reconsideration',
      )
      assert(
        !!round.inputSnapshotId,
        'round.input_later',
        'Later rounds require previous publication id',
      )
      const prev = publishedByNumber.get(round.number - 1)
      assert(
        !!prev,
        'round.previous_missing',
        'Previous round must be published before reconsideration',
      )
      if (prev)
        assert(
          prev.id === round.inputSnapshotId,
          'round.input_match',
          'Input snapshot must match previous publication',
        )
    }

    for (const slot of round.slots) {
      if (slot.status === 'submitted') {
        assert(!!slot.response, 'slot.submitted_response', 'Submitted slots need a response')
        assert(
          slot.response!.participantId === slot.participantId,
          'slot.response_owner',
          'Response participant mismatch',
        )
        assertOpinionConsistency(slot.response!, round.number)
        assert(
          !responseIds.has(slot.response!.id),
          'response.duplicate',
          'Response IDs must be unique across rounds',
        )
        responseIds.add(slot.response!.id)
      }
      if (slot.status === 'skipped') {
        assert(
          slot.response === null,
          'slot.skipped_response',
          'Skipped slots cannot carry responses',
        )
      }
    }

    if (round.published) {
      assert(
        round.status === 'published',
        'round.published_status',
        'Published rounds must have published status',
      )
      assertPublishedRound(round.published)
      assert(
        round.published.number === round.number,
        'publish.round_mismatch',
        'Publication round mismatch',
      )
      assert(
        round.slots.every((s) => s.status === 'submitted' || s.status === 'skipped'),
        'publish.unresolved',
        'Cannot publish unresolved slots',
      )
      assert(
        new Set(round.published.responses.map((r) => r.participantId)).size ===
          round.published.responses.length,
        'publish.duplicate_author',
        'Each participant contributes at most one response',
      )
      const successIds = new Set(
        round.slots
          .filter((s) => s.status === 'submitted' && s.response)
          .map((s) => s.participantId),
      )
      assert(
        round.published.responses.length === successIds.size,
        'publish.response_count',
        'Published responses must match successful slots',
      )
      for (const response of round.published.responses) {
        assert(
          successIds.has(response.participantId),
          'publish.response_member',
          'Published response not among successful slots',
        )
        const slot = round.slots.find((s) => s.participantId === response.participantId)
        assert(
          JSON.stringify(slot?.response) === JSON.stringify(response),
          'publish.response_identity',
          'Published response must equal slot response',
        )
      }
      for (const ref of round.published.responses.flatMap((r) => r.revision.influencedBy)) {
        assert(
          ref.roundNumber < round.number,
          'ref.future',
          'Influence references must point to earlier rounds',
        )
        const sourceRound = publishedByNumber.get(ref.roundNumber)
        assert(!!sourceRound, 'ref.missing_round', 'Influence reference round missing')
        assert(
          sourceRound!.responses.some(
            (r) => r.id === ref.responseId && r.participantId === ref.participantId,
          ),
          'ref.missing_response',
          'Influence reference response missing',
        )
      }
      publishedByNumber.set(round.number, round.published)
    }
  }
}

export function assertRunEvent(event: RunEvent): void {
  assert(
    event.schemaVersion === 1,
    'schema.unsupported',
    `Unsupported event schema ${event.schemaVersion}`,
  )
  assert(
    event.seq === event.snapshot.lastEventSeq,
    'event.seq_mismatch',
    'Event seq must equal snapshot lastEventSeq',
  )
  assert(
    event.seq === event.snapshot.revision,
    'event.revision_mismatch',
    'Event seq must equal snapshot revision',
  )
  assert(
    event.runId === event.snapshot.id,
    'event.run_mismatch',
    'Event runId must match snapshot id',
  )
  assertRunSnapshot(event.snapshot)
}

export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested)
    }
  }
  return value
}
