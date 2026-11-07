<script lang="ts">
  import type { Accent, AvatarVariant } from '../domain/types'

  interface Props {
    accent: Accent
    variant: AvatarVariant
    status: string
    iconKey?: string
    reducedMotion?: boolean
  }
  let { accent, variant, status, iconKey = 'neutral', reducedMotion = false }: Props = $props()

  const thinking = $derived(status === 'thinking' || status === 'reading')
  const ready = $derived(status === 'submitted')
  const failed = $derived(status === 'failed')
  const backpack = $derived(variant === 'antenna' || iconKey === 'anthropic' || iconKey === 'grok')
  const tallVisor = $derived(variant === 'square' || iconKey === 'openai' || iconKey === 'google')
  const antenna = $derived(variant === 'antenna' || iconKey === 'grok')
</script>

<svg
  class="avatar"
  class:thinking={thinking && !reducedMotion}
  class:ready
  class:failed
  viewBox="0 0 72 78"
  width="72"
  height="78"
  aria-hidden="true"
  data-accent={accent}
  data-icon={iconKey}
  data-variant={variant}
>
  <ellipse cx="36" cy="72" rx="18" ry="4.5" fill="rgba(74,58,42,0.18)" />

  {#if backpack}
    <rect x="8" y="30" width="12" height="26" rx="6" class="pack" />
  {/if}

  {#if antenna}
    <path d="M36 8 V18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
    <circle cx="36" cy="7" r="3.4" class="antenna-tip" />
  {/if}

  <!-- legs -->
  <rect x="22" y="58" width="11" height="12" rx="5" class="leg" />
  <rect x="39" y="58" width="11" height="12" rx="5" class="leg" />

  <!-- body -->
  <path
    class="body"
    d="M18 28
       C18 16 26 12 36 12
       C46 12 54 16 54 28
       L54 52
       C54 62 46 66 36 66
       C26 66 18 62 18 52
       Z"
  />

  <!-- belly / suit panel -->
  <ellipse cx="36" cy="46" rx="11" ry="13" class="belly" />

  <!-- visor -->
  <ellipse
    cx="40"
    cy={tallVisor ? 30 : 29}
    rx={tallVisor ? 15 : 13}
    ry={tallVisor ? 11 : 9}
    class="visor"
  />
  <ellipse cx="44" cy={tallVisor ? 27 : 26} rx="5" ry="3" class="visor-shine" />

  {#if thinking}
    <g class="dots">
      <circle cx="20" cy="14" r="2.2" />
      <circle cx="27" cy="9" r="2.8" />
      <circle cx="35" cy="11" r="2" />
    </g>
  {/if}
  {#if ready}
    <g class="note">
      <rect x="52" y="18" width="14" height="16" rx="3" fill="var(--surface)" stroke="var(--accent)" stroke-width="1.6" />
      <path d="M55 23 H62 M55 28 H60" stroke="var(--accent)" stroke-width="1.6" stroke-linecap="round" />
    </g>
  {/if}
</svg>

<style>
  .avatar {
    overflow: visible;
    color: var(--ink);
    transition: transform 180ms ease;
  }
  .body,
  .leg,
  .pack {
    fill: var(--crew-fill, var(--sage));
    stroke: color-mix(in srgb, var(--ink) 40%, transparent);
    stroke-width: 1.8;
  }
  .belly {
    fill: color-mix(in srgb, var(--crew-fill, var(--sage)) 70%, #fff 30%);
    stroke: none;
    opacity: 0.55;
  }
  .visor {
    fill: var(--crew-visor, #9ad7ef);
    stroke: color-mix(in srgb, var(--ink) 35%, transparent);
    stroke-width: 1.6;
  }
  .visor-shine {
    fill: rgba(255, 255, 255, 0.55);
  }
  .antenna-tip {
    fill: var(--crew-accent, var(--accent));
  }
  .dots circle {
    fill: var(--muted);
  }

  /* Accent fallbacks */
  .avatar[data-accent='sage'] {
    --crew-fill: #7fbf92;
  }
  .avatar[data-accent='lavender'] {
    --crew-fill: #a996d6;
  }
  .avatar[data-accent='peach'] {
    --crew-fill: #e3a07a;
  }
  .avatar[data-accent='sky'] {
    --crew-fill: #7eb6d4;
  }

  /* Provider-distinct palettes (override accent) */
  .avatar[data-icon='openai'] {
    --crew-fill: #2f9e9a;
    --crew-visor: #b8f0ea;
    --crew-accent: #146b68;
  }
  .avatar[data-icon='anthropic'] {
    --crew-fill: #c47a5a;
    --crew-visor: #ffe0c8;
    --crew-accent: #8a4b32;
  }
  .avatar[data-icon='grok'] {
    --crew-fill: #3d4450;
    --crew-visor: #9be7ff;
    --crew-accent: #ff6b4a;
  }
  .avatar[data-icon='google'] {
    --crew-fill: #4f86e0;
    --crew-visor: #d7ecff;
    --crew-accent: #f2c94c;
  }
  .avatar[data-icon='copilot'] {
    --crew-fill: #5b8fd9;
    --crew-visor: #d9e8ff;
    --crew-accent: #2f5f9e;
  }

  .thinking {
    animation: bob 1.35s ease-in-out infinite;
  }
  .ready .note {
    animation: pop 220ms ease-out;
  }
  .failed .body,
  .failed .leg,
  .failed .pack {
    stroke: var(--danger);
  }
  @keyframes bob {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-4px);
    }
  }
  @keyframes pop {
    from {
      transform: scale(0.6);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }
</style>
