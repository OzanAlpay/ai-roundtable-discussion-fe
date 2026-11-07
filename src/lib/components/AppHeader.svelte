<script lang="ts">
  interface Props {
    mode: 'mock' | 'http'
    canNewMeeting: boolean
    needsCancelConfirm: boolean
    onNewMeeting: (forceCancel: boolean) => void
  }
  let { mode, canNewMeeting, needsCancelConfirm, onNewMeeting }: Props = $props()
  let confirmOpen = $state(false)
</script>

<header class="header">
  <div>
    <p class="brand">Copilot Roundtable</p>
    <p class="demo">DEMO · Simulated agents{mode === 'http' ? ' · HTTP transport' : ''}</p>
  </div>
  <div class="actions">
    {#if confirmOpen}
      <span class="confirm">Cancel the active meeting and start a new draft?</span>
      <button type="button" onclick={() => { confirmOpen = false; onNewMeeting(true) }}>Cancel & new</button>
      <button type="button" class="ghost" onclick={() => (confirmOpen = false)}>Stay</button>
    {:else}
      <button
        type="button"
        disabled={!canNewMeeting && !needsCancelConfirm}
        onclick={() => {
          if (needsCancelConfirm) confirmOpen = true
          else onNewMeeting(false)
        }}
      >
        New meeting
      </button>
    {/if}
  </div>
</header>

<style>
  .header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
    padding: 0.85rem 1rem;
    background: color-mix(in srgb, var(--surface) 88%, var(--sage));
    border: 1px solid var(--line);
    border-radius: var(--radius-card);
  }
  .brand {
    margin: 0;
    font-size: clamp(1.35rem, 2vw, 1.8rem);
    font-weight: 750;
    letter-spacing: -0.02em;
  }
  .demo {
    margin: 0.15rem 0 0;
    color: var(--accent);
    font-weight: 650;
    font-size: 0.9rem;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }
  button {
    min-height: 44px;
    border-radius: var(--radius-control);
    border: 1px solid var(--line);
    background: var(--surface);
    padding: 0 0.9rem;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .ghost {
    background: transparent;
  }
  .confirm {
    font-size: 0.9rem;
    color: var(--muted);
  }
</style>
