<script lang="ts">
  import type { RunSnapshot } from '../domain/types'
  import { exportJson } from '../export/json'
  import { downloadText, exportMarkdown } from '../export/markdown'

  interface Props {
    mode?: 'mock' | 'http'
    snapshot: RunSnapshot | null
  }
  let { snapshot, mode = 'mock' }: Props = $props()

  function safeName(id: string): string {
    return id.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 40)
  }
</script>

{#if snapshot}
  <div class="export">
    <button
      type="button"
      disabled={!snapshot || !['completed', 'cancelled', 'failed'].includes(snapshot.status)}
      title="Exports become available when the meeting completes or is stopped."
      onclick={() =>
        downloadText(
          `roundtable-${safeName(snapshot.id)}.md`,
          exportMarkdown(snapshot, mode),
          'text/markdown;charset=utf-8',
        )}
    >
      Export Markdown
    </button>
    <button
      type="button"
      disabled={!snapshot || !['completed', 'cancelled', 'failed'].includes(snapshot.status)}
      title="Exports become available when the meeting completes or is stopped."
      onclick={() =>
        downloadText(
          `roundtable-${safeName(snapshot.id)}.json`,
          exportJson(snapshot, mode),
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
