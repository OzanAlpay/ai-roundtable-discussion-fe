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
    <rect x="13" y="44" width="19" height="37" rx="9" class="pack" />
    <path
      d="M29 79V96Q29 101 36 101H43Q49 101 49 94V87H57V96Q57 101 64 101H72Q77 101 77 94V77"
      class="body"
    />
    <path d="M25 44Q25 19 51 19Q78 19 80 45V77Q79 88 70 88H36Q25 88 25 77Z" class="body" />
    <path
      d="M31 45Q31 26 50 25Q69 24 72 38"
      fill="none"
      stroke="#fff"
      stroke-opacity=".22"
      stroke-width="5"
      stroke-linecap="round"
    />
    <path
      d="M41 39Q45 34 66 35Q84 35 84 48V55Q83 65 65 66H48Q37 66 36 57V48Q36 42 41 39Z"
      fill="#162a43"
      stroke="#17243b"
      stroke-width="4"
    />
    <path d="M42 43Q47 39 65 40Q77 40 78 47V52Q66 57 41 54Z" fill="#a6e4ec" />
    <path d="M47 43H65" stroke="#e0fcff" stroke-width="4" stroke-linecap="round" />
    <rect x="44" y="76" width="16" height="5" rx="2.5" fill="#fff" fill-opacity=".45" />
    {#if variant === 'antenna'}<path d="M49 20L45 10" stroke="#17243b" stroke-width="4" /><circle
        cx="44"
        cy="8"
        r="5"
        fill="#f9d083"
        stroke="#17243b"
        stroke-width="3"
      />{:else if variant === 'square'}<path
        d="M35 21L39 13H66L70 23"
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
