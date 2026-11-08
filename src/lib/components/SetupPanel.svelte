<script lang="ts">
  import type { Catalog, DiscussionConfig, DemoScenarioId } from '../domain/types'
  import type { DraftValidationIssue as Issue } from '../domain/schemas'
  import type { DemoScenario } from '../domain/types'
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
    selectedParticipantId?: string | null
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
    selectedParticipantId = null,
  }: Props = $props()

  const questionError = $derived(issues.find((i) => i.path === 'question')?.message)
</script>

<section class="setup" aria-labelledby="setup-title">
  <header>
    <div>
      <span class="eyebrow">LET’S SET THE AGENDA</span>
      <h2 id="setup-title">What’s on the table?</h2>
      <p>Bring a question. Pick your crew. Make room for another point of view.</p>
    </div>
    <span class="private"
      ><span aria-hidden="true">⌁</span>
      {mode === 'mock' ? 'Runs in your browser' : 'API workspace'}</span
    >
  </header>
  <div class="agenda">
    <label class="question"
      ><span>Your discussion topic</span><textarea
        disabled={disabled || submitting}
        rows="3"
        maxlength={8000}
        value={draft.question}
        aria-invalid={!!questionError}
        aria-describedby="question-help"
        oninput={(e) => onDraft((d) => ({ ...d, question: e.currentTarget.value }))}
      ></textarea><span id="question-help" class="help"
        ><span>{questionError ?? 'A specific question makes for a better conversation.'}</span><span
          >{draft.question.trim().length}/8000</span
        ></span
      ></label
    >
    <fieldset class="rounds" disabled={disabled || submitting}>
      <legend>How many rounds?</legend>
      <div class="round-options">
        {#each [2, 3] as count}<label class:chosen={draft.totalRounds === count}
            ><input
              type="radio"
              name="rounds"
              value={count}
              checked={draft.totalRounds === count}
              onchange={() => onDraft((d) => ({ ...d, totalRounds: count as 2 | 3 }))}
            /><strong>{count} rounds</strong><span
              >{count === 2 ? 'Think + reconsider' : 'One more perspective'}</span
            ></label
          >{/each}
      </div>
      <p>Everyone finishes before the next round begins.</p>
    </fieldset>
  </div>
  <div class="crew-heading">
    <div>
      <h3>Your crew <span>{draft.participants.length} / 6</span></h3>
      <p>Different roles. Independent opinions.</p>
    </div>
    <button
      class="add"
      disabled={disabled || submitting || draft.participants.length >= 6}
      onclick={onAdd}>＋ Add participant</button
    >
  </div>
  <div class="participants">
    {#each draft.participants as participant, index (participant.id)}<ParticipantEditor
        {participant}
        {catalog}
        {index}
        disabled={disabled || submitting}
        selected={selectedParticipantId === participant.id}
        errors={issues
          .filter((i) => i.path.startsWith(`participants.${index}.`))
          .map((i) => i.message)}
        canRemove={draft.participants.length > 2}
        onChange={(next) =>
          onDraft((d) => ({
            ...d,
            participants: d.participants.map((p) => (p.id === next.id ? next : p)),
          }))}
        onRemove={() => onRemove(participant.id)}
      />{/each}
  </div>
  <details class="advanced">
    <summary>Meeting options &amp; demo scenarios</summary>
    <div class="options">
      <label
        ><span>Timeout per attempt (seconds)</span><input
          type="number"
          min="10"
          max="120"
          disabled={disabled || submitting}
          value={draft.attemptTimeoutMs / 1000}
          oninput={(e) =>
            onDraft((d) => ({ ...d, attemptTimeoutMs: Number(e.currentTarget.value) * 1000 }))}
        /></label
      >{#if mode === 'mock'}<DemoScenarioPicker
          {scenarios}
          value={scenarioId}
          disabled={disabled || submitting}
          onChange={onScenario}
        />{/if}
    </div>
  </details>
  {#if createError}<p class="error" role="alert">{createError}</p>{/if}
  {#if issues.some((i) => !i.path.startsWith('participants.') && i.path !== 'question')}<p
      class="error"
      role="alert"
    >
      {issues
        .filter((i) => !i.path.startsWith('participants.') && i.path !== 'question')
        .map((i) => i.message)
        .join(' ')}
    </p>{/if}
  <footer>
    <div>
      <span class="save-note">{draftMessage ?? 'Draft saved only in this browser.'}</span><button
        class="clear"
        disabled={disabled || submitting}
        onclick={onClearDraft}>Clear saved draft</button
      >
    </div>
    <button class="primary" disabled={disabled || submitting || issues.length > 0} onclick={onStart}
      >{submitting ? 'Starting…' : 'Start roundtable'} <span aria-hidden="true">→</span></button
    >
  </footer>
</section>

<style>
  .setup {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 18px;
    padding: 26px;
    display: grid;
    gap: 22px;
  }
  header {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
  }
  .eyebrow {
    font: 9px monospace;
    letter-spacing: 1.8px;
    color: var(--accent);
    font-weight: 600;
  }
  h2 {
    margin: 5px 0;
    font-size: 23px;
    letter-spacing: -0.7px;
  }
  header p,
  .crew-heading p {
    margin: 3px 0 0;
    color: var(--muted);
    font-size: 12px;
  }
  .private {
    font-size: 10px;
    color: var(--muted);
    white-space: nowrap;
  }
  .agenda {
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
    gap: 28px;
  }
  .question {
    display: grid;
    gap: 8px;
    font-size: 12px;
    font-weight: 600;
  }
  .question textarea {
    font-size: 14px;
    line-height: 1.6;
    background: #fafbfe;
    width: 100%;
    padding: 14px;
  }
  .help {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 10px;
    color: var(--muted);
    font-weight: 400;
  }
  .rounds {
    border: 0;
    padding: 0;
    margin: 0;
    min-width: 0;
  }
  .rounds legend {
    padding: 0;
    margin-bottom: 8px;
    font-size: 12px;
    font-weight: 600;
  }
  .round-options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .round-options label {
    position: relative;
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 12px;
    display: grid;
    gap: 3px;
    cursor: pointer;
  }
  .round-options label.chosen {
    border-color: #a99be8;
    background: #f5f2ff;
  }
  .round-options input {
    position: absolute;
    right: 8px;
    top: 8px;
    min-height: 0;
    accent-color: var(--accent);
    width: 13px;
    height: 13px;
  }
  .round-options strong {
    font-size: 12px;
    padding-right: 12px;
  }
  .round-options span,
  .rounds p {
    font-size: 10px;
    color: var(--muted);
  }
  .crew-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .crew-heading h3 {
    font-size: 14px;
    margin: 0;
  }
  .crew-heading h3 span {
    margin-left: 8px;
    font-size: 10px;
    color: var(--muted);
    font-weight: 400;
    background: var(--canvas);
    padding: 3px 6px;
    border-radius: 5px;
  }
  .add {
    font-size: 11px;
  }
  .participants {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }
  .advanced {
    border-top: 1px solid var(--line);
    padding-top: 15px;
    font-size: 11px;
    color: var(--muted);
  }
  summary {
    cursor: pointer;
    min-height: 30px;
  }
  .options {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 24px;
    padding-top: 15px;
  }
  .options label {
    display: grid;
    align-content: start;
    gap: 8px;
  }
  footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 15px;
    border-top: 1px solid var(--line);
    padding-top: 20px;
  }
  .save-note {
    font-size: 10px;
    color: var(--muted);
  }
  .clear {
    display: block;
    border: 0;
    min-height: 28px;
    padding: 0;
    background: none;
    font-size: 10px;
    text-decoration: underline;
    color: var(--muted);
  }
  .primary {
    background: var(--accent);
    color: white;
    font-weight: 600;
    padding: 12px 22px;
    border: 0;
    font-size: 12px;
    box-shadow: 0 4px 12px #6551ce22;
    white-space: nowrap;
  }
  .primary:hover:not(:disabled) {
    background: #5542b9;
  }
  .primary span {
    margin-left: 30px;
  }
  .error {
    margin: 0;
    color: var(--danger);
    font-size: 12px;
  }
  @media (max-width: 767px) {
    .setup {
      padding: 18px;
      gap: 18px;
    }
    .agenda,
    .options {
      grid-template-columns: 1fr;
      gap: 16px;
    }
    .participants {
      grid-template-columns: 1fr;
    }
    .private {
      display: none;
    }
    h2 {
      font-size: 22px;
    }
    footer {
      align-items: flex-start;
      flex-direction: column;
    }
    .primary {
      width: 100%;
    }
    .help {
      font-size: 9px;
    }
  }
</style>
