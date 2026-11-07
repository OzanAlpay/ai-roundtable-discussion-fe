<script lang="ts">
  import type { Accent, AvatarVariant } from '../domain/types'
  import type { SeatLayout } from '../scene/getSeatLayout'
  import AgentAvatar from './AgentAvatar.svelte'
  import ProviderBadge from './ProviderBadge.svelte'

  interface Props {
    layout: SeatLayout
    empty?: boolean
    name?: string
    seatNumber?: number | null
    roleLabel?: string
    providerName?: string
    modelName?: string
    iconKey?: string
    accent?: Accent
    variant?: AvatarVariant
    statusText?: string
    statusKey?: string
    selected?: boolean
    disabled?: boolean
    compactLabels?: boolean
    onSelect?: () => void
  }

  let {
    layout,
    empty = false,
    name = '',
    seatNumber = null,
    roleLabel = '',
    providerName = '',
    modelName = '',
    iconKey = 'neutral',
    accent = 'sage',
    variant = 'round',
    statusText = '',
    statusKey = 'pending',
    selected = false,
    disabled = false,
    compactLabels = false,
    onSelect,
  }: Props = $props()

  const label = $derived(
    empty
      ? `Empty chair ${layout.chairIndex + 1}`
      : `${name}${seatNumber ? ` (seat ${seatNumber})` : ''}, ${modelName} via ${providerName}, ${statusText}`,
  )
</script>

{#if empty}
  <div
    class="seat empty"
    class:front={layout.layer === 'front'}
    class:back={layout.layer === 'back'}
    class:side={layout.layer === 'side'}
    style={`left:${layout.x * 100}%; top:${layout.y * 100}%`}
    aria-hidden="true"
  >
    <div class="figure">
      <div class="chair-back"></div>
      <div class="chair-seat"></div>
      <div class="chair-legs"></div>
    </div>
  </div>
{:else}
  <button
    type="button"
    class="seat"
    class:selected
    class:front={layout.layer === 'front'}
    class:back={layout.layer === 'back'}
    class:side={layout.layer === 'side'}
    class:compact={compactLabels}
    style={`left:${layout.x * 100}%; top:${layout.y * 100}%`}
    aria-label={label}
    aria-pressed={selected}
    {disabled}
    onclick={() => onSelect?.()}
  >
    <div class="stack" data-anchor={layout.labelAnchor}>
      {#if layout.labelAnchor === 'above'}
        <div class="meta above">
          <strong>{name}{#if seatNumber}<span class="seat-no"> #{seatNumber}</span>{/if}</strong>
          {#if !compactLabels}
            <span class="role">{roleLabel}</span>
          {/if}
          <ProviderBadge {iconKey} name={providerName} modelName={compactLabels ? undefined : modelName} compact={compactLabels} />
          <span class="status">{statusText}</span>
        </div>
      {/if}
      <div class="figure occupied">
        <div class="laptop" aria-hidden="true"></div>
        <AgentAvatar {accent} {variant} status={statusKey} {iconKey} />
        <div class="chair-seat occupied-chair" aria-hidden="true"></div>
      </div>
      {#if layout.labelAnchor !== 'above'}
        <div class="meta" data-side={layout.labelAnchor}>
          <strong>{name}{#if seatNumber}<span class="seat-no"> #{seatNumber}</span>{/if}</strong>
          {#if !compactLabels}
            <span class="role">{roleLabel}</span>
          {/if}
          <ProviderBadge {iconKey} name={providerName} modelName={compactLabels ? undefined : modelName} compact={compactLabels} />
          <span class="status">{statusText}</span>
        </div>
      {/if}
    </div>
  </button>
{/if}

<style>
  .seat {
    position: absolute;
    transform: translate(-50%, -50%);
    border: 0;
    background: transparent;
    padding: 0.2rem;
    cursor: pointer;
    width: min(168px, 26vw);
    z-index: 2;
    transition: transform 180ms ease;
  }
  .seat.empty {
    width: 64px;
    cursor: default;
    pointer-events: none;
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
  .seat.selected .figure.occupied {
    filter: drop-shadow(0 0 0 2px rgba(47, 111, 98, 0.45));
  }
  .seat.compact {
    width: min(120px, 30vw);
  }
  .stack {
    display: grid;
    justify-items: center;
    gap: 0.2rem;
  }
  .figure {
    position: relative;
    display: grid;
    place-items: center;
    padding: 0.2rem;
    min-height: 56px;
  }
  .chair-back {
    width: 34px;
    height: 28px;
    border-radius: 10px 10px 4px 4px;
    background: linear-gradient(180deg, #8f7358, #6f5640);
    box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.12);
  }
  .chair-seat {
    width: 40px;
    height: 14px;
    margin-top: -4px;
    border-radius: 8px;
    background: linear-gradient(180deg, #a48462, #7a5d45);
  }
  .occupied-chair {
    position: absolute;
    bottom: 2px;
    z-index: -1;
  }
  .chair-legs {
    display: flex;
    justify-content: space-between;
    width: 34px;
    margin: 2px auto 0;
  }
  .chair-legs::before,
  .chair-legs::after {
    content: '';
    width: 4px;
    height: 10px;
    border-radius: 2px;
    background: #5c4634;
  }
  .laptop {
    position: absolute;
    top: 48px;
    width: 30px;
    height: 16px;
    border-radius: 3px;
    background: #3f4a55;
    box-shadow: 0 1px 0 #232a31;
    z-index: 2;
  }
  .laptop::after {
    content: '';
    position: absolute;
    left: 3px;
    right: 3px;
    top: 3px;
    height: 7px;
    border-radius: 2px;
    background: #7ec8e8;
    opacity: 0.85;
  }
  .meta {
    display: grid;
    gap: 0.12rem;
    justify-items: center;
    text-align: center;
    max-width: 150px;
    padding: 0.2rem 0.35rem;
    border-radius: 10px;
    background: color-mix(in srgb, var(--surface) 88%, transparent);
    border: 1px solid color-mix(in srgb, var(--line) 80%, transparent);
    box-shadow: 0 4px 10px rgba(74, 58, 42, 0.08);
  }
  .meta[data-side='left'] {
    justify-items: end;
    text-align: right;
  }
  .meta[data-side='right'] {
    justify-items: start;
    text-align: left;
  }
  .meta strong {
    font-size: 0.82rem;
    font-weight: 800;
  }
  .role,
  .status {
    font-size: 0.7rem;
    color: var(--muted);
    font-weight: 600;
  }
  .status {
    color: var(--accent);
  }
  .seat-no {
    color: var(--muted);
    font-weight: 700;
  }
  .seat.compact .meta {
    max-width: 110px;
    padding: 0.15rem 0.28rem;
  }
  .seat.compact .meta strong {
    font-size: 0.74rem;
  }
</style>
