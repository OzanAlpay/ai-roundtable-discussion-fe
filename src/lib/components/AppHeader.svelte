<script lang="ts">
  interface Props {
    mode: 'mock' | 'http'
    canNewMeeting: boolean
    needsCancelConfirm: boolean
    onNewMeeting: (force: boolean) => void
  }
  let { mode, canNewMeeting, needsCancelConfirm, onNewMeeting }: Props = $props()
  let confirmOpen = $state(false)
</script>

<header class="header">
  <div class="brand">
    <span class="logo" aria-hidden="true"
      ><svg viewBox="0 0 32 32"
        ><ellipse
          cx="16"
          cy="18"
          rx="11"
          ry="6"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        /><circle cx="16" cy="7" r="3" fill="currentColor" /><circle
          cx="5"
          cy="14"
          r="2"
          fill="currentColor"
        /><circle cx="27" cy="14" r="2" fill="currentColor" /></svg
      ></span
    ><span>Copilot <strong>Roundtable</strong><small>A meeting of different minds</small></span>
  </div>
  <div class="actions">
    <span class="mode"
      ><i></i>{mode === 'mock' ? 'DEMO · Simulated agents' : 'Connected API mode'}</span
    >
    {#if confirmOpen}<span class="confirm">Stop this meeting and start fresh?</span><button
        onclick={() => {
          confirmOpen = false
          onNewMeeting(true)
        }}>Cancel & new</button
      ><button onclick={() => (confirmOpen = false)}>Stay</button>
    {:else}<button
        class="new"
        disabled={!canNewMeeting && !needsCancelConfirm}
        onclick={() => {
          if (needsCancelConfirm) confirmOpen = true
          else onNewMeeting(false)
        }}><span aria-hidden="true">＋</span> New meeting</button
      >{/if}
  </div>
</header>

<style>
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 22px 0 25px;
    border-bottom: 1px solid var(--line);
    flex-wrap: wrap;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 18px;
    letter-spacing: -0.5px;
  }
  .brand small {
    display: block;
    font-size: 11px;
    color: var(--muted);
    letter-spacing: 0.2px;
    margin-top: 2px;
  }
  .logo {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    color: white;
    background: var(--accent);
    border-radius: 13px;
    box-shadow: 0 5px 14px #6551ce24;
  }
  .logo svg {
    width: 30px;
    height: 30px;
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  .mode {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 11px;
    font-weight: 600;
    color: var(--muted);
  }
  i {
    height: 6px;
    width: 6px;
    border-radius: 50%;
    background: #32957a;
  }
  .new {
    font-size: 12px;
    font-weight: 600;
    box-shadow: 0 2px 3px #00000003;
  }
  .new span {
    font-size: 17px;
    margin-right: 5px;
  }
  .confirm {
    font-size: 12px;
  }
  @media (max-width: 600px) {
    .header {
      padding: 16px 0;
      gap: 12px;
    }
    .brand {
      font-size: 16px;
    }
    .actions {
      width: 100%;
      justify-content: space-between;
    }
    .mode {
      font-size: 10px;
    }
  }
</style>
