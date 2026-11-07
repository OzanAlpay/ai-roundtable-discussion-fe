<script lang="ts">
  interface Props {
    meetingState: 'idle' | 'active' | 'blocked' | 'completed'
    questionExcerpt: string
    roundLabel: string
    progressLabel: string
    tableWidthFactor?: number
  }
  let {
    meetingState,
    questionExcerpt,
    roundLabel,
    progressLabel,
    tableWidthFactor = 1,
  }: Props = $props()
</script>

<div class="backdrop" data-state={meetingState} aria-hidden="true">
  <div class="wall"></div>
  <div class="board">
    <div class="board-title">Meeting board</div>
    <div class="board-q">{questionExcerpt}</div>
    <div class="board-meta">{roundLabel} · {progressLabel}</div>
  </div>
  <div class="plant">
    <div class="pot"></div>
    <div class="leaf a"></div>
    <div class="leaf b"></div>
  </div>
  <div class="floor"></div>
  <div class="light"></div>
  <div class="table" style={`--tw:${tableWidthFactor}`}>
    <div class="table-top"></div>
    <div class="table-edge"></div>
    <div class="table-shadow"></div>
  </div>
</div>

<style>
  .backdrop {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: var(--radius-card);
    background: linear-gradient(180deg, #fbf8f2 0%, #f3eee5 48%, #e7e0d4 100%);
  }
  .wall {
    position: absolute;
    inset: 0 0 38% 0;
    background:
      linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent),
      repeating-linear-gradient(
        90deg,
        rgba(35, 49, 58, 0.015) 0 2px,
        transparent 2px 28px
      );
  }
  .board {
    position: absolute;
    top: 8%;
    left: 50%;
    transform: translateX(-50%);
    width: min(420px, 70%);
    background: #f7faf7;
    border: 1px solid #cfd8cf;
    border-radius: 12px;
    padding: 0.65rem 0.85rem;
    box-shadow: inset 0 0 0 4px #e7efe7;
  }
  .board-title {
    font-size: 0.7rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .board-q {
    font-size: 0.92rem;
    font-weight: 600;
    margin-top: 0.2rem;
  }
  .board-meta {
    margin-top: 0.35rem;
    font-size: 0.78rem;
    color: var(--accent);
  }
  .plant {
    position: absolute;
    left: 6%;
    bottom: 34%;
    width: 40px;
    height: 70px;
  }
  .pot {
    position: absolute;
    bottom: 0;
    left: 8px;
    width: 24px;
    height: 20px;
    background: #c9856a;
    border-radius: 2px 2px 8px 8px;
  }
  .leaf {
    position: absolute;
    width: 18px;
    height: 28px;
    background: #6f9b78;
    border-radius: 80% 0 80% 0;
  }
  .leaf.a {
    left: 4px;
    bottom: 18px;
    transform: rotate(-25deg);
  }
  .leaf.b {
    left: 16px;
    bottom: 22px;
    transform: rotate(20deg);
  }
  .floor {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 38%;
    background: linear-gradient(180deg, #ebe4d8, #ddd4c5);
  }
  .light {
    position: absolute;
    left: 50%;
    top: 42%;
    width: 55%;
    height: 34%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    pointer-events: none;
    transition: background 200ms ease;
  }
  .backdrop[data-state='idle'] .light {
    background: radial-gradient(circle, rgba(255, 248, 230, 0.55), transparent 70%);
  }
  .backdrop[data-state='active'] .light {
    background: radial-gradient(circle, rgba(220, 234, 244, 0.7), transparent 70%);
  }
  .backdrop[data-state='blocked'] .light {
    background: radial-gradient(circle, rgba(248, 226, 212, 0.75), transparent 70%);
  }
  .backdrop[data-state='completed'] .light {
    background: radial-gradient(circle, rgba(220, 233, 220, 0.8), transparent 70%);
  }
  .table {
    position: absolute;
    left: 50%;
    top: 58%;
    width: calc(46% * var(--tw, 1));
    height: 22%;
    transform: translate(-50%, -50%);
  }
  .table-top {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, #e8c49a, var(--wood) 55%, var(--wood-edge));
    border: 2px solid color-mix(in srgb, var(--wood-edge) 80%, #000);
  }
  .table-edge {
    position: absolute;
    left: 4%;
    right: 4%;
    bottom: -6%;
    height: 18%;
    border-radius: 50%;
    background: color-mix(in srgb, var(--wood-edge) 85%, #6b4a2c);
    z-index: -1;
  }
  .table-shadow {
    position: absolute;
    left: 8%;
    right: 8%;
    bottom: -18%;
    height: 24%;
    border-radius: 50%;
    background: rgba(35, 49, 58, 0.16);
    filter: blur(6px);
    z-index: -2;
  }
</style>
