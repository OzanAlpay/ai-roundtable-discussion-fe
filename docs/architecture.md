# Architecture

```text
Svelte components
       ↓ user intents / ↑ selected state
RoundtableController + pure reducers/selectors
       ↓ typed methods / ↑ validated snapshots and events
RoundtableApi interface
       ├── MockRoundtableApi (in-memory browser simulation)
       └── HttpSseRoundtableApi (client-only, future API contract)
```

## Ownership

| Layer | Owns | Must not own |
|---|---|---|
| Components | Presentation, a11y, local form widgets | Orchestration, fetch/EventSource, mock fixtures |
| `RoundtableController` | Pending ops, subscription lifecycle, snapshot reconciliation, draft/prefs | Scheduling agent work |
| Domain reducer/selectors | Validation, projection, derived read models | Timers, network |
| `MockRoundtableApi` | Simulated barrier, retries, exclusion, fixtures | UI state |
| `HttpSseRoundtableApi` | HTTP/SSE transport, reconnect backoff, SSE parse | Fabricating domain success |

Adapter selection happens only in `createRoundtableApi.ts` from `VITE_ROUNDTABLE_MODE`.

## Run state vs view state

- **Authoritative run state** comes from adapter snapshots/events (`queued` → `round_active` → `round_blocked` / `between_rounds` → terminal).
- **Local view phase** is separate: `setup` | `submitting` | `viewing` | `create_error`.
- **Connection state** is separate from agent failure. A lost stream does not fail a participant.

Components never advance rounds because a counter hits a threshold. They render adapter state.

## Where a future backend connects

1. Implement the endpoints in `docs/backend-contract.md`.
2. Set `VITE_ROUNDTABLE_MODE=http` and `VITE_ROUNDTABLE_API_BASE_URL`.
3. Keep office/transcript components unchanged; adapt transport only if the wire format differs.
