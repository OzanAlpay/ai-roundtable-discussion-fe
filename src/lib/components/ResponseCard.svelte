<script lang="ts">
  import type { Opinion, RunSnapshot } from '../domain/types'

  interface Props {
    opinion: Opinion
    snapshot: RunSnapshot
    conceal?: boolean
  }
  let { opinion, snapshot, conceal = false }: Props = $props()
  const participant = $derived(
    snapshot.config.participants.find((p) => p.id === opinion.participantId),
  )
  const label = $derived(
    snapshot.participantLabels.find((l) => l.participantId === opinion.participantId),
  )
</script>

<article class="card">
  <header>
    <h3>{participant?.name ?? opinion.participantId}</h3>
    <p>
      {participant?.roleLabel ?? 'Participant'} · {label?.providerName ?? ''} · {label?.modelName ?? ''}
    </p>
  </header>
  {#if conceal}
    <p class="conceal">Response ready — waiting for remaining participants before publication.</p>
  {:else}
    <p class="position"><strong>Position:</strong> {opinion.position}</p>
    <p>{opinion.rationale}</p>
    {#if opinion.supportingPoints.length}
      <h4>Supporting points</h4>
      <ul>
        {#each opinion.supportingPoints as point}
          <li>{point}</li>
        {/each}
      </ul>
    {/if}
    {#if opinion.concerns.length}
      <h4>Concerns</h4>
      <ul>
        {#each opinion.concerns as point}
          <li>{point}</li>
        {/each}
      </ul>
    {/if}
    {#if opinion.openQuestions.length}
      <h4>Open questions</h4>
      <ul>
        {#each opinion.openQuestions as point}
          <li>{point}</li>
        {/each}
      </ul>
    {/if}
    <footer>
      <span>Confidence: {opinion.confidence}</span>
      <span>Revision: {opinion.revision.kind}</span>
      {#if opinion.elapsedMs != null}
        <span>{Math.round(opinion.elapsedMs / 100) / 10}s</span>
      {/if}
    </footer>
    {#if opinion.revision.reason}
      <p class="reason"><strong>Revision reason:</strong> {opinion.revision.reason}</p>
    {/if}
    {#if opinion.revision.influencedBy.length}
      <p class="refs">
        Influenced by:
        {#each opinion.revision.influencedBy as ref}
          <span class="ref">R{ref.roundNumber}/{ref.participantId.slice(0, 8)}…</span>
        {/each}
      </p>
    {/if}
  {/if}
</article>

<style>
  .card {
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 0.85rem 1rem;
    background: var(--surface);
    display: grid;
    gap: 0.45rem;
  }
  header h3 {
    margin: 0;
    font-size: 1rem;
  }
  header p,
  footer,
  .reason,
  .refs,
  .conceal {
    margin: 0;
    color: var(--muted);
    font-size: 0.9rem;
  }
  h4 {
    margin: 0.25rem 0 0;
    font-size: 0.9rem;
  }
  ul {
    margin: 0;
    padding-left: 1.1rem;
  }
  footer {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }
  .position {
    margin: 0;
  }
  .ref {
    display: inline-block;
    margin-right: 0.35rem;
    padding: 0.1rem 0.35rem;
    border-radius: 6px;
    background: var(--sage);
    font-size: 0.8rem;
  }
  .conceal {
    font-style: italic;
  }
</style>
