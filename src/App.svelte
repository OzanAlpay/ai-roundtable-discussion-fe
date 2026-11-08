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

  const showSetup = $derived(controller.viewPhase !== 'viewing')

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
    canNewMeeting={controller.viewPhase === 'setup' ||
      (!!controller.snapshot && isTerminalStatus(controller.snapshot.status))}
    needsCancelConfirm={!!controller.snapshot && !isTerminalStatus(controller.snapshot.status)}
    onNewMeeting={(force) => void controller.newMeeting(force)}
  />

  <ConnectionBanner
    connection={controller.connection}
    error={controller.client.protocolError}
    onRetry={() => void controller.retryConnection()}
  />

  <section class="intro">
    <div>
      <span class="eyebrow">YOUR COLLABORATIVE THINKING SPACE</span>
      <h1>
        {showSetup
          ? 'One question. A room full of possibilities.'
          : 'Good ideas evolve in good company.'}
      </h1>
      <p>
        {showSetup
          ? 'Assemble your AI crew and explore the ideas between their answers.'
          : 'Follow each perspective, the shared discussion, and what changed.'}
      </p>
    </div>
    <span class="intro-mark" aria-hidden="true">✳</span>
  </section>

  <main class="layout" id="main">
    <RoundtableRoom
      config={controller.draft}
      snapshot={controller.snapshot}
      catalog={controller.catalog}
      selectedParticipantId={controller.selectedParticipantId}
      onSelect={(id) => {
        controller.selectParticipant(id)
        if (showSetup)
          requestAnimationFrame(() =>
            document
              .getElementById(`editor-${id}`)
              ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
          )
      }}
    />

    {#if showSetup}
      <div class="setup-slot">
        {#if controller.catalog}
          <SetupPanel
            catalog={controller.catalog}
            draft={controller.draft}
            scenarios={controller.scenarios}
            scenarioId={controller.demoScenarioId}
            issues={controller.fieldErrors}
            disabled={controller.viewPhase === 'submitting'}
            selectedParticipantId={controller.selectedParticipantId}
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
          <button onclick={() => void controller.init()}>Retry catalog</button>
        {:else}
          <p>Loading catalog…</p>
        {/if}
      </div>
    {:else}
      <section class="run-slot" aria-label="Meeting run">
        {#if controller.snapshot?.status === 'round_blocked'}<section
            class="blocked"
            aria-label="Meeting needs attention"
          >
            <div>
              <strong>The crew is waiting for a response.</strong>
              <p>
                Retry the failed agent, or exclude them if at least two participants can continue.
              </p>
            </div>
            {#each controller.snapshot.rounds
              .find((r) => r.number === controller.snapshot?.currentRoundNumber)
              ?.slots.filter((s) => s.status === 'failed') ?? [] as slot}<button
                onclick={() => controller.selectParticipant(slot.participantId)}
                >Review {controller.snapshot.config.participants.find(
                  (p) => p.id === slot.participantId,
                )?.name}</button
              >{/each}
          </section>{/if}
        <RoundProgress snapshot={controller.snapshot} {elapsedLabel} />
        <div class="toolbar">
          <RoundControls
            snapshot={controller.snapshot}
            pending={controller.pendingCommand === 'cancel'}
            onStop={() => void controller.sendCommand({ type: 'cancel' })}
          />
          <ExportMenu snapshot={controller.snapshot} mode={controller.mode} />
        </div>
        <TranscriptTabs
          snapshot={controller.snapshot}
          mode={controller.mode}
          selectedTab={controller.selectedTab}
          onTab={(tab) => controller.setTab(tab)}
        />
      </section>
    {/if}
  </main>
  <footer class="app-footer">
    <span>Many perspectives. No forced consensus.</span><span
      >{controller.mode === 'mock'
        ? 'Local demo · No live model calls'
        : 'Connected API · Status from your service'}</span
    >
  </footer>
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
    max-width: 1140px;
    margin: 0 auto;
    padding: 0 28px 24px;
    display: grid;
    gap: 22px;
  }
  .layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
    align-items: start;
  }
  .setup-slot,
  .run-slot {
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
  .error {
    color: var(--danger);
  }
  .intro {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 9px 0 3px;
    gap: 16px;
  }
  .eyebrow {
    font: 9px monospace;
    letter-spacing: 1.8px;
    color: var(--muted);
  }
  h1 {
    font-size: clamp(23px, 2.6vw, 31px);
    font-weight: 650;
    letter-spacing: -1px;
    line-height: 1.2;
    margin: 9px 0;
  }
  .intro p {
    font-size: 12px;
    color: var(--muted);
    margin: 0;
  }
  .intro-mark {
    font-size: 54px;
    color: #bfb2e6;
    line-height: 1;
  }
  .app-footer {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: var(--muted);
    gap: 12px;
    padding-top: 3px;
    flex-wrap: wrap;
  }
  @media (max-width: 767px) {
    .app {
      padding: 0 14px 20px;
      gap: 20px;
    }
    .intro-mark {
      display: none;
    }
    .intro {
      padding: 2px 0 0;
    }
    .eyebrow {
      font-size: 8px;
    }
    h1 {
      font-size: 26px;
    }
  }
  .blocked {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    background: var(--peach);
    padding: 18px;
    border: 1px solid #edd5c5;
    border-radius: 14px;
    font-size: 13px;
  }
  .blocked p {
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--muted);
  }
</style>
