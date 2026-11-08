<script lang="ts">
  import type { DemoScenario } from '../domain/types'
  import type { DemoScenarioId } from '../domain/types'

  interface Props {
    scenarios: DemoScenario[]
    value: DemoScenarioId
    disabled?: boolean
    onChange: (id: DemoScenarioId) => void
  }
  let { scenarios, value, disabled = false, onChange }: Props = $props()
</script>

<section class="scenarios" aria-label="Demo scenarios">
  <h2>Demo scenarios</h2>
  <p>Mock-only pacing and failure scripts. Not part of discussion configuration.</p>
  <label>
    <span class="sr-only">Scenario</span>
    <select {disabled} {value} onchange={(e) => onChange(e.currentTarget.value as DemoScenarioId)}>
      {#each scenarios as scenario}
        <option value={scenario.id}>{scenario.label}</option>
      {/each}
    </select>
  </label>
  {#each scenarios as scenario}
    {#if scenario.id === value}
      <p class="desc">{scenario.description}</p>
    {/if}
  {/each}
</section>

<style>
  .scenarios {
    display: grid;
    gap: 0.35rem;
    padding: 0.75rem;
    border: 1px dashed color-mix(in srgb, var(--accent) 40%, var(--line));
    border-radius: 12px;
    background: color-mix(in srgb, var(--sky) 45%, var(--surface));
  }
  h2 {
    margin: 0;
    font-size: 0.95rem;
  }
  p {
    margin: 0;
    color: var(--muted);
    font-size: 0.85rem;
  }
  select {
    width: 100%;
    min-height: 44px;
    border-radius: var(--radius-control);
    border: 1px solid var(--line);
    background: var(--surface);
    padding: 0.4rem 0.55rem;
  }
  .desc {
    color: var(--ink);
  }
</style>
