<script lang="ts">
  import type { RunSnapshot } from '../domain/types'
  import { activityEntries } from '../domain/selectors'

  interface Props {
    snapshot: RunSnapshot
  }
  let { snapshot }: Props = $props()
  const entries = $derived(activityEntries(snapshot))
</script>

<ol class="log">
  {#each entries as entry (entry.id)}
    <li>{entry.text}</li>
  {/each}
</ol>

<style>
  .log {
    margin: 0;
    padding-left: 1.2rem;
    display: grid;
    gap: 0.4rem;
  }
</style>
