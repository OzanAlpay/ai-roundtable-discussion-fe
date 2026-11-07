<script lang="ts">
  import type { ConnectionState, PublicError } from '../domain/types'

  interface Props {
    connection: ConnectionState
    error: PublicError | null
    onRetry: () => void
  }
  let { connection, error, onRetry }: Props = $props()
  const show = $derived(
    connection === 'reconnecting' ||
      connection === 'offline' ||
      connection === 'connecting' ||
      !!error,
  )
</script>

{#if show}
  <div class="banner" role="status">
    {#if error}
      <span>{error.message}</span>
    {:else if connection === 'reconnecting'}
      <span>Reconnecting… Meeting status may be briefly out of date.</span>
    {:else if connection === 'offline'}
      <span>Connection lost; meeting status may be out of date.</span>
    {:else}
      <span>Connecting to meeting updates…</span>
    {/if}
    {#if connection === 'offline' || error?.retryable}
      <button type="button" onclick={onRetry}>Retry connection</button>
    {/if}
  </div>
{/if}

<style>
  .banner {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
    justify-content: space-between;
    padding: 0.65rem 0.85rem;
    border-radius: 12px;
    border: 1px solid var(--line);
    background: var(--peach);
  }
  button {
    min-height: 44px;
    border-radius: var(--radius-control);
    border: 1px solid var(--line);
    background: var(--surface);
    padding: 0 0.8rem;
    cursor: pointer;
  }
</style>
