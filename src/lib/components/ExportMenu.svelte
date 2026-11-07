<script lang="ts">
  import type { RunSnapshot } from '../domain/types'
  import { exportJson } from '../export/json'
  import { downloadText, exportMarkdown } from '../export/markdown'

  interface Props {
    snapshot: RunSnapshot | null
  }
  let { snapshot }: Props = $props()

  function safeName(id: string): string {
    return id.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 40)
  }
</script>

{#if snapshot}
  <div class="export">
    <button
      type="button"
      onclick={() =>
        downloadText(
          `roundtable-${safeName(snapshot.id)}.md`,
          exportMarkdown(snapshot),
          'text/markdown;charset=utf-8',
        )}
    >
      Export Markdown
    </button>
    <button
      type="button"
      onclick={() =>
        downloadText(
          `roundtable-${safeName(snapshot.id)}.json`,
          exportJson(snapshot),
          'application/json;charset=utf-8',
        )}
    >
      Export JSON
    </button>
  </div>
{/if}

<style>
  .export {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  button {
    min-height: 44px;
    border-radius: var(--radius-control);
    border: 1px solid var(--line);
    background: var(--surface);
    padding: 0 0.85rem;
    cursor: pointer;
  }
</style>
