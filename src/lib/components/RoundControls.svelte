<script lang="ts">
  import type { RunSnapshot } from '../domain/types'
  import { isTerminalStatus } from '../domain/reducer'

  interface Props {
    snapshot: RunSnapshot | null
    pending: boolean
    onStop: () => void
  }
  let { snapshot, pending, onStop }: Props = $props()
  const canStop = $derived(!!snapshot && !isTerminalStatus(snapshot.status))
</script>

{#if snapshot && canStop}
  <div class="controls">
    <button type="button" class="stop" disabled={pending} onclick={onStop}>
      {pending ? 'Stopping…' : 'Stop'}
    </button>
  </div>
{/if}

<style>
  .controls {
    display: flex;
    justify-content: flex-end;
  }
  .stop {
    min-height: 44px;
    min-width: 96px;
    border-radius: var(--radius-control);
    border: 1px solid color-mix(in srgb, var(--danger) 35%, var(--line));
    background: #fff5f3;
    color: var(--danger);
    font-weight: 650;
    cursor: pointer;
  }
  .stop:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
