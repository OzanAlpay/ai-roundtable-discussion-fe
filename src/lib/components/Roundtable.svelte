<script lang="ts">
  import type { Catalog, DiscussionConfig, RunSnapshot } from '../domain/types'
  import { currentRound, readyCount, statusLabel } from '../domain/selectors'
  import { getSeatLayout, tableWidthFactor, type SceneMode } from '../scene/getSeatLayout'
  import AgentSeat from './AgentSeat.svelte'
  import OfficeBackdrop from './OfficeBackdrop.svelte'

  interface Props {
    config: DiscussionConfig
    snapshot: RunSnapshot | null
    catalog: Catalog | null
    sceneMode?: SceneMode
    selectedParticipantId: string | null
    onSelect: (id: string) => void
  }

  let {
    config,
    snapshot,
    catalog,
    sceneMode = 'desktop',
    selectedParticipantId,
    onSelect,
  }: Props = $props()

  const participants = $derived(snapshot?.config.participants ?? config.participants)
  const layouts = $derived(getSeatLayout(participants.length, sceneMode))
  const round = $derived(currentRound(snapshot))
  const counts = $derived(readyCount(round))
  const questionExcerpt = $derived(
    (snapshot?.config.question ?? config.question).trim().slice(0, 72) +
      ((snapshot?.config.question ?? config.question).trim().length > 72 ? '…' : ''),
  )
  const roundLabel = $derived(
    round
      ? `Round ${round.number} · ${round.kind === 'independent' ? 'Independent opinions' : 'Reconsideration'}`
      : 'Setup · No active round',
  )
  const progressLabel = $derived(
    round ? `${counts.ready}/${counts.total} ready` : `${participants.length} seated`,
  )
  const meetingState = $derived.by(() => {
    if (!snapshot) return 'idle' as const
    if (snapshot.status === 'completed') return 'completed' as const
    if (snapshot.status === 'round_blocked') return 'blocked' as const
    if (snapshot.status === 'round_active' || snapshot.status === 'between_rounds') return 'active' as const
    return 'idle' as const
  })

  function iconKey(providerId: string): string {
    return catalog?.providers.find((p) => p.id === providerId)?.iconKey ?? 'neutral'
  }
  function providerName(participantId: string, providerId: string): string {
    return (
      snapshot?.participantLabels.find((l) => l.participantId === participantId)?.providerName ??
      catalog?.providers.find((p) => p.id === providerId)?.name ??
      providerId
    )
  }
  function modelName(participantId: string, modelId: string): string {
    return (
      snapshot?.participantLabels.find((l) => l.participantId === participantId)?.modelName ??
      catalog?.models.find((m) => m.id === modelId)?.name ??
      modelId
    )
  }
  function seatNumber(name: string, id: string): number | null {
    const dup = participants.filter((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase()).length > 1
    return dup ? participants.findIndex((p) => p.id === id) + 1 : null
  }
</script>

<div class="room" role="group" aria-label="Office roundtable scene">
  <OfficeBackdrop
    {meetingState}
    {questionExcerpt}
    {roundLabel}
    {progressLabel}
    tableWidthFactor={tableWidthFactor(participants.length)}
  />
  {#each layouts as layout (participants[layout.participantIndex]?.id)}
    {@const p = participants[layout.participantIndex]!}
    {@const slot = round?.slots.find((s) => s.participantId === p.id) ?? null}
    <AgentSeat
      {layout}
      name={p.name}
      seatNumber={seatNumber(p.name, p.id)}
      roleLabel={p.roleLabel}
      providerName={providerName(p.id, p.providerId)}
      modelName={modelName(p.id, p.modelId)}
      iconKey={iconKey(p.providerId)}
      accent={p.accent}
      variant={p.avatarVariant}
      statusText={snapshot ? statusLabel(slot, snapshot.status) : 'Waiting'}
      statusKey={slot?.status ?? 'pending'}
      selected={selectedParticipantId === p.id}
      onSelect={() => onSelect(p.id)}
    />
  {/each}
</div>

<style>
  .room {
    position: relative;
    min-height: 420px;
    height: clamp(420px, 52vh, 560px);
    border: 1px solid var(--line);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-soft);
    overflow: hidden;
    background: var(--surface);
  }
  @media (max-width: 767px) {
    .room {
      min-height: 340px;
      height: 360px;
    }
  }
</style>
