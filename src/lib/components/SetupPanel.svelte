<script lang="ts">
  import type { Catalog, DiscussionConfig, DemoScenarioId } from '../domain/types'
  import type { DraftValidationIssue as Issue } from '../domain/schemas'
  import type { DemoScenario } from '../api/mock/scenarios'
  import DemoScenarioPicker from './DemoScenarioPicker.svelte'
  import ParticipantEditor from './ParticipantEditor.svelte'

  interface Props {
    catalog: Catalog
    draft: DiscussionConfig
    scenarios: DemoScenario[]
    scenarioId: DemoScenarioId
    issues: Issue[]
    disabled: boolean
    submitting: boolean
    createError: string | null
    draftMessage: string | null
    mode: 'mock' | 'http'
    onDraft: (mutator: (draft: DiscussionConfig) => DiscussionConfig) => void
    onScenario: (id: DemoScenarioId) => void
    onAdd: () => void
    onRemove: (id: string) => void
    onStart: () => void
    onClearDraft: () => void
  }

  let {
    catalog,
    draft,
    scenarios,
    scenarioId,
    issues,
    disabled,
    submitting,
    createError,
    draftMessage,
    mode,
    onDraft,
    onScenario,
    onAdd,
    onRemove,
    onStart,
    onClearDraft,
  }: Props = $props()

  const questionError = $derived(issues.find((i) => i.path === 'question')?.message)
</script>

<aside class="setup">
  <header>
    <h2>Meeting setup</h2>
    <p class="demo">DEMO · Simulated agents{mode === 'http' ? ' · HTTP mode' : ''}</p>
  </header>

  {#if mode === 'mock'}
    <DemoScenarioPicker
      {scenarios}
      value={scenarioId}
      disabled={disabled}
      onChange={onScenario}
    />
  {/if}

  <label class="question">
    <span>Question</span>
    <textarea
      {disabled}
      rows="4"
      maxlength={8000}
      value={draft.question}
      aria-invalid={!!questionError}
      aria-describedby="question-help"
      oninput={(e) => onDraft((d) => ({ ...d, question: e.currentTarget.value }))}
    ></textarea>
    <div id="question-help" class="help">
      <span>{draft.question.trim().length}/8000</span>
      {#if questionError}<span class="error">{questionError}</span>{/if}
    </div>
  </label>

  <div class="participants">
    <div class="row">
      <h3>Participants ({draft.participants.length}/6)</h3>
      <button type="button" disabled={disabled || draft.participants.length >= 6} onclick={onAdd}>
        + Add participant
      </button>
    </div>
    {#each draft.participants as participant (participant.id)}
      <ParticipantEditor
        {participant}
        {catalog}
        {disabled}
        canRemove={draft.participants.length > 2}
        onChange={(next) =>
          onDraft((d) => ({
            ...d,
            participants: d.participants.map((p) => (p.id === next.id ? next : p)),
          }))}
        onRemove={() => onRemove(participant.id)}
      />
    {/each}
  </div>

  <fieldset class="rounds" {disabled}>
    <legend>Rounds</legend>
    <label>
      <input
        type="radio"
        name="rounds"
        checked={draft.totalRounds === 2}
        onchange={() => onDraft((d) => ({ ...d, totalRounds: 2 }))}
      />
      2 — independent opinions, then one reconsideration
    </label>
    <label>
      <input
        type="radio"
        name="rounds"
        checked={draft.totalRounds === 3}
        onchange={() => onDraft((d) => ({ ...d, totalRounds: 3 }))}
      />
      3 — second reconsideration after another published snapshot
    </label>
  </fieldset>

  <details class="advanced">
    <summary>Advanced</summary>
    <label>
      <span>Timeout per attempt (seconds)</span>
      <input
        type="number"
        min="10"
        max="120"
        {disabled}
        value={Math.round(draft.attemptTimeoutMs / 1000)}
        oninput={(e) =>
          onDraft((d) => ({
            ...d,
            attemptTimeoutMs: Math.min(120, Math.max(10, Number(e.currentTarget.value) || 30)) * 1000,
          }))}
      />
    </label>
  </details>

  {#if createError}
    <p class="error" role="alert">{createError}</p>
  {/if}
  {#if draftMessage}
    <p class="hint">{draftMessage}</p>
  {/if}

  <div class="actions">
    <button type="button" class="primary" disabled={disabled || submitting || issues.length > 0} onclick={onStart}>
      {submitting ? 'Starting…' : 'Start roundtable'}
    </button>
    <button type="button" class="ghost" {disabled} onclick={onClearDraft}>Clear saved draft</button>
  </div>
  <p class="hint">Draft preferences stay in this browser. No accounts or secrets.</p>
</aside>

<style>
  .setup {
    display: grid;
    gap: 0.85rem;
    align-content: start;
    padding: 1rem 1.1rem 1.15rem;
    background: color-mix(in srgb, var(--surface) 94%, #e8f3ef);
    border: 1px solid var(--line);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-soft);
  }
  .participants {
    display: grid;
    gap: 0.65rem;
    grid-template-columns: 1fr;
  }
  @media (min-width: 900px) {
    .participants {
      grid-template-columns: 1fr 1fr;
    }
    .participants > .row {
      grid-column: 1 / -1;
    }
  }
  header h2 {
    margin: 0;
    font-size: 1.1rem;
  }
  .demo {
    margin: 0.2rem 0 0;
    color: var(--accent);
    font-size: 0.85rem;
    font-weight: 600;
  }
  .question,
  .advanced label {
    display: grid;
    gap: 0.3rem;
  }
  textarea,
  input[type='number'] {
    width: 100%;
    border: 1px solid var(--line);
    border-radius: var(--radius-control);
    padding: 0.55rem;
    background: #fff;
  }
  .help {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: var(--muted);
  }
  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }
  h3 {
    margin: 0;
    font-size: 0.95rem;
  }
  .rounds {
    border: 1px solid var(--line);
    border-radius: 12px;
    display: grid;
    gap: 0.4rem;
    padding: 0.65rem 0.75rem;
  }
  .rounds label {
    display: flex;
    gap: 0.45rem;
    align-items: flex-start;
    font-size: 0.9rem;
  }
  .actions {
    display: grid;
    gap: 0.5rem;
  }
  button {
    min-height: 44px;
    border-radius: var(--radius-control);
    border: 1px solid var(--line);
    cursor: pointer;
    padding: 0 0.85rem;
  }
  .primary {
    background: var(--accent);
    color: var(--accent-ink);
    border-color: color-mix(in srgb, var(--accent) 70%, #000);
    font-weight: 600;
  }
  .primary:disabled,
  button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .ghost {
    background: transparent;
  }
  .error {
    color: var(--danger);
    margin: 0;
  }
  .hint {
    margin: 0;
    color: var(--muted);
    font-size: 0.82rem;
  }
</style>
