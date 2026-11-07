# Backend contract (proposed v1)

This frontend already implements a client-only adapter for the following contract. No server is shipped in this repository.

## Configuration

- `VITE_ROUNDTABLE_MODE=http`
- `VITE_ROUNDTABLE_API_BASE_URL=/api/v1` (public, no secrets)
- `credentials: 'omit'` on all requests
- No auth headers or login flows in v1 of this client

## Endpoints

| Method / path | Request | Success |
|---|---|---|
| `GET /catalog` | — | `200 Catalog` |
| `POST /runs` | `{ requestId, config }` | `201 RunSnapshot` |
| `GET /runs/:runId` | — | `200 RunSnapshot` |
| `POST /runs/:runId/commands` | `{ requestId, expectedRevision, command }` | `200 RunSnapshot` |
| `GET /runs/:runId/events?afterSeq=N` | SSE | `text/event-stream` |

Path IDs and query values must be encoded. JSON errors:

```json
{ "schemaVersion": 1, "error": { "code": "...", "message": "...", "retryable": true } }
```

Status mapping used by the client: `400/422` validation, `404` not found, `409` stale revision/conflict, `5xx`/network → unavailable.

## Domain types

Authoritative TypeScript types live in `src/lib/domain/types.ts` and runtime schemas in `src/lib/domain/schemas.ts`. Snapshots use `schemaVersion: 1`. Timestamps are UTC ISO strings; durations are milliseconds; round numbers are one-based.

## Commands

```ts
type RunCommand =
  | { type: 'cancel' }
  | { type: 'retry'; roundNumber: number; participantId: string }
  | { type: 'exclude'; roundNumber: number; participantId: string }
```

Retry/exclude are accepted only in `round_blocked`. Exclusion that would leave fewer than two possible successful participants must be rejected. Cancellation stops unfinished work; published rounds remain immutable.

## Events and sequencing

Every state-changing event includes the **full** `RunSnapshot` after the change. `revision` and `lastEventSeq` increment together by one, starting at 1. Event `seq` equals both. Heartbeats do not increment.

Create/command `requestId` values are idempotency keys. Same ID + same body returns the original result; same ID + different body is an error. Do not auto-retry mutating calls with a fresh ID.

## SSE framing

One stream per run:

```text
id: 12
event: roundtable
data: { ...RunEvent JSON... }

```

- `id` must equal payload `seq`
- `afterSeq` is an exclusive replay cursor; replay precedes live events
- Comment lines may heartbeats
- Client reconnects with bounded backoff (1s, 2s, 4s, 8s, capped 15s), stops after five failures, exposes Retry connection
- Before resuming after a gap: `GET` authoritative snapshot, replace if newer, subscribe after that sequence; if terminal, do not reopen the stream

## Failure policy (service-owned)

1. Logical synchronized `round.started` for all expected participants.
2. Round 1 independent; later rounds share the previous published snapshot only.
3. Barrier: publish only when every expected slot is successful or explicitly skipped, with ≥2 successes.
4. Failed attempts do not release the barrier; unresolved failures → `round_blocked`.
5. Published rounds are immutable; retries get new attempt IDs before publication.
6. Terminal states (`completed`, `cancelled`, `failed`) never resume.

## Agreement before connecting

Confirm schema version, idempotency semantics, SSE event name (`roundtable`), and whether unpublished partials are ever returned on cancelled runs (this client can display them under a labeled section when present on the snapshot).
