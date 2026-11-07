<script lang="ts">
  import { onMount } from 'svelte'
  import { createRoundtableApi } from './lib/api/createRoundtableApi'
  import AppHeader from './lib/components/AppHeader.svelte'
  import ConnectionBanner from './lib/components/ConnectionBanner.svelte'
  import ExportMenu from './lib/components/ExportMenu.svelte'
  import ParticipantDetails from './lib/components/ParticipantDetails.svelte'
  import RoundControls from './lib/components/RoundControls.svelte'
  import RoundProgress from './lib/components/RoundProgress.svelte'
  import RoundtableRoom from './lib/components/RoundtableRoom.svelte'
  import SetupPanel from './lib/components/SetupPanel.svelte'
  import TranscriptTabs from './lib/components/TranscriptTabs.svelte'
  import { isTerminalStatus } from './lib/domain/reducer'
  import { RoundtableController } from './lib/state/roundtable.svelte'

  const created = createRoundtableApi()
  const controller = new RoundtableController(created.api, created.mode, created.mock)

  let now = $state(Date.now())
  let timer: ReturnType<typeof setInterval> | null = null

  onMount(() => {
    void controller.init()
    timer = setInterval(() => {
      now = Date.now()
    }, 1000)
    return () => {
      if (timer) clearInterval(timer)
      controller.dispose()
    }
  })

  const setupLocked = $derived(
    controller.viewPhase === 'viewing' &&
      !!controller.snapshot &&
      !isTerminalStatus(controller.snapshot.status),
  )

  const elapsedLabel = $derived.by(() => {
    const snap = controller.snapshot
    if (!snap) return ''
    const start = Date.parse(snap.createdAt)
    const end = snap.endedAt ? Date.parse(snap.endedAt) : now
    const seconds = Math.max(0, Math.floor((end - start) / 1000))
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${String(s).padStart(2, '0')} elapsed`
  })
</script>

<a class="skip" href="#main">Skip to main content</a>

<div class="app">
  <AppHeader
    mode={controller.mode}
    canNewMeeting={controller.viewPhase === 'setup' || (!!controller.snapshot && isTerminalStatus(controller.snapshot.status))}
    needsCancelConfirm={!!controller.snapshot && !isTerminalStatus(controller.snapshot.status)}
    onNewMeeting={(force) => void controller.newMeeting(force)}
  />

  <ConnectionBanner
    connection={controller.connection}
    error={controller.client.protocolError}
    onRetry={() => void controller.retryConnection()}
  />

  {#if controller.reloadNotice && controller.viewPhase === 'setup'}
    <p class="notice">{controller.reloadNotice}</p>
  {/if}

  <div class="layout" id="main">
    <div class="main-col">
      <RoundtableRoom
        config={controller.draft}
        snapshot={controller.snapshot}
        catalog={controller.catalog}
        selectedParticipantId={controller.selectedParticipantId}
        onSelect={(id) => controller.selectParticipant(id)}
      />
      <RoundProgress snapshot={controller.snapshot} {elapsedLabel} />
      <div class="toolbar">
        <RoundControls
          snapshot={controller.snapshot}
          pending={controller.pendingCommand === 'cancel'}
          onStop={() => void controller.sendCommand({ type: 'cancel' })}
        />
        <ExportMenu snapshot={controller.snapshot} />
      </div>
      <TranscriptTabs
        snapshot={controller.snapshot}
        selectedTab={controller.selectedTab}
        onTab={(tab) => controller.setTab(tab)}
      />
    </div>

    <div class="side-col">
      {#if controller.catalog}
        <SetupPanel
          catalog={controller.catalog}
          draft={controller.draft}
          scenarios={controller.scenarios}
          scenarioId={controller.demoScenarioId}
          issues={controller.fieldErrors}
          disabled={setupLocked}
          submitting={controller.viewPhase === 'submitting'}
          createError={controller.createError}
          draftMessage={controller.draftMessage}
          mode={controller.mode}
          onDraft={(m) => controller.updateDraft(m)}
          onScenario={(id) => controller.setScenario(id)}
          onAdd={() => controller.addParticipant()}
          onRemove={(id) => controller.removeParticipant(id)}
          onStart={() => void controller.start()}
          onClearDraft={() => controller.clearSavedDraft()}
        />
      {:else if controller.createError}
        <p class="error" role="alert">{controller.createError}</p>
      {:else}
        <p>Loading catalog…</p>
      {/if}
    </div>
  </div>
</div>

{#if controller.snapshot && controller.selectedParticipantId}
  <ParticipantDetails
    snapshot={controller.snapshot}
    participantId={controller.selectedParticipantId}
    pending={!!controller.pendingCommand}
    onClose={() => controller.selectParticipant(null)}
    onRetry={() =>
      void controller.sendCommand({
        type: 'retry',
        roundNumber: controller.snapshot!.currentRoundNumber ?? 1,
        participantId: controller.selectedParticipantId!,
      })}
    onExclude={() =>
      void controller.sendCommand({
        type: 'exclude',
        roundNumber: controller.snapshot!.currentRoundNumber ?? 1,
        participantId: controller.selectedParticipantId!,
      })}
  />
{/if}

<div class="sr-only" aria-live="polite">{controller.liveAnnouncement}</div>

<style>
  .skip {
    position: absolute;
    left: -999px;
    top: 0;
    background: var(--surface);
    padding: 0.5rem 0.75rem;
    z-index: 50;
  }
  .skip:focus {
    left: 0.5rem;
    top: 0.5rem;
  }
  .app {
    max-width: 1400px;
    margin: 0 auto;
    padding: 1rem;
    display: grid;
    gap: 0.85rem;
  }
  .layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(320px, 360px);
    gap: 1rem;
    align-items: start;
  }
  .main-col,
  .side-col {
    display: grid;
    gap: 0.85rem;
  }
  .toolbar {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
    align-items: center;
  }
  .notice {
    margin: 0;
    padding: 0.65rem 0.85rem;
    border-radius: 12px;
    background: var(--sky);
    border: 1px solid var(--line);
    color: var(--muted);
  }
  .error {
    color: var(--danger);
  }
  @media (max-width: 1023px) {
    .layout {
      grid-template-columns: 1fr;
    }
  }
</style>
