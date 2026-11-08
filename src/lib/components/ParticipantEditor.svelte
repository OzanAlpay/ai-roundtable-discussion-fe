<script lang="ts">
  import type { Catalog, ParticipantConfig } from '../domain/types'
  import { ROLE_PRESETS } from '../domain/types'
  import { DEFAULT_ROLE_INSTRUCTIONS } from '../domain/roles'
  import AgentAvatar from './AgentAvatar.svelte'
  import ModelPicker from './ModelPicker.svelte'

  // Re-export helper through local const for template
  const roleDefaults = DEFAULT_ROLE_INSTRUCTIONS

  interface Props {
    participant: ParticipantConfig
    catalog: Catalog
    disabled?: boolean
    canRemove: boolean
    onChange: (next: ParticipantConfig) => void
    selected?: boolean
    index?: number
    errors?: string[]
    onRemove: () => void
  }

  let {
    participant,
    catalog,
    disabled = false,
    canRemove,
    onChange,
    onRemove,
    selected = false,
    index = 0,
    errors = [],
  }: Props = $props()

  let expanded = $state(false)
  $effect(() => {
    if (selected || errors.length) expanded = true
  })
  const modelName = $derived(
    catalog.models.find((m) => m.id === participant.modelId)?.name ?? 'Choose a model',
  )
  const iconKey = $derived(
    catalog.providers.find((p) => p.id === participant.providerId)?.iconKey ?? 'neutral',
  )
  function patch(partial: Partial<ParticipantConfig>) {
    onChange({ ...participant, ...partial })
  }
</script>

<details class="editor" id={`editor-${participant.id}`} class:selected bind:open={expanded}>
  <summary
    ><span class="portrait"
      ><AgentAvatar
        accent={participant.accent}
        variant={participant.avatarVariant}
        status="pending"
        {iconKey}
      /></span
    ><span class="identity"
      ><strong>{participant.name || 'Unnamed agent'}</strong><small
        >{modelName.replace('Example ', '')}</small
      ></span
    ><span class="edit" aria-hidden="true">⌄</span></summary
  >
  <div class="fields" role="group" aria-label={`Participant ${participant.name}`}>
    {#if errors.length}<ul class="errors" role="alert">
        {#each errors as error}<li>{error}</li>{/each}
      </ul>{/if}
    <div class="top">
      <label>
        <span>Name</span>
        <input
          {disabled}
          maxlength={40}
          value={participant.name}
          oninput={(e) => patch({ name: e.currentTarget.value })}
        />
      </label>
      <label>
        <span>Role</span>
        <select
          {disabled}
          value={participant.roleLabel}
          onchange={(e) => {
            const roleLabel = e.currentTarget.value
            patch({
              roleLabel,
              roleInstruction:
                roleLabel === 'Custom'
                  ? participant.roleInstruction
                  : (roleDefaults[roleLabel] ?? participant.roleInstruction),
            })
          }}
        >
          {#each ROLE_PRESETS as role}
            <option value={role}>{role}</option>
          {/each}
        </select>
      </label>
    </div>

    <ModelPicker
      {catalog}
      providerId={participant.providerId}
      modelId={participant.modelId}
      {disabled}
      onProvider={(providerId) => {
        const model =
          catalog.models.find(
            (m) => m.providerId === providerId && m.availability === 'available',
          ) ?? catalog.models.find((m) => m.providerId === providerId)
        patch({ providerId, modelId: model?.id ?? '' })
      }}
      onModel={(modelId) => patch({ modelId })}
    />

    <label class="full">
      <span>Role instructions</span>
      <textarea
        {disabled}
        maxlength={1000}
        rows="3"
        value={participant.roleInstruction}
        oninput={(e) => patch({ roleInstruction: e.currentTarget.value })}></textarea>
    </label>

    <div class="bottom">
      <label>
        <span>Accent</span>
        <select
          {disabled}
          value={participant.accent}
          onchange={(e) => patch({ accent: e.currentTarget.value as ParticipantConfig['accent'] })}
        >
          <option value="sage">Sage</option>
          <option value="lavender">Lavender</option>
          <option value="peach">Peach</option>
          <option value="sky">Sky</option>
        </select>
      </label>
      <label>
        <span>Avatar</span>
        <select
          {disabled}
          value={participant.avatarVariant}
          onchange={(e) =>
            patch({ avatarVariant: e.currentTarget.value as ParticipantConfig['avatarVariant'] })}
        >
          <option value="round">Round</option>
          <option value="square">Square</option>
          <option value="antenna">Antenna</option>
        </select>
      </label>
      <button type="button" class="remove" disabled={disabled || !canRemove} onclick={onRemove}>
        Remove
      </button>
    </div>
  </div>
</details>

<style>
  .editor {
    min-width: 0;
    border: 1px solid var(--line);
    border-radius: 14px;
    background: var(--surface);
    align-self: start;
    overflow: hidden;
  }
  .editor.selected {
    border-color: #b5a8ee;
  }
  summary {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 15px;
    cursor: pointer;
    list-style: none;
    min-height: 86px;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  .portrait {
    width: 43px;
    height: 50px;
    background: var(--lavender);
    border-radius: 12px;
    flex-shrink: 0;
  }
  .identity {
    min-width: 0;
    display: grid;
    gap: 3px;
  }
  .identity strong {
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .identity small {
    font-size: 11px;
    color: var(--muted);
  }
  .edit {
    margin-left: auto;
    color: var(--muted);
  }
  .fields {
    padding: 15px;
    border-top: 1px solid var(--line);
    display: grid;
    gap: 14px;
  }
  .top,
  .bottom {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    min-width: 0;
  }
  .bottom button {
    grid-column: 1/-1;
  }
  label {
    display: grid;
    gap: 5px;
    font-size: 11px;
    min-width: 0;
  }
  label span {
    color: var(--muted);
  }
  input,
  select,
  textarea {
    width: 100%;
    font-size: 12px;
  }
  .remove {
    font-size: 12px;
    color: var(--danger);
    background: var(--peach);
  }
  .errors {
    font-size: 12px;
    color: var(--danger);
    padding-left: 16px;
    margin: 0;
  }
</style>
