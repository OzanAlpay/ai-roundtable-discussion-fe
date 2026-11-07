import type { RunSnapshot } from '../domain/types'
import { unpublishedPartials } from '../domain/selectors'

function escapeMd(text: string): string {
  return text.replace(/([\\`*_{}[\]()#+\-.!|>])/g, '\\$1')
}

export function exportMarkdown(snapshot: RunSnapshot): string {
  const lines: string[] = []
  const incomplete = !['completed', 'cancelled', 'failed'].includes(snapshot.status)
  lines.push('# Copilot Roundtable export')
  lines.push('')
  lines.push('> Simulated demo content — not live model output.')
  lines.push('')
  if (incomplete) lines.push('**Incomplete meeting**')
  if (snapshot.status === 'cancelled') lines.push('**Meeting cancelled**')
  lines.push('')
  lines.push(`- Status: ${snapshot.status}`)
  lines.push(`- Run ID: \`${snapshot.id}\``)
  lines.push(`- Rounds configured: ${snapshot.config.totalRounds}`)
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
      if (response.revision.reason) lines.push(`- Reason: ${escapeMd(response.revision.reason)}`)
      lines.push('')
      lines.push(escapeMd(response.rationale))
      lines.push('')
      if (response.supportingPoints.length) {
        lines.push('Supporting points:')
        for (const point of response.supportingPoints) lines.push(`- ${escapeMd(point)}`)
        lines.push('')
      }
      if (response.concerns.length) {
        lines.push('Concerns:')
        for (const point of response.concerns) lines.push(`- ${escapeMd(point)}`)
        lines.push('')
      }
    }
    if (round.published.excludedParticipantIds.length) {
      lines.push(
        `Excluded: ${round.published.excludedParticipantIds.map(escapeMd).join(', ')}`,
      )
      lines.push('')
    }
  }

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
