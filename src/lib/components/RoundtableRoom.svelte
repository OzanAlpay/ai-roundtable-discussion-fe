<script lang="ts">
  import type { Catalog, DiscussionConfig, RunSnapshot } from '../domain/types'
  import Roundtable from './Roundtable.svelte'
  import ParticipantList from './ParticipantList.svelte'

  interface Props {
    config: DiscussionConfig
    snapshot: RunSnapshot | null
    catalog: Catalog | null
    selectedParticipantId: string | null
    onSelect: (id: string) => void
  }

  let { config, snapshot, catalog, selectedParticipantId, onSelect }: Props = $props()

  let compact = $state(false)
  $effect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const sync = () => {
      compact = mq.matches
    }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  })
</script>

<section class="room-wrap" aria-label="Office">
  <Roundtable
    {config}
    {snapshot}
    {catalog}
    sceneMode={compact ? 'compact' : 'desktop'}
    {selectedParticipantId}
    {onSelect}
  />
  <div class="list-wrap">
    <h2>Participants</h2>
    <ParticipantList {config} {snapshot} {catalog} {selectedParticipantId} {onSelect} />
  </div>
</section>

<style>
  .room-wrap {
    display: grid;
    gap: 0.85rem;
  }
  .list-wrap {
    display: none;
  }
  h2 {
    margin: 0 0 0.5rem;
    font-size: 1rem;
  }
  @media (max-width: 767px) {
    .list-wrap {
      display: block;
    }
  }
</style>
