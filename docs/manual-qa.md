# Manual QA checklist

## Screen sizes exercised

- Desktop ~1440×900 — office + setup column + transcript
- Laptop ~1024×768 — stacked when needed, readable seats
- Tablet ~768×1024 — controls below/beside room
- Mobile ~390×844 and 320px reflow — compact scene + participant list + full-width transcript

## Accessibility spot checks

- Keyboard: tab through setup, start, seat/list selection, transcript tabs (arrow keys), details dialog close, stop/export
- Focus rings visible on controls
- Demo labeling persistently visible in header/setup
- `prefers-reduced-motion` disables bobbing avatar motion via CSS
- Live region announces blocked/completed/cancelled
- Contrast: ink on canvas/surface; accent buttons use light text on `#3b6c59`

## Scenario checks

- [x] Healthy two rounds (automated + manual)
- [x] Timeout then retry (automated)
- [x] Insufficient participants / exclusion rejected (automated)
- [x] Cancellation (automated)
- [ ] Three-round reversal (manual recommended)
- [ ] Failure then exclusion with 3+ agents (manual recommended)
- [ ] Slow participant barrier visibility (manual recommended)

## Known issues / gaps

- Playwright e2e coverage is a smoke path; not every scenario is browser-automated yet.
- Provider badges use original lettermarks, not official logos.
- Illustrative responses for non-sample questions are clearly labeled but brief.
- Drawer focus trap is lightweight (Escape via Close button focus expected from user); full modal inert background not implemented.
- Automated axe scan not wired; rely on manual + semantic structure.

## Console

Dev/mock mode should remain free of unexplained errors. HTTP mode intentionally logs/surfaces connection failures when no backend exists.
