<script lang="ts">
  import type { Catalog, DiscussionConfig, RunSnapshot } from '../domain/types'
  import { currentRound, statusLabel } from '../domain/selectors'
  import ProviderBadge from './ProviderBadge.svelte'

  interface Props {
    config: DiscussionConfig
    snapshot: RunSnapshot | null
    catalog: Catalog | null
    selectedParticipantId: string | null
    onSelect: (id: string) => void
  }

  let { config, snapshot, catalog, selectedParticipantId, onSelect }: Props = $props()
  const participants = $derived(snapshot?.config.participants ?? config.participants)
  const round = $derived(currentRound(snapshot))
</script>

<ul class="list" aria-label="Participants">
  {#each participants as p (p.id)}
    {@const slot = round?.slots.find((s) => s.participantId === p.id) ?? null}
    {@const label = snapshot?.participantLabels.find((l) => l.participantId === p.id)}
    {@const providerName = label?.providerName ?? catalog?.providers.find((x) => x.id === p.providerId)?.name ?? p.providerId}
    {@const modelName = label?.modelName ?? catalog?.models.find((x) => x.id === p.modelId)?.name ?? p.modelId}
    {@const iconKey = catalog?.providers.find((x) => x.id === p.providerId)?.iconKey ?? 'neutral'}
    <li>
      <button
        type="button"
        class:selected={selectedParticipantId === p.id}
        aria-pressed={selectedParticipantId === p.id}
        onclick={() => onSelect(p.id)}
      >
        <span class="name">{p.name}</span>
        <span class="role">{p.roleLabel}</span>
        <ProviderBadge {iconKey} name={providerName} {modelName} />
        <span class="status">{snapshot ? statusLabel(slot, snapshot.status) : 'Waiting'}</span>
      </button>
    </li>
  {/each}
</ul>

<style>
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.5rem;
  }
  button {
    width: 100%;
    text-align: left;
    display: grid;
    gap: 0.2rem;
    padding: 0.7rem 0.8rem;
    min-height: 44px;
    border-radius: 12px;
    border: 1px solid var(--line);
    background: var(--surface);
    cursor: pointer;
  }
  button.selected {
    border-color: var(--accent);
    box-shadow: var(--focus);
  }
  .name {
    font-weight: 650;
  }
  .role,
  .status {
    color: var(--muted);
    font-size: 0.85rem;
  }
</style>
