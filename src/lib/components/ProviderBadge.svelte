<script lang="ts">
  interface Props {
    iconKey: string
    name: string
    modelName?: string
  }
  let { iconKey, name, modelName }: Props = $props()

  const letter = $derived(name.trim().charAt(0).toUpperCase() || '?')
</script>

<span class="badge" title={modelName ? `${name} · ${modelName}` : name}>
  <span class="mark" data-icon={iconKey} aria-hidden="true">{letter}</span>
  <span class="text">
    <span class="provider">{name}</span>
    {#if modelName}
      <span class="sep">·</span>
      <span class="model">{modelName}</span>
    {/if}
  </span>
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    max-width: 100%;
    min-height: 28px;
    padding: 0.15rem 0.45rem 0.15rem 0.15rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface) 80%, var(--sage));
    border: 1px solid var(--line);
    font-size: 0.75rem;
    color: var(--ink);
  }
  .mark {
    width: 1.35rem;
    height: 1.35rem;
    border-radius: 999px;
    display: grid;
    place-items: center;
    font-weight: 700;
    background: var(--accent);
    color: var(--accent-ink);
    flex: 0 0 auto;
  }
  .mark[data-icon='anthropic'] {
    background: #5b4b7a;
  }
  .mark[data-icon='openai'] {
    background: #2f6f7e;
  }
  .text {
    display: inline-flex;
    gap: 0.25rem;
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
