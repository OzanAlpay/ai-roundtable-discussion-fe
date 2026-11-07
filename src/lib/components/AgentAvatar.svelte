<script lang="ts">
  import type { Accent, AvatarVariant } from '../domain/types'

  interface Props {
    accent: Accent
    variant: AvatarVariant
    status: string
    reducedMotion?: boolean
  }
  let { accent, variant, status, reducedMotion = false }: Props = $props()

  const thinking = $derived(status === 'thinking' || status === 'reading')
  const ready = $derived(status === 'submitted')
  const failed = $derived(status === 'failed')
</script>

<svg
  class="avatar"
  class:thinking={thinking && !reducedMotion}
  class:ready
  class:failed
  viewBox="0 0 64 64"
  width="64"
  height="64"
  aria-hidden="true"
  data-accent={accent}
  data-variant={variant}
>
  <ellipse cx="32" cy="54" rx="16" ry="4" fill="rgba(35,49,58,0.12)" />
  {#if variant === 'antenna'}
    <path d="M32 10 V18" stroke="var(--ink)" stroke-width="2" />
    <circle cx="32" cy="8" r="3" fill="var(--accent)" />
  {/if}
  <rect
    x={variant === 'square' ? 14 : 12}
    y="16"
    width={variant === 'square' ? 36 : 40}
    height="34"
    rx={variant === 'square' ? 8 : 18}
    class="body"
  />
  <circle cx="24" cy="30" r="3.2" fill="var(--ink)" />
  <circle cx="40" cy="30" r="3.2" fill="var(--ink)" />
  <path d="M24 40 Q32 46 40 40" fill="none" stroke="var(--ink)" stroke-width="2" stroke-linecap="round" />
  {#if thinking}
    <g class="dots">
      <circle cx="22" cy="12" r="2" />
      <circle cx="28" cy="8" r="2.4" />
      <circle cx="35" cy="10" r="1.8" />
    </g>
  {/if}
  {#if ready}
    <g class="note">
      <rect x="44" y="18" width="12" height="14" rx="2" fill="var(--surface)" stroke="var(--accent)" />
      <path d="M47 22 H53 M47 26 H51" stroke="var(--accent)" stroke-width="1.5" />
    </g>
  {/if}
</svg>

<style>
  .avatar {
    overflow: visible;
    transition: transform 180ms ease;
  }
  .body {
    fill: var(--fill, var(--sage));
    stroke: color-mix(in srgb, var(--ink) 35%, transparent);
    stroke-width: 1.5;
  }
  .avatar[data-accent='sage'] {
    --fill: var(--sage);
  }
  .avatar[data-accent='lavender'] {
    --fill: var(--lavender);
  }
  .avatar[data-accent='peach'] {
    --fill: var(--peach);
  }
  .avatar[data-accent='sky'] {
    --fill: var(--sky);
  }
  .dots circle {
    fill: var(--muted);
  }
  .thinking {
    animation: bob 1.4s ease-in-out infinite;
  }
  .ready .note {
    animation: pop 220ms ease-out;
  }
  .failed .body {
    stroke: var(--danger);
  }
  @keyframes bob {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-3px);
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
