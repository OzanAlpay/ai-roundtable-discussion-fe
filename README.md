# Copilot Roundtable (frontend demo)

Browser-only Svelte 5 + TypeScript + Vite app where illustrated agents sit around an office table, answer independently, wait at a synchronization barrier, then reconsider from the same published snapshot.

**No accounts, secrets, Copilot SDK, or application backend.** The default transport is an in-browser `MockRoundtableApi`.

## Requirements

- Node.js 20+ (developed on Node 22)
- npm 10+

## Quick start

```bash
npm install
npm run dev
```

Open the printed local URL (default `http://localhost:5173`). Leave **VITE_ROUNDTABLE_MODE=mock**.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run check` | `svelte-check` + `tsc` |
| `npm test` | Vitest unit/contract tests |
| `npm run test:e2e` | Playwright browser smoke (starts dev server) |

## Demo scenarios

Use **Demo scenarios** in the setup column (mock mode only):

- Healthy two rounds — mind-change + preserved disagreement
- Three-round reversal
- Slow participant
- Timeout then retry
- Failure then exclusion
- Insufficient participants (exclusion rejected)
- Cancellation
- Disconnect / reconnect and malformed/gapped (covered mainly in tests)

## Adapter configuration

Public env only (see `.env.example`):

```bash
VITE_ROUNDTABLE_MODE=mock   # or http
VITE_ROUNDTABLE_API_BASE_URL=/api/v1
```

- `mock` (default): in-memory browser simulation
- `http`: client-only HTTP/SSE adapter. With no backend it shows a clear connection error and never invents success.

Composition root: `src/lib/api/createRoundtableApi.ts`. Components never import transports.

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — ownership boundaries
- [`docs/backend-contract.md`](docs/backend-contract.md) — wire contract for a future service
- [`docs/manual-qa.md`](docs/manual-qa.md) — manual QA notes

## Limitations

- Responses are deterministic demo fixtures (or plainly labeled illustrative text for arbitrary questions).
- Active mock runs live in memory only; refresh restores the draft, not the meeting.
- No real models, auth, telemetry, or server routes.
