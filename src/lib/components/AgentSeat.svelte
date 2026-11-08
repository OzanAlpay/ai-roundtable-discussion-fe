<script lang="ts">
  import type { Accent, AvatarVariant } from '../domain/types'
  import type { SeatLayout } from '../scene/getSeatLayout'
  import AgentAvatar from './AgentAvatar.svelte'
  let {
    layout,
    empty = false,
    name = '',
    seatNumber = null,
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
    changed = false,
  }: {
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
    changed?: boolean
  } = $props()
</script>

<div
  class="seat"
  class:back={layout.layer === 'back'}
  class:front={layout.layer === 'front'}
  class:side={layout.layer === 'side'}
  class:empty
  class:selected
  data-chair={layout.chairIndex}
  style={`left:${layout.x * 100}%;top:${layout.y * 100}%`}
>
  <div class="chair" aria-hidden="true">
    <div class="chair-back"></div>
    <div class="chair-base"></div>
    <span>{String(layout.chairIndex + 1).padStart(2, '0')}</span>
  </div>
  {#if !empty}
    <button
      class="agent"
      {disabled}
      tabindex={compactLabels ? -1 : 0}
      aria-label={`${name}${seatNumber ? ` (seat ${seatNumber})` : ''}, ${modelName} via ${providerName}, ${statusText}`}
      aria-pressed={selected}
      onclick={onSelect}
    >
      <span class="figure"><AgentAvatar {accent} {variant} {iconKey} status={statusKey} /></span>
      <span class="label"
        ><strong>{name}{seatNumber ? ` #${seatNumber}` : ''}</strong><span class="model"
          >{providerName} · {modelName.replace('Example ', '')}</span
        ><span class="status" data-status={statusKey}
          ><i></i>{changed ? 'Changed perspective' : statusText}</span
        ></span
      >
    </button>
    <div class="laptop" aria-hidden="true"><span></span></div>
  {/if}
</div>

<style>
  .seat {
    position: absolute;
    width: 0;
    height: 0;
    z-index: 4;
  }
  .seat.back {
    z-index: 2;
  }
  .seat.front {
    z-index: 5;
  }
  .chair {
    position: absolute;
    left: -26px;
    top: -10px;
    width: 52px;
    height: 54px;
    filter: drop-shadow(0 7px 2px #14223755);
  }
  .chair-back {
    position: absolute;
    left: 4px;
    top: -14px;
    width: 44px;
    height: 42px;
    border-radius: 16px 16px 9px 9px;
    background: #566b88;
    border: 3px solid #22334c;
    box-shadow: inset 0 3px #74859a;
  }
  .chair-base {
    position: absolute;
    top: 14px;
    width: 52px;
    height: 24px;
    border: 3px solid #22334c;
    border-radius: 10px;
    background: #425c75;
    box-shadow: 0 7px #22334c;
  }
  .chair span {
    position: absolute;
    top: 18px;
    left: 0;
    width: 100%;
    text-align: center;
    font: 10px monospace;
    letter-spacing: 1px;
    color: #fff;
  }
  .seat:not(.empty) .chair span {
    display: none;
  }
  .agent {
    position: absolute;
    left: -76px;
    top: -83px;
    width: 152px;
    height: 110px;
    padding: 0;
    border: 0;
    background: transparent !important;
    box-shadow: none;
    z-index: 2;
  }
  .figure {
    position: absolute;
    width: 91px;
    height: 100px;
    left: 30px;
    bottom: 0;
    transition: transform 0.2s;
  }
  .agent:hover .figure {
    transform: translateY(-4px);
  }
  .agent:focus-visible {
    outline: 2px solid #ddd4ff;
    border-radius: 14px;
  }
  .label {
    position: absolute;
    left: 0;
    width: 152px;
    top: 117px;
    text-align: center;
    color: #eaf2fb;
    display: grid;
    gap: 1px;
    line-height: 1.45;
  }
  .back .label {
    top: -49px;
  }
  .label strong {
    font-size: 12px;
    font-weight: 650;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .model {
    font-size: 9px;
    color: #c0d0df;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .status {
    font-size: 9px;
    color: #b7dbd6;
    display: flex;
    gap: 5px;
    justify-content: center;
    align-items: center;
  }
  .status i {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: currentColor;
  }
  .status[data-status='failed'] {
    color: #ffd2bc;
  }
  .status[data-status='thinking'] {
    color: #e1d2ff;
  }
  .laptop {
    position: absolute;
    z-index: 3;
    left: -19px;
    top: 9px;
    width: 38px;
    height: 22px;
    background: #263750;
    border: 2px solid #142039;
    border-radius: 4px;
    transform: skewX(-6deg);
    box-shadow: 0 4px #7894a2;
  }
  .laptop span {
    position: absolute;
    inset: 4px;
    background: #9cd8d4;
    border-radius: 1px;
  }
  .front .laptop {
    top: -65px;
    left: 23px;
    z-index: 1;
    transform: rotate(-10deg);
  }
  .empty {
    opacity: 1;
  }
  .selected .figure {
    filter: drop-shadow(0 0 7px #cab7ff);
  }
  @media (max-width: 767px) {
    .figure {
      width: 62px;
      height: 69px;
      left: 45px;
    }
    .agent {
      top: -55px;
      height: 80px;
    }
    .chair {
      transform: scale(0.72);
      transform-origin: 50% 0;
    }
    .laptop {
      transform: scale(0.7);
      top: 10px;
    }
    .front .laptop {
      top: -39px;
      left: 16px;
      transform: scale(0.7);
    }
    .label {
      display: none;
    }
  }
  @media (max-width: 420px) {
    .figure {
      width: 44px;
      height: 49px;
      left: 54px;
    }
    .agent {
      top: -40px;
      height: 58px;
      width: 130px;
      left: -65px;
    }
    .figure {
      left: 43px;
    }
    .chair {
      transform: scale(0.52);
    }
    .laptop {
      transform: scale(0.52);
      top: 6px;
    }
    .front .laptop {
      top: -26px;
      left: 8px;
      transform: scale(0.52);
    }
  }
</style>
