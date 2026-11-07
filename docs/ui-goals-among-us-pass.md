# UI goals — Among Us office pass

Goals for a frontend-only visual pass on Copilot Roundtable. Domain, mock API, and HTTP adapter behavior stay intact; mock start/flow must keep working.

## North star

A playful **Among Us–inspired meeting office**, not a dashboard. Cute original crewmate-like agents (no ripped game assets), bold readable silhouettes, warmer depth, and a clear meeting light over a richer oval table.

## Ship goals

1. **Crewmate agents** — Original SVG/CSS “crewmate” figures with bold silhouettes, simple visors/backpacks, and light status motion (thinking bob, submitted cue). Prefer SVG/CSS; PixiJS only if it clearly helps (default: skip).
2. **Richer office + table** — Always-on scene with floor, wall, plant, whiteboard, oval wood table, and warmer meeting light that reacts to idle / active / blocked / completed.
3. **Fixed 8 chairs** — Render **8 chairs every time**. Map the selected **2–6** participants onto a pleasant subset of those chairs; empty chairs stay visible and empty. Do **not** invent chair count from participant count (user override of the earlier 2–6 seats brief).
4. **Provider-distinct agents** — Demo providers OpenAI, Grok/xAI, Anthropic, Google, plus Copilot/demo where still in catalog: color, silhouette accent, and badge so they are instantly distinguishable.
5. **Layout** — Meeting Setup sits **below** the meeting room (not a primary side column). After the meeting starts, **hide/remove** the setup GUI and show run controls / status / transcript instead.
6. **Polish** — Seat labels, status, and mobile/stack behavior stay readable under the new composition (compact labels on small viewports; participant list still available on mobile).

## Non-goals

- No backend changes; mock + HTTP adapter contracts unchanged.
- No copyrighted Among Us assets or trademarked logos as marks — original lettermarks / shapes only.
- No PixiJS dependency unless a concrete need appears during implementation.

## Verify

- `npm run check` and `npm test` pass.
- Mock home: 8 chairs visible in setup; Start roundtable still works; setup panel disappears after start.
- Screenshots: `office-amongus-desktop.png`, `office-amongus-setup-below.png` in Project media.
- Dev server: `http://127.0.0.1:5173/`.
