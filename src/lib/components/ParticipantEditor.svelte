<script lang="ts">
  import type { Catalog, ParticipantConfig } from '../domain/types'
  import { ROLE_PRESETS } from '../domain/types'
  import { DEFAULT_ROLE_INSTRUCTIONS } from '../api/mock/catalog'
  import ModelPicker from './ModelPicker.svelte'

  // Re-export helper through local const for template
  const roleDefaults = DEFAULT_ROLE_INSTRUCTIONS

  interface Props {
    participant: ParticipantConfig
    catalog: Catalog
    disabled?: boolean
    canRemove: boolean
    onChange: (next: ParticipantConfig) => void
    onRemove: () => void
  }

  let { participant, catalog, disabled = false, canRemove, onChange, onRemove }: Props = $props()

  function patch(partial: Partial<ParticipantConfig>) {
    onChange({ ...participant, ...partial })
  }
</script>

<section class="editor" aria-label={`Participant ${participant.name}`}>
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
                : roleDefaults[roleLabel] ?? participant.roleInstruction,
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
        catalog.models.find((m) => m.providerId === providerId && m.availability === 'available') ??
        catalog.models.find((m) => m.providerId === providerId)
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
      oninput={(e) => patch({ roleInstruction: e.currentTarget.value })}
    ></textarea>
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
</section>

<style>
  .editor {
    display: grid;
    gap: 0.65rem;
    padding: 0.75rem;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: color-mix(in srgb, var(--surface) 92%, var(--sage));
  }
  .top,
  .bottom {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
  .bottom {
    grid-template-columns: 1fr 1fr auto;
    align-items: end;
  }
  label,
  .full {
    display: grid;
    gap: 0.25rem;
    font-size: 0.85rem;
  }
  span {
    color: var(--muted);
  }
  input,
  select,
  textarea {
    min-height: 44px;
    border-radius: var(--radius-control);
    border: 1px solid var(--line);
    background: var(--surface);
    padding: 0.45rem 0.55rem;
  }
  textarea {
    min-height: 72px;
    resize: vertical;
  }
  .remove {
    min-height: 44px;
    border-radius: var(--radius-control);
    border: 1px solid var(--line);
    background: var(--peach);
    color: var(--danger);
    padding: 0 0.75rem;
    cursor: pointer;
  }
  .remove:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
