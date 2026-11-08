import type { RunSnapshot } from '../domain/types'
import { unpublishedPartials } from '../domain/selectors'

function escapeMd(text: string): string {
  return text.replace(/([\\`*_{}[\]()#+\-.!|>])/g, '\\$1')
}

export function exportMarkdown(snapshot: RunSnapshot, mode: 'mock' | 'http' = 'mock'): string {
  const lines: string[] = []
  const incomplete = snapshot.status !== 'completed'
  lines.push('# Copilot Roundtable export')
  lines.push('')
  if (mode === 'mock') lines.push('> Simulated demo content — not live model output.')
  lines.push('')
  if (incomplete) lines.push('**Incomplete meeting**')
  if (snapshot.status === 'cancelled') lines.push('**Meeting cancelled**')
  lines.push('')
  lines.push(`- Status: ${snapshot.status}`)
  lines.push(`- Run ID: ${escapeMd(snapshot.id)}`)
  lines.push(`- Rounds configured: ${snapshot.config.totalRounds}`)
  lines.push(`- Attempt timeout: ${snapshot.config.attemptTimeoutMs / 1000}s`)
  if (snapshot.terminalError) lines.push(`- Error: ${escapeMd(snapshot.terminalError.message)}`)
  lines.push('')
  lines.push('## Question')
  lines.push('')
  lines.push(escapeMd(snapshot.config.question))
  lines.push('')
  lines.push('## Participants')
  lines.push('')
  for (const p of snapshot.config.participants) {
    const label = snapshot.participantLabels.find((l) => l.participantId === p.id)
    lines.push(
      `- **${escapeMd(p.name)}** — ${escapeMd(p.roleLabel)}; ${escapeMd(label?.providerName ?? p.providerId)} · ${escapeMd(label?.modelName ?? p.modelId)}`,
    )
  }
  lines.push('')

  for (const round of snapshot.rounds) {
    lines.push(`## Round ${round.number} (${round.kind})`)
    lines.push('')
    if (!round.published) {
      lines.push('_Not published._')
      lines.push('')
      continue
    }
    for (const response of round.published.responses) {
      const participant = snapshot.config.participants.find((p) => p.id === response.participantId)
      lines.push(`### ${escapeMd(participant?.name ?? response.participantId)}`)
      lines.push('')
      lines.push(`- Position: **${escapeMd(response.position)}**`)
      lines.push(`- Revision: ${response.revision.kind}`)
      lines.push(`- Self-reported confidence: ${response.confidence}`)
      if (response.elapsedMs != null) lines.push(`- Duration: ${response.elapsedMs} ms`)
      for (const ref of response.revision.influencedBy) {
        const author = snapshot.config.participants.find((p) => p.id === ref.participantId)
        lines.push(
          `- Influenced by: ${escapeMd(author?.name ?? ref.participantId)}, Round ${ref.roundNumber}, response ${escapeMd(ref.responseId)}`,
        )
      }
      if (response.revision.reason) lines.push(`- Reason: ${escapeMd(response.revision.reason)}`)
      lines.push('')
      lines.push(escapeMd(response.rationale))
      lines.push('')
      if (response.supportingPoints.length) {
        lines.push('Supporting points:')
        for (const point of response.supportingPoints) lines.push(`- ${escapeMd(point)}`)
        lines.push('')
      }
      if (response.openQuestions.length) {
        lines.push('Open questions:')
        for (const q of response.openQuestions) lines.push(`- ${escapeMd(q)}`)
        lines.push('')
      }
      if (response.concerns.length) {
        lines.push('Concerns:')
        for (const point of response.concerns) lines.push(`- ${escapeMd(point)}`)
        lines.push('')
      }
    }
    if (round.published.excludedParticipantIds.length) {
      lines.push(`Excluded: ${round.published.excludedParticipantIds.map(escapeMd).join(', ')}`)
      lines.push('')
    }
  }

  lines.push('## Attempts and exclusions', '')
  for (const round of snapshot.rounds) {
    for (const slot of round.slots) {
      const name =
        snapshot.config.participants.find((p) => p.id === slot.participantId)?.name ??
        slot.participantId
      for (const attempt of slot.attempts) {
        lines.push(
          `- Round ${round.number}, ${escapeMd(name)}, attempt ${attempt.number}: ${attempt.status}${attempt.error ? ` — ${escapeMd(attempt.error.message)}` : ''}`,
        )
      }
    }
  }
  lines.push('')
  const partials = unpublishedPartials(snapshot)
  if (partials.length) {
    lines.push('## Unpublished partial results')
    lines.push('')
    lines.push('These responses were submitted but never published as a round.')
    lines.push('')
    for (const response of partials) {
      const participant = snapshot.config.participants.find((p) => p.id === response.participantId)
      lines.push(`### ${escapeMd(participant?.name ?? response.participantId)} (unpublished)`)
      lines.push('')
      lines.push(escapeMd(response.position))
      lines.push('')
      lines.push(escapeMd(response.rationale))
      lines.push('')
    }
  }

  return lines.join('\n')
}

export function downloadText(filename: string, contents: string, mime: string): void {
  const blob = new Blob([contents], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
