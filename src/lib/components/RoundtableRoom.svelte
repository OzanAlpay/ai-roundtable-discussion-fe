<script lang="ts">
  import type { Catalog, DiscussionConfig, RunSnapshot } from '../domain/types'
  import Roundtable from './Roundtable.svelte'

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

<div class="room-wrap">
  <Roundtable
    {config}
    {snapshot}
    {catalog}
    sceneMode={compact ? 'compact' : 'desktop'}
    {selectedParticipantId}
    {onSelect}
  />
</div>
