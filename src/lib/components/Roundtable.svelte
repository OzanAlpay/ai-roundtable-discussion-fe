<script lang="ts">
  import type { Catalog, DiscussionConfig, RunSnapshot } from '../domain/types'
  import { currentRound, readyCount, statusLabel } from '../domain/selectors'
  import { modelColorKey } from '../domain/modelColor'
  import { getSeatLayout, participantIndexForChair, type SceneMode } from '../scene/getSeatLayout'
  import AgentSeat from './AgentSeat.svelte'
  import OfficeBackdrop from './OfficeBackdrop.svelte'
  import ParticipantList from './ParticipantList.svelte'

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
  const layouts = $derived(getSeatLayout(sceneMode))
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
    round ? `${counts.ready}/${counts.total} ready` : `${participants.length} seated · 8 chairs`,
  )
  const meetingState = $derived.by(() => {
    if (!snapshot) return 'idle' as const
    if (snapshot.status === 'completed') return 'completed' as const
    if (snapshot.status === 'round_blocked') return 'blocked' as const
    if (snapshot.status === 'round_active' || snapshot.status === 'between_rounds')
      return 'active' as const
    return 'idle' as const
  })

  function iconKey(modelId: string): string {
    return modelColorKey(catalog?.models.find((m) => m.id === modelId))
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
    const dup =
      participants.filter((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase()).length >
      1
    return dup ? participants.findIndex((p) => p.id === id) + 1 : null
  }
</script>

<section class="room-shell" aria-label="Office">
  <header class="room-header">
    <div>
      <span class="room-icon" aria-hidden="true">◈</span><strong>The meeting room</strong><span
        class="room-id">ROOM 01</span
      >
    </div>
    <span class="occupancy"><i></i>{participants.length} agents · 8 seats</span>
  </header>
  <div
    class="room"
    role="group"
    aria-label="Office roundtable scene"
    aria-hidden={sceneMode === 'compact' ? true : undefined}
  >
    <OfficeBackdrop />
    <div class="table" aria-hidden="true">
      <div class="table-face">
        <span class="table-kicker"
          >{snapshot ? 'MEETING IN PROGRESS' : 'GREAT IDEAS START HERE'}</span
        ><span class="table-title"
          >{snapshot
            ? snapshot.status === 'completed'
              ? 'Perspectives, reconsidered.'
              : snapshot.status === 'round_blocked'
                ? 'Waiting for the whole crew.'
                : `Round ${round?.number ?? 1}`
            : 'Different minds.\nBetter decisions.'}</span
        ><span class="table-detail">{questionExcerpt}</span><span
          class="table-light"
          data-state={meetingState}
          ><i></i>{snapshot
            ? snapshot.status === 'completed'
              ? 'MEETING COMPLETE'
              : snapshot.status === 'cancelled'
                ? 'MEETING STOPPED'
                : progressLabel
            : 'READY WHEN YOU ARE'}</span
        >
      </div>
    </div>
    {#each layouts as layout (layout.chairIndex)}
      {@const pIndex = participantIndexForChair(layout.chairIndex, participants.length)}
      {#if pIndex < 0}<AgentSeat {layout} empty />{:else}
        {@const p = participants[pIndex]!}
        {@const slot = round?.slots.find((s) => s.participantId === p.id) ?? null}
        <AgentSeat
          {layout}
          name={p.name}
          seatNumber={seatNumber(p.name, p.id)}
          roleLabel={p.roleLabel}
          providerName={providerName(p.id, p.providerId)}
          modelName={modelName(p.id, p.modelId)}
          iconKey={iconKey(p.modelId)}
          accent={p.accent}
          variant={p.avatarVariant}
          statusText={snapshot?.excludedParticipantIds.includes(p.id)
            ? 'Excluded'
            : snapshot
              ? statusLabel(slot, snapshot.status)
              : 'Ready to join'}
          statusKey={snapshot?.excludedParticipantIds.includes(p.id)
            ? 'skipped'
            : (slot?.status ?? 'pending')}
          compactLabels={sceneMode === 'compact'}
          selected={selectedParticipantId === p.id}
          changed={!!round?.published?.responses.some(
            (r) => r.participantId === p.id && r.revision.kind === 'changed',
          )}
          onSelect={() => onSelect(p.id)}
        />
      {/if}
    {/each}
  </div>
  <footer class="room-footer">
    <span><i class="dot"></i>{snapshot ? roundLabel : 'Your crew is assembled'}</span><span
      >{snapshot ? progressLabel : 'Select an agent to customize their perspective'}
      <span aria-hidden="true">↗</span></span
    >
  </footer>
  <div class="mobile-list">
    <ParticipantList {config} {snapshot} {catalog} {selectedParticipantId} {onSelect} />
  </div>
</section>

<style>
  .room-shell {
    border: 1px solid var(--line);
    border-radius: 18px;
    background: var(--surface);
    overflow: hidden;
    box-shadow: 0 5px 24px #25334c07;
  }
  .room-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 22px;
    gap: 12px;
  }
  .room-header > div {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .room-header strong {
    font-size: 12px;
  }
  .room-icon {
    color: var(--accent);
    font-size: 21px;
  }
  .room-id {
    font: 9px monospace;
    letter-spacing: 1px;
    color: var(--muted);
    padding: 3px 7px;
    border-left: 1px solid var(--line);
  }
  .occupancy {
    font-size: 11px;
    color: var(--muted);
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .occupancy i,
  .dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #57a78e;
  }
  .room {
    position: relative;
    aspect-ratio: 1000/510;
    isolation: isolate;
    overflow: hidden;
    background: #293b53;
  }
  .table {
    position: absolute;
    left: 21%;
    top: 38%;
    width: 58%;
    height: 34%;
    border-radius: 50%;
    background: #344a63;
    border: 3px solid #1c2b41;
    box-shadow:
      0 13px 0 #18273e,
      0 16px 0 #536b83,
      0 35px 20px #12203866;
    z-index: 3;
  }
  .table-face {
    position: absolute;
    inset: -10px -3px 6px;
    border-radius: 50%;
    background: linear-gradient(160deg, #b1ddd6, #74b4b3);
    border: 4px solid #d1ede3;
    outline: 3px solid #25445a;
    box-shadow: inset 0 0 0 2px #639da2;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 5px;
    text-align: center;
    color: #1e4654;
  }
  .table-kicker {
    font: 8px monospace;
    letter-spacing: 2.5px;
    opacity: 0.8;
  }
  .table-title {
    font-size: clamp(15px, 2vw, 25px);
    font-weight: 750;
    line-height: 1.16;
    letter-spacing: -0.6px;
    white-space: pre-line;
  }
  .table-detail {
    font-size: 10px;
    opacity: 0.85;
    max-width: 75%;
    line-height: 1.4;
  }
  .table-light {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-top: 4px;
    font: 7px monospace;
    letter-spacing: 1px;
    background: #d4eee2;
    border: 1px solid #77b4ab;
    border-radius: 5px;
    padding: 4px 9px;
  }
  .table-light i {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #4c9874;
  }
  .table-light[data-state='blocked'] {
    background: #ffe2ba;
  }
  .room-footer {
    padding: 13px 22px;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 10px;
    color: var(--muted);
  }
  .room-footer > span:first-child {
    font-weight: 600;
    color: var(--ink);
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .mobile-list {
    display: none;
  }
  @media (max-width: 767px) {
    .room-header {
      padding: 12px;
    }
    .room-id {
      display: none;
    }
    .room-footer {
      padding: 12px;
      flex-wrap: wrap;
    }
    .room {
      aspect-ratio: 1000/580;
    }
    .table-kicker,
    .table-detail {
      display: none;
    }
    .table-title {
      font-size: 19px;
    }
    .table-light {
      font-size: 6px;
      padding: 3px 5px;
    }
    .mobile-list {
      display: block;
      padding: 12px;
      border-top: 1px solid var(--line);
    }
  }
  @media (max-width: 420px) {
    .table-title {
      font-size: 13px;
    }
    .table-light {
      letter-spacing: 0;
      font-size: 5px;
    }
    .room-header strong {
      font-size: 11px;
    }
    .occupancy {
      font-size: 10px;
    }
  }
</style>
