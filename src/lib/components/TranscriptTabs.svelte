<script lang="ts">
  import { tick } from 'svelte'
  import type { RunSnapshot } from '../domain/types'
  import { unpublishedPartials } from '../domain/selectors'
  import ResponseCard from './ResponseCard.svelte'
  import ComparisonView from './ComparisonView.svelte'
  import ActivityLog from './ActivityLog.svelte'

  interface Props {
    mode?: 'mock' | 'http'
    snapshot: RunSnapshot | null
    selectedTab: string
    onTab: (tab: string) => void
  }
  let { snapshot, selectedTab, onTab, mode = 'mock' }: Props = $props()

  const tabs = $derived.by(() => {
    const list = [{ id: 'overview', label: 'Overview' }]
    const total = snapshot?.config.totalRounds ?? 2
    for (let i = 1; i <= total; i++) list.push({ id: `round-${i}`, label: `Round ${i}` })
    list.push({ id: 'comparison', label: 'Comparison' })
    list.push({ id: 'activity', label: 'Activity' })
    return list
  })

  const partials = $derived(unpublishedPartials(snapshot))
</script>

<section class="transcript">
  <div class="tablist" role="tablist" aria-label="Transcript sections">
    {#each tabs as tab}
      <button
        type="button"
        role="tab"
        id={`tab-${tab.id}`}
        aria-selected={selectedTab === tab.id}
        aria-controls={`panel-${tab.id}`}
        tabindex={selectedTab === tab.id ? 0 : -1}
        onclick={() => onTab(tab.id)}
        onkeydown={async (e) => {
          const idx = tabs.findIndex((t) => t.id === selectedTab)
          if (e.key === 'ArrowRight') {
            e.preventDefault()
            onTab(tabs[(idx + 1) % tabs.length]!.id)
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            onTab(tabs[(idx - 1 + tabs.length) % tabs.length]!.id)
          } else if (e.key === 'Home') {
            e.preventDefault()
            onTab(tabs[0]!.id)
          } else if (e.key === 'End') {
            e.preventDefault()
            onTab(tabs.at(-1)!.id)
          }
          if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) {
            await tick()
            document.getElementById(`tab-${selectedTab}`)?.focus()
          }
        }}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  {#if !snapshot}
    <div class="panel" role="tabpanel">
      <p>Start a meeting to see transcripts and comparison.</p>
    </div>
  {:else if selectedTab === 'overview'}
    <div class="panel" role="tabpanel" id="panel-overview" aria-labelledby="tab-overview">
      <p>
        {snapshot.config.participants.length} participants · {snapshot.config.totalRounds} rounds · status
        <strong>{snapshot.status.replaceAll('_', ' ')}</strong>
      </p>
      {#if mode === 'mock'}<p class="muted">
          Demo content only — responses are simulated fixtures.
        </p>{/if}
      <h2 class="topic">{snapshot.config.question}</h2>
      <div class="stages">
        {#each Array.from({ length: snapshot.config.totalRounds }, (_, i) => i + 1) as n}<button
            onclick={() => onTab(`round-${n}`)}
            ><span class="step">0{n}</span><strong
              >{n === 1 ? 'Think independently' : 'Reconsider together'}</strong
            ><small
              >{snapshot.rounds.find((r) => r.number === n)?.published
                ? 'Published · View responses'
                : snapshot.currentRoundNumber === n
                  ? 'In progress · Answers stay private'
                  : 'Up next'}</small
            ></button
          >{/each}
      </div>
      {#if snapshot.status === 'completed'}<button
          class="compare-link"
          onclick={() => onTab('comparison')}>See what changed →</button
        >{/if}
      {#if partials.length}
        <div class="partial">
          <h3>Unpublished partial results</h3>
          {#each partials as opinion}
            <ResponseCard {opinion} {snapshot} />
          {/each}
        </div>
      {/if}
    </div>
  {:else if selectedTab.startsWith('round-')}
    {@const n = Number(selectedTab.split('-')[1])}
    {@const round = snapshot.rounds.find((r) => r.number === n)}
    <div class="panel" role="tabpanel" id={`panel-round-${n}`} aria-labelledby={`tab-round-${n}`}>
      {#if !round}
        <p>Not started</p>
      {:else if !round.published}
        <p>Round {n} is {round.status}. Published responses appear after the barrier.</p>
        {#each round.slots.filter((s) => s.status === 'submitted' && s.response) as slot}
          <ResponseCard opinion={slot.response!} {snapshot} conceal />
        {/each}
      {:else}
        {#each round.published.responses as opinion}
          <ResponseCard {opinion} {snapshot} />
        {/each}
      {/if}
    </div>
  {:else if selectedTab === 'comparison'}
    <div class="panel" role="tabpanel" id="panel-comparison" aria-labelledby="tab-comparison">
      <ComparisonView {snapshot} />
    </div>
  {:else}
    <div class="panel" role="tabpanel" id="panel-activity" aria-labelledby="tab-activity">
      <ActivityLog {snapshot} />
    </div>
  {/if}
</section>

<style>
  .transcript {
    display: grid;
    gap: 0.75rem;
    padding: 1rem;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius-card);
  }
  .tablist {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }
  .tablist button {
    min-height: 44px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: #fff;
    padding: 0 0.9rem;
    cursor: pointer;
  }
  .tablist button[aria-selected='true'] {
    background: var(--accent);
    color: var(--accent-ink);
    border-color: var(--accent);
  }
  .panel {
    display: grid;
    gap: 0.75rem;
  }
  .muted {
    color: var(--muted);
  }
  .partial {
    display: grid;
    gap: 0.65rem;
    padding: 0.75rem;
    border: 1px dashed var(--warning);
    border-radius: 12px;
  }
  h3 {
    margin: 0;
  }
  .topic {
    font-size: 20px;
    margin: 0;
    letter-spacing: -0.5px;
  }
  .stages {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
  }
  .stages button {
    display: grid;
    text-align: left;
    padding: 18px;
    background: #f8f9fc;
    gap: 8px;
  }
  .step {
    font: 12px monospace;
    color: var(--accent);
  }
  .stages strong {
    font-size: 13px;
  }
  .stages small {
    color: var(--muted);
    font-size: 11px;
  }
  .compare-link {
    justify-self: start;
    color: var(--accent);
    font-size: 12px;
  }
</style>
