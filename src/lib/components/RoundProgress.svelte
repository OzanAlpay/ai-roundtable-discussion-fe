<script lang="ts">
  import type { RunSnapshot } from '../domain/types'
  import { currentRound, readyCount } from '../domain/selectors'

  interface Props {
    snapshot: RunSnapshot | null
    elapsedLabel: string
  }
  let { snapshot, elapsedLabel }: Props = $props()
  const round = $derived(currentRound(snapshot))
  const counts = $derived(readyCount(round))
</script>

{#if snapshot}
  <div class="progress">
    <div>
      <strong>
        {#if round}
          Round {round.number}
          {#if round.kind === 'independent'}· Independent opinions{:else}· Reconsideration{/if}
        {:else}
          {snapshot.status}
        {/if}
      </strong>
      <span class="muted">{counts.ready} of {counts.total} responses ready</span>
    </div>
    <div class="right">
      <span class="pill" data-status={snapshot.status}>{snapshot.status.replace('_', ' ')}</span>
      <span class="muted">{elapsedLabel}</span>
    </div>
  </div>
{/if}

<style>
  .progress {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
    padding: 0.65rem 0.85rem;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 12px;
  }
  .progress > div {
    display: grid;
    gap: 0.15rem;
  }
  .right {
    display: flex;
    gap: 0.65rem;
    align-items: center;
  }
  .muted {
    color: var(--muted);
    font-size: 0.9rem;
  }
  .pill {
    text-transform: capitalize;
    font-size: 0.78rem;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--sage);
  }
  .pill[data-status='round_blocked'] {
    background: var(--peach);
    color: var(--danger);
  }
  .pill[data-status='completed'] {
    background: var(--sky);
  }
</style>
