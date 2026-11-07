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
  <div class="wall">
    <div class="window left"></div>
    <div class="window right"></div>
    <div class="shelf"></div>
  </div>

  <div class="board">
    <div class="board-frame">
      <div class="board-title">Meeting board</div>
      <div class="board-q">{questionExcerpt}</div>
      <div class="board-meta">{roundLabel} · {progressLabel}</div>
      <div class="markers">
        <span class="m red"></span>
        <span class="m blue"></span>
        <span class="m green"></span>
      </div>
    </div>
  </div>

  <div class="plant">
    <div class="leaf a"></div>
    <div class="leaf b"></div>
    <div class="leaf c"></div>
    <div class="pot"></div>
  </div>

  <div class="floor">
    <div class="rug"></div>
  </div>

  <div class="pendant">
    <div class="cord"></div>
    <div class="shade"></div>
  </div>
  <div class="light"></div>

  <div class="table" style={`--tw:${tableWidthFactor}`}>
    <div class="table-shadow"></div>
    <div class="table-edge"></div>
    <div class="table-top">
      <div class="grain"></div>
      <div class="inlay"></div>
    </div>
  </div>
</div>

<style>
  .backdrop {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: var(--radius-card);
    background: linear-gradient(180deg, #f3ebe0 0%, #eadfce 42%, #d9cbb6 100%);
  }
  .wall {
    position: absolute;
    inset: 0 0 36% 0;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.22), transparent 40%),
      repeating-linear-gradient(
        90deg,
        rgba(74, 58, 42, 0.04) 0 3px,
        transparent 3px 36px
      ),
      linear-gradient(180deg, #efe4d4, #e6d8c4);
  }
  .window {
    position: absolute;
    top: 10%;
    width: 11%;
    height: 28%;
    border-radius: 10px;
    border: 3px solid #c4b29a;
    background:
      linear-gradient(160deg, rgba(255, 255, 255, 0.55), transparent 40%),
      linear-gradient(180deg, #9ec8de, #cfe6f2);
    box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.35);
  }
  .window.left {
    left: 5%;
  }
  .window.right {
    right: 5%;
  }
  .window::after {
    content: '';
    position: absolute;
    inset: 0;
    background:
      linear-gradient(#c4b29a, #c4b29a) center/2px 100% no-repeat,
      linear-gradient(#c4b29a, #c4b29a) center/100% 2px no-repeat;
    opacity: 0.7;
  }
  .shelf {
    position: absolute;
    right: 7%;
    bottom: 8%;
    width: 9%;
    height: 4px;
    background: #b8956d;
    border-radius: 2px;
    box-shadow: 0 8px 0 -3px #8f6d48;
  }
  .board {
    position: absolute;
    top: 7%;
    left: 50%;
    transform: translateX(-50%);
    width: min(440px, 68%);
  }
  .board-frame {
    position: relative;
    background: #f4faf4;
    border: 3px solid #8fa88f;
    border-radius: 14px;
    padding: 0.7rem 0.9rem 0.85rem;
    box-shadow:
      inset 0 0 0 5px #e4efe4,
      0 8px 18px rgba(74, 58, 42, 0.12);
  }
  .board-title {
    font-size: 0.68rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 700;
  }
  .board-q {
    font-size: 0.95rem;
    font-weight: 700;
    margin-top: 0.2rem;
    line-height: 1.25;
  }
  .board-meta {
    margin-top: 0.35rem;
    font-size: 0.78rem;
    color: var(--accent);
    font-weight: 600;
  }
  .markers {
    position: absolute;
    right: 10px;
    bottom: -10px;
    display: flex;
    gap: 4px;
  }
  .m {
    width: 8px;
    height: 22px;
    border-radius: 3px;
  }
  .m.red {
    background: #d75a5a;
  }
  .m.blue {
    background: #4f7fb8;
  }
  .m.green {
    background: #4f9a6a;
  }
  .plant {
    position: absolute;
    left: 5.5%;
    bottom: 33%;
    width: 54px;
    height: 86px;
  }
  .pot {
    position: absolute;
    bottom: 0;
    left: 12px;
    width: 28px;
    height: 24px;
    background: linear-gradient(180deg, #d59a78, #b87352);
    border-radius: 3px 3px 10px 10px;
    box-shadow: inset 0 3px 0 rgba(255, 255, 255, 0.2);
  }
  .leaf {
    position: absolute;
    width: 22px;
    height: 34px;
    background: linear-gradient(140deg, #7fb989, #4f8f62);
    border-radius: 80% 0 80% 0;
  }
  .leaf.a {
    left: 4px;
    bottom: 22px;
    transform: rotate(-28deg);
  }
  .leaf.b {
    left: 18px;
    bottom: 28px;
    transform: rotate(18deg);
  }
  .leaf.c {
    left: 12px;
    bottom: 40px;
    width: 18px;
    height: 26px;
    transform: rotate(-4deg);
    background: linear-gradient(140deg, #8fcd98, #5aa06c);
  }
  .floor {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 38%;
    background:
      repeating-linear-gradient(
        90deg,
        rgba(74, 58, 42, 0.05) 0 18px,
        transparent 18px 36px
      ),
      linear-gradient(180deg, #e4d7c4, #d4c3ab);
  }
  .rug {
    position: absolute;
    left: 50%;
    bottom: 8%;
    width: 58%;
    height: 42%;
    transform: translateX(-50%);
    border-radius: 50%;
    background:
      radial-gradient(circle at 50% 45%, rgba(79, 143, 162, 0.18), transparent 62%),
      radial-gradient(circle at 50% 50%, #c9b79a, transparent 70%);
  }
  .pendant {
    position: absolute;
    left: 50%;
    top: 34%;
    transform: translateX(-50%);
    z-index: 1;
    pointer-events: none;
  }
  .cord {
    width: 3px;
    height: 28px;
    margin: 0 auto;
    background: #8a7460;
  }
  .shade {
    width: 54px;
    height: 18px;
    margin: 0 auto;
    border-radius: 4px 4px 14px 14px;
    background: linear-gradient(180deg, #f3e2b8, #e0bf74);
    box-shadow: 0 4px 10px rgba(224, 191, 116, 0.35);
  }
  .light {
    position: absolute;
    left: 50%;
    top: 48%;
    width: 62%;
    height: 40%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    pointer-events: none;
    transition: background 220ms ease, opacity 220ms ease;
  }
  .backdrop[data-state='idle'] .light {
    background: radial-gradient(circle, rgba(255, 236, 190, 0.55), transparent 68%);
  }
  .backdrop[data-state='active'] .light {
    background: radial-gradient(circle, rgba(186, 224, 242, 0.72), transparent 70%);
  }
  .backdrop[data-state='blocked'] .light {
    background: radial-gradient(circle, rgba(255, 196, 160, 0.78), transparent 70%);
  }
  .backdrop[data-state='completed'] .light {
    background: radial-gradient(circle, rgba(186, 226, 186, 0.78), transparent 70%);
  }
  .table {
    position: absolute;
    left: 50%;
    top: 58%;
    width: calc(48% * var(--tw, 1));
    height: 24%;
    transform: translate(-50%, -50%);
  }
  .table-top {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background:
      radial-gradient(circle at 32% 28%, #f0d2a8, #d7a56f 52%, #b57a45 100%);
    border: 3px solid #8f5e36;
    box-shadow: inset 0 0 0 6px rgba(255, 232, 198, 0.22);
    overflow: hidden;
  }
  .grain {
    position: absolute;
    inset: 0;
    background:
      repeating-radial-gradient(
        ellipse at 50% 50%,
        transparent 0 12px,
        rgba(110, 70, 35, 0.05) 12px 14px
      );
    opacity: 0.8;
  }
  .inlay {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 22%;
    height: 28%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    border: 2px solid rgba(255, 236, 210, 0.35);
    background: radial-gradient(circle, rgba(255, 236, 210, 0.2), transparent 70%);
  }
  .table-edge {
    position: absolute;
    left: 3%;
    right: 3%;
    bottom: -7%;
    height: 20%;
    border-radius: 50%;
    background: linear-gradient(180deg, #9a6538, #6f4528);
    z-index: -1;
  }
  .table-shadow {
    position: absolute;
    left: 6%;
    right: 6%;
    bottom: -20%;
    height: 28%;
    border-radius: 50%;
    background: rgba(74, 58, 42, 0.22);
    filter: blur(8px);
    z-index: -2;
  }
</style>
