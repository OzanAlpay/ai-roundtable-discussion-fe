<script lang="ts">
  import type { Catalog } from '../domain/types'

  interface Props {
    catalog: Catalog
    providerId: string
    modelId: string
    disabled?: boolean
    onProvider: (providerId: string) => void
    onModel: (modelId: string) => void
  }

  let { catalog, providerId, modelId, disabled = false, onProvider, onModel }: Props = $props()

  const models = $derived(
    catalog.models.filter((m) => m.providerId === providerId),
  )
</script>

<div class="row">
  <label>
    <span>Provider</span>
    <select {disabled} value={providerId} onchange={(e) => onProvider(e.currentTarget.value)}>
      {#each catalog.providers as provider}
        <option value={provider.id}>{provider.name}</option>
      {/each}
    </select>
  </label>
  <label>
    <span>Model</span>
    <select {disabled} value={modelId} onchange={(e) => onModel(e.currentTarget.value)}>
      {#each models as model}
        <option value={model.id} disabled={model.availability !== 'available'}>
          {model.name}{model.isDemo ? ' (demo)' : ''}
          {model.availability !== 'available' ? ' — unavailable' : ''}
        </option>
      {/each}
    </select>
  </label>
</div>

<style>
  .row {
    display: grid;
    gap: 0.5rem;
    grid-template-columns: 1fr 1fr;
  }
  label {
    display: grid;
    gap: 0.25rem;
    font-size: 0.85rem;
  }
  span {
    color: var(--muted);
  }
  select {
    min-height: 44px;
    border-radius: var(--radius-control);
    border: 1px solid var(--line);
    background: var(--surface);
    padding: 0.4rem 0.55rem;
  }
</style>
