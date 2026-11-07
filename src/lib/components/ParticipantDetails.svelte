<script lang="ts">
  import type { RunSnapshot } from '../domain/types'
  import { canExclude, canRetry, currentRound, slotFor } from '../domain/selectors'
  import ResponseCard from './ResponseCard.svelte'

  interface Props {
    snapshot: RunSnapshot
    participantId: string
    pending: boolean
    onRetry: () => void
    onExclude: () => void
    onClose: () => void
  }

  let { snapshot, participantId, pending, onRetry, onExclude, onClose }: Props = $props()

  const participant = $derived(snapshot.config.participants.find((p) => p.id === participantId))
  const label = $derived(snapshot.participantLabels.find((l) => l.participantId === participantId))
  const round = $derived(currentRound(snapshot))
  const slot = $derived(slotFor(round, participantId))
  const history = $derived(
    snapshot.rounds
      .flatMap((r) => r.published?.responses.filter((x) => x.participantId === participantId) ?? []),
  )
</script>

{#if participant}
  <div class="drawer" role="dialog" aria-modal="true" aria-label={`${participant.name} details`}>
    <header>
      <div>
        <h2>{participant.name}</h2>
        <p>{participant.roleLabel} · {label?.providerName} · {label?.modelName}</p>
      </div>
      <button type="button" onclick={onClose}>Close</button>
    </header>

    {#if slot}
      <section>
        <h3>Current attempt</h3>
        <p>Status: {slot.status}</p>
        <ol>
          {#each slot.attempts as attempt}
            <li>
              Attempt {attempt.number}: {attempt.status}
              {#if attempt.error}
                — {attempt.error.message}
              {/if}
            </li>
          {/each}
        </ol>
        <div class="actions">
          <button type="button" disabled={pending || !canRetry(snapshot, participantId)} onclick={onRetry}>
            Retry
          </button>
          <button
            type="button"
            disabled={pending || !canExclude(snapshot, participantId)}
            onclick={onExclude}
          >
            Exclude
          </button>
        </div>
      </section>
    {/if}

    <section>
      <h3>Published opinions</h3>
      {#if history.length === 0}
        <p>No published opinions yet.</p>
      {:else}
        {#each history as opinion}
          <ResponseCard {opinion} {snapshot} />
        {/each}
      {/if}
    </section>
  </div>
{/if}

<style>
  .drawer {
    position: fixed;
    right: 1rem;
    top: 1rem;
    bottom: 1rem;
    width: min(420px, calc(100vw - 2rem));
    overflow: auto;
    z-index: 40;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-soft);
    padding: 1rem;
    display: grid;
    gap: 1rem;
    align-content: start;
  }
  header {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
  }
  h2,
  h3,
  p {
    margin: 0;
  }
  header p {
    color: var(--muted);
    margin-top: 0.25rem;
  }
  button {
    min-height: 44px;
    border-radius: var(--radius-control);
    border: 1px solid var(--line);
    background: #fff;
    padding: 0 0.75rem;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  section {
    display: grid;
    gap: 0.5rem;
  }
</style>
