<script lang="ts">
  import type { RunSnapshot } from '../domain/types'
  import { comparisonRows } from '../domain/selectors'

  interface Props {
    snapshot: RunSnapshot
  }
  let { snapshot }: Props = $props()
  const rows = $derived(comparisonRows(snapshot))
</script>

<div class="comparison">
  <p class="note">
    Changed/Unchanged labels come from explicit response metadata, not text similarity. No invented
    consensus.
  </p>
  <div class="table-wrap" aria-label="Comparison table">
    <table>
      <thead>
        <tr>
          <th scope="col">Participant</th>
          <th scope="col">Initial</th>
          <th scope="col">Latest</th>
          <th scope="col">Revision</th>
          <th scope="col">Reason / influence</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row}
          <tr>
            <th scope="row">
              {row.name}
              <div class="sub">{row.providerName} · {row.modelName}</div>
              {#if row.excluded}<div class="tag">Excluded</div>{/if}
            </th>
            <td>{row.initial?.position ?? 'Missing'}</td>
            <td>{row.latest?.position ?? 'Missing'}</td>
            <td>
              <span class="kind" data-kind={row.revisionKind}>{row.revisionKind}</span>
              {#if row.history.length > 1}
                <div class="history">
                  {#each row.history as h}
                    <span>R{h.roundNumber}: {h.position} ({h.kind})</span>
                  {/each}
                </div>
              {/if}
            </td>
            <td>
              {row.revisionReason ?? '—'}
              {#if row.influencedBy.length}
                <div class="sub">
                  refs: {row.influencedBy.map((r) => `R${r.roundNumber}`).join(', ')}
                </div>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .note {
    margin: 0;
    color: var(--muted);
    font-size: 0.9rem;
  }
  .table-wrap {
    overflow: auto;
    border: 1px solid var(--line);
    border-radius: 12px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 720px;
  }
  th,
  td {
    text-align: left;
    vertical-align: top;
    padding: 0.75rem;
    border-bottom: 1px solid var(--line);
  }
  thead th {
    background: color-mix(in srgb, var(--sage) 55%, white);
    font-size: 0.85rem;
  }
  .sub {
    color: var(--muted);
    font-size: 0.8rem;
    font-weight: 400;
  }
  .tag {
    display: inline-block;
    margin-top: 0.25rem;
    padding: 0.1rem 0.4rem;
    border-radius: 6px;
    background: var(--peach);
    color: var(--danger);
    font-size: 0.75rem;
  }
  .kind {
    text-transform: capitalize;
    font-weight: 650;
  }
  .kind[data-kind='changed'] {
    color: var(--accent);
  }
  .history {
    display: grid;
    gap: 0.15rem;
    margin-top: 0.35rem;
    font-size: 0.8rem;
    color: var(--muted);
  }
</style>
