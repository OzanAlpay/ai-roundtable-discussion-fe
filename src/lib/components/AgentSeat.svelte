<script lang="ts">
  import type { Accent, AvatarVariant } from '../domain/types'
  import type { SeatLayout } from '../scene/getSeatLayout'
  import AgentAvatar from './AgentAvatar.svelte'
  import ProviderBadge from './ProviderBadge.svelte'

  interface Props {
    layout: SeatLayout
    name: string
    seatNumber: number | null
    roleLabel: string
    providerName: string
    modelName: string
    iconKey: string
    accent: Accent
    variant: AvatarVariant
    statusText: string
    statusKey: string
    selected: boolean
    disabled?: boolean
    onSelect: () => void
  }

  let {
    layout,
    name,
    seatNumber,
    roleLabel,
    providerName,
    modelName,
    iconKey,
    accent,
    variant,
    statusText,
    statusKey,
    selected,
    disabled = false,
    onSelect,
  }: Props = $props()

  const label = $derived(
    `${name}${seatNumber ? ` (seat ${seatNumber})` : ''}, ${modelName} via ${providerName}, ${statusText}`,
  )
</script>

<button
  type="button"
  class="seat"
  class:selected
  class:front={layout.layer === 'front'}
  class:back={layout.layer === 'back'}
  class:side={layout.layer === 'side'}
  style={`left:${layout.x * 100}%; top:${layout.y * 100}%`}
  aria-label={label}
  aria-pressed={selected}
  {disabled}
  onclick={onSelect}
>
  <div class="stack" data-anchor={layout.labelAnchor}>
    {#if layout.labelAnchor === 'above'}
      <div class="meta above">
        <strong>{name}{#if seatNumber}<span class="seat-no"> #{seatNumber}</span>{/if}</strong>
        <span class="role">{roleLabel}</span>
        <ProviderBadge {iconKey} name={providerName} {modelName} />
        <span class="status">{statusText}</span>
      </div>
    {/if}
    <div class="figure">
      <div class="laptop" aria-hidden="true"></div>
      <AgentAvatar {accent} {variant} status={statusKey} />
      <div class="chair" aria-hidden="true"></div>
    </div>
    {#if layout.labelAnchor !== 'above'}
      <div class="meta">
        <strong>{name}{#if seatNumber}<span class="seat-no"> #{seatNumber}</span>{/if}</strong>
        <span class="role">{roleLabel}</span>
        <ProviderBadge {iconKey} name={providerName} {modelName} />
        <span class="status">{statusText}</span>
      </div>
    {/if}
  </div>
</button>

<style>
  .seat {
    position: absolute;
    transform: translate(-50%, -50%);
    border: 0;
    background: transparent;
    padding: 0.25rem;
    cursor: pointer;
    width: min(180px, 28vw);
    z-index: 2;
    transition: transform 180ms ease;
  }
  .seat.back {
    z-index: 1;
  }
  .seat.front {
    z-index: 3;
  }
  .seat.selected {
    z-index: 4;
  }
  .seat.selected .figure {
    box-shadow: var(--focus);
    border-radius: 18px;
  }
  .stack {
    display: grid;
    justify-items: center;
    gap: 0.25rem;
  }
  .figure {
    position: relative;
    display: grid;
    place-items: center;
    padding: 0.35rem;
  }
  .chair {
    position: absolute;
    bottom: 2px;
    width: 42px;
    height: 14px;
    border-radius: 8px 8px 4px 4px;
    background: color-mix(in srgb, var(--wood-edge) 70%, #777);
    z-index: -1;
  }
  .laptop {
    position: absolute;
    top: 42px;
    width: 28px;
    height: 16px;
    border-radius: 3px;
    background: #4a5560;
    box-shadow: 0 1px 0 #2c343c;
  }
  .meta {
    display: grid;
    gap: 0.15rem;
    justify-items: center;
    text-align: center;
    max-width: 160px;
  }
  .meta strong {
    font-size: 0.85rem;
  }
  .role,
  .status {
    font-size: 0.72rem;
    color: var(--muted);
  }
  .seat-no {
    color: var(--muted);
    font-weight: 600;
  }
</style>
