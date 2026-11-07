<script lang="ts">
  interface Props {
    iconKey: string
    name: string
    modelName?: string
    compact?: boolean
  }
  let { iconKey, name, modelName, compact = false }: Props = $props()

  const letter = $derived(name.trim().charAt(0).toUpperCase() || '?')
</script>

<span class="badge" class:compact title={modelName ? `${name} · ${modelName}` : name} data-icon={iconKey}>
  <span class="mark" aria-hidden="true">
    {#if iconKey === 'openai'}
      <svg viewBox="0 0 16 16" width="12" height="12"><circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="2" /><circle cx="8" cy="8" r="2" fill="currentColor" /></svg>
    {:else if iconKey === 'anthropic'}
      <svg viewBox="0 0 16 16" width="12" height="12"><path d="M8 2 L13 13 H3 Z" fill="currentColor" /></svg>
    {:else if iconKey === 'grok'}
      <svg viewBox="0 0 16 16" width="12" height="12"><path d="M3 8 L8 3 L13 8 L8 13 Z" fill="currentColor" /></svg>
    {:else if iconKey === 'google'}
      <svg viewBox="0 0 16 16" width="12" height="12"><circle cx="5" cy="6" r="2" fill="currentColor" /><circle cx="11" cy="6" r="2" fill="currentColor" opacity="0.7" /><circle cx="8" cy="11" r="2" fill="currentColor" opacity="0.85" /></svg>
    {:else if iconKey === 'copilot'}
      <svg viewBox="0 0 16 16" width="12" height="12"><rect x="3" y="4" width="10" height="8" rx="3" fill="currentColor" /></svg>
    {:else}
      {letter}
    {/if}
  </span>
  {#if !compact}
    <span class="text">
      <span class="provider">{name}</span>
      {#if modelName}
        <span class="sep">·</span>
        <span class="model">{modelName}</span>
      {/if}
    </span>
  {/if}
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    max-width: 100%;
    min-height: 26px;
    padding: 0.12rem 0.4rem 0.12rem 0.12rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface) 86%, var(--provider, var(--sage)));
    border: 1px solid color-mix(in srgb, var(--provider, var(--line)) 35%, var(--line));
    font-size: 0.72rem;
    color: var(--ink);
    font-weight: 600;
  }
  .badge.compact {
    padding: 0.1rem;
    min-height: 22px;
  }
  .mark {
    width: 1.3rem;
    height: 1.3rem;
    border-radius: 999px;
    display: grid;
    place-items: center;
    font-weight: 800;
    background: var(--provider, var(--accent));
    color: #fff;
    flex: 0 0 auto;
  }
  .badge[data-icon='openai'] {
    --provider: #2f9e9a;
  }
  .badge[data-icon='anthropic'] {
    --provider: #c47a5a;
  }
  .badge[data-icon='grok'] {
    --provider: #3d4450;
  }
  .badge[data-icon='google'] {
    --provider: #4f86e0;
  }
  .badge[data-icon='copilot'] {
    --provider: #5b8fd9;
  }
  .text {
    display: inline-flex;
    gap: 0.22rem;
    min-width: 0;
    overflow: hidden;
  }
  .provider,
  .model {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sep {
    color: var(--muted);
  }
</style>
