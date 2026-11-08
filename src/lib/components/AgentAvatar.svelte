<script lang="ts">
  import type { Accent, AvatarVariant } from '../domain/types'
  let {
    accent,
    variant,
    status,
    iconKey = 'neutral',
    reducedMotion = false,
  }: {
    accent: Accent
    variant: AvatarVariant
    status: string
    iconKey?: string
    reducedMotion?: boolean
  } = $props()
  const active = $derived((status === 'thinking' || status === 'reading') && !reducedMotion)
</script>

<svg
  class="avatar"
  class:active
  data-accent={accent}
  data-icon={iconKey}
  viewBox="0 0 100 110"
  aria-hidden="true"
>
  <ellipse cx="50" cy="101" rx="32" ry="7" fill="#101c32" opacity=".28" />
  <g class="crew">
    <ellipse cx="36" cy="95" rx="10" ry="6" class="pack" />
    <ellipse cx="64" cy="95" rx="10" ry="6" class="pack" />
    <rect x="17" y="58" width="11" height="21" rx="5.5" class="pack" />
    <rect x="72" y="58" width="11" height="21" rx="5.5" class="pack" />
    <rect x="26" y="30" width="48" height="62" rx="22" class="body" />
    <path
      d="M36 45Q37 32 50 31"
      fill="none"
      stroke="#fff"
      stroke-opacity=".22"
      stroke-width="5"
      stroke-linecap="round"
    />
    <rect x="33" y="44" width="34" height="24" rx="12" fill="#f2f8ff" stroke="#1b2941" stroke-width="3" />
    <circle cx="43" cy="55" r="3.5" fill="#16283f" />
    <circle cx="57" cy="55" r="3.5" fill="#16283f" />
    <path
      d="M46 61Q50 64.5 54 61"
      fill="none"
      stroke="#16283f"
      stroke-width="2.5"
      stroke-linecap="round"
    />
    <rect x="44" y="76" width="12" height="6" rx="3" fill="#fff" fill-opacity=".45" />
    {#if variant === 'antenna'}<path d="M50 30L46 14" stroke="#17243b" stroke-width="4" /><circle
        cx="45"
        cy="10"
        r="5"
        fill="#f9d083"
        stroke="#17243b"
        stroke-width="3"
      />{:else if variant === 'square'}<path
        d="M37 31L41 21H59L63 31"
        fill="#4b5776"
        stroke="#17243b"
        stroke-width="3"
      />{/if}
  </g>
  {#if status === 'submitted'}<circle
      cx="83"
      cy="20"
      r="12"
      fill="#b0e9c9"
      stroke="#223953"
      stroke-width="2"
    /><path
      d="M77 20L81 24L89 16"
      fill="none"
      stroke="#285a4b"
      stroke-width="3"
      stroke-linecap="round"
    />{:else if status === 'failed'}<circle cx="84" cy="20" r="11" fill="#ffd6c9" /><path
      d="M84 14V20M84 24V25"
      stroke="#9d3c41"
      stroke-width="3"
    />{:else if active}<g fill="#bcefe5"
      ><circle cx="75" cy="10" r="2" /><circle cx="84" cy="10" r="2" /><circle
        cx="93"
        cy="10"
        r="2"
      /></g
    >{/if}
</svg>

<style>
  .avatar {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
    --suit: #8b80d9;
  }
  .body,
  .pack {
    fill: var(--suit);
    stroke: #1b2941;
    stroke-width: 4;
    stroke-linejoin: round;
  }
  .pack {
    filter: brightness(0.8);
  }
  .avatar[data-accent='peach'] {
    --suit: #e9a880;
  }
  .avatar[data-accent='sage'] {
    --suit: #6ac6ac;
  }
  .avatar[data-accent='sky'] {
    --suit: #77b4e4;
  }
  .avatar[data-icon='grok'] {
    --suit: #9a91d3;
  }
  .avatar[data-icon='anthropic'] {
    --suit: #eaa780;
  }
  .avatar[data-icon='openai'] {
    --suit: #68c2ad;
  }
  .avatar[data-icon='google'] {
    --suit: #7dabf0;
  }
  .avatar[data-icon='copilot'] {
    --suit: #a894ec;
  }
  .avatar[data-icon='neutral'] {
    --suit: #f2c94c;
  }
  .active .crew {
    animation: think 1.8s ease-in-out infinite;
    transform-origin: 50% 100%;
  }
  @keyframes think {
    50% {
      transform: translateY(-3px) rotate(2deg);
    }
  }
</style>
