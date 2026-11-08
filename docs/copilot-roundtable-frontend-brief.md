# Copilot Roundtable — frontend implementation brief for Grok

**Deliverable:** a complete, polished, frontend-only Svelte/TypeScript application.  
**Specification date:** 8 November 2026.  
**Audience:** Grok implementing the frontend now; a developer connecting a backend later.

## 1. Your assignment

Build a browser application in which cute illustrated agents gather around an office table, independently answer an engineering question, and reconsider their positions after reviewing one another’s completed answers. The office scene must visualize actual discussion state. Full responses and changes of position must remain easy to read.

Deliver working frontend source, local assets, a deterministic browser mock, typed transport adapters, tests, and integration documentation. Do not stop at a design, static screenshot, or nonfunctional prototype. The application must be usable without accounts, secrets, an AI service, or a running application backend.

The core experience is **independent opinion → synchronization barrier → shared previous-round snapshot → reconsideration → comparison**. Agreement is not required. Clearly show when an agent changes its mind, why it changes, and which published argument influenced it.

### Strict scope boundary

Implement:

- Svelte 5 + TypeScript + Vite client application.
- Responsive illustrated office, setup controls, live statuses, transcripts, final comparison, and local exports.
- In-memory mock service running entirely in the browser.
- A replaceable typed API interface and client-only HTTP/SSE adapter, tested with fake transports.
- Proposed wire contracts and instructions for a future backend developer.

Do **not** implement:

- Any application server, API routes, serverless functions, database, or deployment infrastructure.
- GitHub Copilot SDK integration, provider SDKs, real inference, real model discovery, or agent sessions.
- Credentials, API keys, token forms, authentication, login, authorization, or account management.
- Server-side rendering, backend orchestration, tools executing user code, repository access, or billing.
- A real moderator, facilitator, adaptive stopping logic, or generated synthesis.

Vite’s ordinary development/preview tooling and test runners are permitted; they are not an application backend. A “local mock backend” in this brief always means a browser module, never a localhost API service.

## 2. Decisions to use without further clarification

| Area | Required decision |
|---|---|
| UI stack | Svelte 5, TypeScript strict mode, Vite; no SvelteKit server |
| Styling | Scoped component CSS plus shared CSS variables; avoid a large UI framework |
| Participants | 2–6, default 3; allow the same model in different seats |
| Rounds | 2 by default; offer 2 or 3 total rounds |
| Round 1 | Independent opinions |
| Rounds 2–3 | Reconsideration using the immediately preceding published snapshot |
| Moderator | None in this version |
| Progression | Automatic after successful publication; no user “advance round” command |
| Failure policy | Block publication until failed participants are retried or explicitly excluded |
| Response streaming | Status events and whole completed responses; token streaming is not required |
| Initial transport | Mock, selected at the application composition root |
| Persistence | Draft/preferences only; active mock runs live in memory |
| Outcomes | Side-by-side comparison, unresolved disagreements, change explanations |
| Export | Markdown and versioned JSON, downloaded locally |

Use Svelte’s current runes APIs consistently, with `$state` for mutable view state and `$derived` for computed values. Keep domain logic in ordinary TypeScript. Consult the [official Svelte documentation](https://svelte.dev/docs/svelte/overview) for syntax, and the [Vite getting-started guide](https://vite.dev/guide/) for its Svelte TypeScript template. Select mutually compatible stable packages at implementation time, commit the lockfile, and record the actual Node/package versions used; this brief does not prescribe unverified patch versions.

## 3. Product and visual direction

### 3.1 The office is the primary visual

Create a warm, clean, slightly playful 2D office illustration. It should resemble a small team meeting, not a grid of generic dashboard cards. Use layered SVG and CSS with real HTML controls over or beside the scene. Do not use WebGL, a game engine, remote image generation, or a single flattened image for interactive elements.

Required scene elements:

- A warm off-white wall, subtle floor plane, plant, and whiteboard or wall monitor.
- A central oval wooden table with a shaded edge, soft contact shadow, and visible chairs.
- One small original robot/blob mascot per participant, seated around the table.
- A tiny laptop/notepad for each occupied seat; restrained decorative cups are optional.
- Provider badge, model label, agent name/role, and status associated with every seat.
- A shared board showing a short question excerpt, round name, and progress count.
- A subtle meeting light reflecting idle, active, blocked, and completed state.

Use rounded shapes, expressive but simple faces, calm outlines, soft shadows, and generous whitespace. Keep the transcript visually quieter and highly readable. Do not imitate a specific copyrighted mascot.

Suggested tokens, to be checked for contrast in their actual combinations:

```css
:root {
  --canvas: #f6f3ed;
  --surface: #ffffff;
  --ink: #23313a;
  --muted: #59636d;
  --line: #d8dcd8;
  --accent: #3b6c59;
  --wood: #d9ad7c;
  --wood-edge: #bb8653;
  --sage: #dce9dc;
  --lavender: #e8e1f2;
  --peach: #f8e2d4;
  --sky: #dceaf4;
  --danger: #a63838;
  --radius-card: 16px;
}
```

Use a locally available system sans-serif font; no remote font dependency. Body text should ordinarily be 16px with comfortable line height. Small badges must remain legible. Decorative colors must not carry meaning without text and/or icons.

### 3.2 Desktop composition

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Copilot Roundtable       DEMO · Simulated agents        New meeting  │
├───────────────────────────────────────────┬──────────────────────────┤
│ OFFICE                                    │ MEETING SETUP            │
│       [Question on wall board]            │ Question                 │
│                                           │ [multiline field       ] │
│        Agent A        Agent B             │ Participants             │
│        💻  ◉          ◉  💻                │ [Architect / model     ] │
│         ╭───────────────────╮             │ [Skeptic / model       ] │
│         │    oval table     │             │ [Pragmatist / model    ] │
│         ╰───────────────────╯             │ [+ Add participant]      │
│               💻  ◉                       │ Rounds: 2 / 3            │
│               Agent C                     │ [Start roundtable]       │
│                                           │                          │
│ Round 1 · Independent opinions · 2/3 ready │ During run: status/stop  │
├───────────────────────────────────────────┴──────────────────────────┤
│ Overview | Round 1 | Round 2 | Comparison | Activity                 │
│ Readable responses, revision reasons, unresolved disagreements       │
└──────────────────────────────────────────────────────────────────────┘
```

The glyphs above indicate composition only; create cohesive SVG mascots in the app. At approximately 1280px and above use a flexible room area and a 320–380px setup/detail column, with transcript below. Allow vertical page scrolling rather than compressing everything into a fixed viewport.

At tablet sizes stack the controls below or beside the room as space permits. At 320–767px use a compact overview scene plus a readable ordered participant list, stacked setup controls, and full-width transcript. Do not shrink desktop labels into illegibility. The mobile list and scene must reflect the same state and selection.

### 3.3 Dynamic seating

Create one pure `getSeatLayout(count, sceneMode)` function returning normalized seat positions, front/back layer, orientation, and label anchor. Support every count from 2 through 6, not only the default three. Prefer tuned layouts over a naive circle that causes label collisions.

- 2: opposite seats, balanced composition.
- 3: two rear seats and one front seat.
- 4: two rear and two front seats.
- 5: two rear, two side, and one front seat.
- 6: two rear, two side, and two front seats; slightly wider table.

Preserve participant order as seat order and key DOM elements by participant ID. Adding/removing seats is permitted only in setup. Rear agents render behind the tabletop; front agents render in front. Chairs and avatars must look seated, with coherent occlusion. Reserve label space independently of avatar art. Truncate very long visible labels only when a full accessible name and a way to read the full label remain available.

Use short 150–250ms seat transitions, a restrained typing/thinking loop, a brief reading cue, and a completed-response note marker. A mind change may briefly pulse its badge. Animation must reflect state and must never determine state. Disable nonessential movement for reduced-motion preference. Sound is out of scope.

### 3.4 Provider and model identity

Separate the service providing access from the model family. A future gateway could expose models from several vendors; do not assume “Copilot” and a model vendor are interchangeable.

A badge may read `Copilot · Example GPT`, while another reads `Anthropic · Example Claude`. All initial catalog entries are explicitly demo fixtures, with IDs such as `demo-copilot`, `demo-gpt`, and `demo-claude`. They do not assert current availability or entitlement.

Provide a local `ProviderBadge` mapping from catalog `iconKey` to an SVG or lettermark. Use original labeled lettermarks if official logo assets are unavailable; never hotlink logos or claim invented icons are official. Unknown providers receive a neutral icon plus their textual name. Keep attribution/license notes for any third-party asset included.

## 4. Screens and interactions

### 4.1 Setup

Show a useful default example: “Should we replace our current frontend state-management library?” Preselect Architect, Skeptic, and Pragmatist with different demo models. The demo label must be persistently visible.

Controls:

- Question: required after trimming; 20–8,000 characters; visible counter and inline validation.
- Participants: 2–6; add, remove, edit name, provider, model, role, and accent.
- Name: required, 1–40 characters. IDs, not names, identify participants; duplicate names get a distinguishing visible seat number.
- Roles: Architect, Skeptic, Pragmatist, Performance reviewer, Product thinker, or Custom.
- Role instruction: editable text, up to 1,000 characters; Custom requires nonempty instructions.
- Model selector filtered by selected provider. Changing provider clears an invalid model selection.
- Rounds: 2 or 3 total, with plain explanations.
- Timeout: an advanced setting, 10–120 seconds per participant attempt, default 30.
- Start button with validation; immediately enter a local submitting state to prevent double starts.

Changing setup updates the scene immediately. Capture a cloned immutable configuration when the run is created. Active discussions cannot be edited. “New meeting” copies settings to a new draft only after terminal state; to leave an active run, explicitly offer cancel-and-create-new or stay. No hidden background mock meetings.

### 4.2 Live meeting

Show the current round, elapsed duration, each participant’s status, and “N of M responses ready.” Status text may include Waiting, Thinking, Reading previous round, Ready—waiting for others, Failed, Timed out, and Excluded.

When a participant submits, show its ready marker but keep current-round response text concealed until publication. This makes the barrier clear to the user. After the barrier, reveal the whole round together. UI visibility is not the enforcement mechanism for agent isolation; the mock service and future backend own that rule.

A persistent Stop button requests cancellation. While pending show “Stopping…” and do not claim cancellation until acknowledged by authoritative state. Keep all published material readable during work and after errors. Selecting a seat opens the same participant detail available from the accessible list.

### 4.3 Transcript and outcome

Use Overview, one tab per configured round, Comparison, and Activity. Future-round tabs may show “Not started”; never fabricate empty completed responses.

Each published response displays author/provider/model, role, position, concise rationale, supporting points, concerns, questions, self-reported confidence, and elapsed time if provided. Display response text as text or safely rendered Markdown with raw HTML disabled. Never execute scripts, load remote images, or render unsanitized `{@html}` from response content.

Comparison includes:

- Initial position and latest published position per participant.
- Changed/Unchanged/Unknown based on explicit response metadata, not text similarity.
- The reason for the latest revision and links to valid earlier responses that influenced it.
- A per-round position history for three-round meetings, including reversals.
- Missing/failed/excluded labels rather than manufactured answers.

“Changed since the previous round” and “different from the initial opinion” are distinct concepts. Show the supplied revision flag for the former. For the latter show the actual initial/final labels side by side; do not infer semantic equivalence from string matching.

Do not produce an invented consensus, numeric confidence average, or recommendation. A deterministic overview can count responses and revisions. Show scripted agreement/disagreement highlights only when supplied by the demo fixture and label them as demo content; otherwise let the individual positions speak for themselves. Optional generated synthesis and moderator controls are deferred, with no dead UI toggles.

Activity is a concise user-facing record of starts, publication, failures, retries, exclusion, reconnection, and completion. Keep developer diagnostics separate from the ordinary flow.

## 5. Discussion semantics: mandatory invariants

1. **Logical synchronized start.** One `round.started` event establishes a round for all active participants. This means a common phase and input snapshot, not identical completion times or exact simultaneous network execution.
2. **Round 1 independence.** Its input is the question plus each participant’s own configured role. There is no shared current-round or previous-round response input.
3. **Immutable input.** Every participant in round N > 1 receives the exact same published snapshot from round N−1, with access to its own prior public responses. No current-round answer can enter another participant’s input.
4. **Barrier.** A round cannot be published until every expected participant has a successful response or an explicitly accepted exclusion, with at least two successful responses.
5. **No frontend authority.** Components and stores never advance rounds because a counter reaches a threshold. They display events. Only the mock service simulates orchestration now; the future backend owns it later.
6. **No rewriting history.** A published round and its responses never change. Retries occur only before publication and have distinct attempt IDs.
7. **No forced agreement.** Reconsideration can change a position, refine its rationale, or maintain disagreement.
8. **Public arguments only.** Responses contain user-facing explanations, not private reasoning traces, hidden prompts, or hidden chain-of-thought.
9. **No timer authority in the UI.** Displayed elapsed time does not mark a timeout or release a barrier. Timeout decisions arrive from the adapter’s service.
10. **Terminal means terminal.** Completed, cancelled, and failed runs cannot resume. A new meeting gets a new ID.

### 5.1 Failure and retry policy

A failed attempt does not release the barrier. Other attempts may finish. When all current attempts settle and at least one unresolved failure remains, enter `round_blocked`.

Offer Retry for a retryable failed participant and Exclude for a failed participant. Commands are accepted only in `round_blocked`; disable them while work remains in flight. Retry creates a new attempt for that participant using the same immutable round input. Successful peers do not rerun. Preserve failed attempts in history.

Exclusion applies to the remainder of the meeting. It is explicit, visible, and irreversible within that run. The current round keeps a skipped slot and later rounds omit that participant from their expected IDs. Reject an exclusion that would leave fewer than two possible successful participants. If a round cannot obtain two successes, keep it blocked with retry where allowed and Stop available; do not falsely complete or spin forever.

Once every slot is successful or skipped and at least two are successful, publish atomically. The published snapshot includes skipped slots so the missing contribution is visible. Later rounds use only successful responses as peer arguments while preserving the exclusion metadata.

Cancellation stops mock timers, retains completed published rounds, and marks unfinished attempts cancelled. Submitted but unpublished responses may be inspected only under a clearly labeled “Unpublished partial results” section and must never appear as a published round or final consensus. A cancellation/completion race resolves according to the service’s authoritative terminal snapshot.

## 6. Architecture and ownership

```text
Svelte components
       ↓ user intents / ↑ selected state
Application controller + pure reducers/selectors
       ↓ typed methods / ↑ validated snapshots and events
RoundtableApi interface
       ├── MockRoundtableApi (in-memory browser simulation)
       └── HttpSseRoundtableApi (client-only, future API contract)
```

Inject one adapter at startup. Components must not import mock fixtures, call `fetch`, construct `EventSource`, know endpoint URLs, or refer to provider SDK types. No conditional mock/live branches scattered through the view. Adapter selection belongs in `createRoundtableApi.ts`.

Suggested structure:

```text
src/
  App.svelte
  main.ts
  lib/
    domain/
      types.ts
      schemas.ts
      invariants.ts
      reducer.ts
      selectors.ts
    api/
      RoundtableApi.ts
      createRoundtableApi.ts
      httpSseRoundtableApi.ts
      transportError.ts
      mock/
        mockRoundtableApi.ts
        scheduler.ts
        catalog.ts
        scenarios.ts
        fixtures.ts
    state/
      roundtable.svelte.ts
      draftPersistence.ts
    components/
      AppHeader.svelte
      SetupPanel.svelte
      ParticipantEditor.svelte
      ModelPicker.svelte
      RoundControls.svelte
      RoundtableRoom.svelte
      OfficeBackdrop.svelte
      Roundtable.svelte
      AgentSeat.svelte
      AgentAvatar.svelte
      ProviderBadge.svelte
      ParticipantList.svelte
      RoundProgress.svelte
      ConnectionBanner.svelte
      TranscriptTabs.svelte
      ResponseCard.svelte
      ParticipantDetails.svelte
      ComparisonView.svelte
      ActivityLog.svelte
      ExportMenu.svelte
      DemoScenarioPicker.svelte
    scene/getSeatLayout.ts
    export/markdown.ts
    export/json.ts
    styles/tokens.css
    assets/
  tests/
    unit/
    component/
    contract/
e2e/
docs/
  backend-contract.md
  architecture.md
  manual-qa.md
```

Small adjustments are acceptable; preserve the boundaries. Keep the controller testable without mounting the office. Use one centralized run state; derive counts, selected-response views, and comparison rows rather than duplicating them in components. Keep draft state, run state, transport health, and local UI preferences separate.

## 7. Typed domain contract

Use the following as the baseline public contract. You may refine internal representations, but keep documented wire semantics stable. All timestamps are UTC ISO strings, durations are milliseconds, IDs are opaque strings, and round numbers are one-based. Run TypeScript with strict settings and validate external JSON at runtime using a small schema library or explicit validators. Type assertions alone are not validation.

```ts
export type Id = string;
export type RoundNumber = number;
export type RunStatus =
  | 'queued' | 'round_active' | 'round_blocked' | 'between_rounds'
  | 'completed' | 'cancelled' | 'failed';

export interface Provider {
  id: Id;
  name: string;
  iconKey: string;
}
export interface Model {
  id: Id;
  providerId: Id;
  name: string;
  family?: string;
  availability: 'available' | 'unavailable';
  unavailableReason?: string;
  isDemo: boolean;
}
export interface Catalog {
  schemaVersion: 1;
  providers: Provider[];
  models: Model[];
}
export interface ParticipantConfig {
  id: Id;
  name: string;
  providerId: Id;
  modelId: Id;
  roleLabel: string;
  roleInstruction: string;
  accent: 'sage' | 'lavender' | 'peach' | 'sky';
  avatarVariant: 'round' | 'square' | 'antenna';
}
export interface DiscussionConfig {
  question: string;
  participants: ParticipantConfig[];
  totalRounds: 2 | 3;
  attemptTimeoutMs: number;
}
export interface ResponseRef {
  roundNumber: RoundNumber;
  participantId: Id;
  responseId: Id;
}
export interface Opinion {
  id: Id;
  participantId: Id;
  roundNumber: RoundNumber;
  position: string;
  rationale: string;
  supportingPoints: string[];
  concerns: string[];
  openQuestions: string[];
  confidence: 'low' | 'medium' | 'high' | 'unspecified';
  revision: {
    kind: 'initial' | 'changed' | 'unchanged' | 'unknown';
    reason: string | null;
    influencedBy: ResponseRef[];
  };
  submittedAt: string;
}
export interface PublicError {
  code: string;
  message: string;
  retryable: boolean;
}
export interface Attempt {
  id: Id;
  number: number;
  status: 'reading' | 'thinking' | 'succeeded' | 'failed' | 'cancelled';
  startedAt: string;
  endedAt: string | null;
  error: PublicError | null;
}
export interface RoundSlot {
  participantId: Id;
  status: 'pending' | 'reading' | 'thinking' | 'submitted'
    | 'failed' | 'skipped' | 'cancelled';
  attempts: Attempt[];
  response: Opinion | null;
}
export interface PublishedRound {
  id: Id;
  number: RoundNumber;
  publishedAt: string;
  responses: Opinion[];
  excludedParticipantIds: Id[];
}
export interface RoundState {
  number: RoundNumber;
  kind: 'independent' | 'reconsideration';
  status: 'active' | 'blocked' | 'published' | 'cancelled';
  inputSnapshotId: Id | null;
  expectedParticipantIds: Id[];
  slots: RoundSlot[];
  startedAt: string;
  published: PublishedRound | null;
}
export interface RunSnapshot {
  schemaVersion: 1;
  id: Id;
  revision: number;
  lastEventSeq: number;
  status: RunStatus;
  config: DiscussionConfig;
  // Frozen labels remain readable even if the catalog later changes.
  participantLabels: Array<{
    participantId: Id;
    providerName: string;
    modelName: string;
  }>;
  excludedParticipantIds: Id[];
  currentRoundNumber: RoundNumber | null;
  rounds: RoundState[];
  createdAt: string;
  updatedAt: string;
  endedAt: string | null;
  terminalError: PublicError | null;
}
```

Validation must enforce relationships, not just field types: participant IDs are unique; models belong to providers; expected IDs refer to configured participants; one slot per expected ID; submitted slots have matching opinions; response references point to existing earlier published responses; Round 1 has null input; later rounds reference the previous publication; no duplicate response IDs; a publication has at least two successful contributions and no unresolved slots. Round 1 revisions are `initial`; later revisions are not `initial`. Changed revisions require a reason. References are optional, because a change may be self-initiated.

For published rounds, `responses` is the canonical shared snapshot; it agrees with successful slots at publication and is never mutated. Deep-freeze fixture inputs in development/tests to catch accidental writes.

### 7.1 Events: full snapshots for a simple reliable MVP

Every state-changing event includes the full authoritative snapshot **after** the change. With at most six participants and three rounds, this is a deliberate simplicity tradeoff. Do not mix partial-patch and full-snapshot semantics. Do not stream token deltas in this version.

```ts
export type RunEventDetail =
  | { type: 'run.created' }
  | { type: 'round.started'; roundNumber: number }
  | { type: 'participant.updated'; roundNumber: number; participantId: Id }
  | { type: 'round.blocked'; roundNumber: number }
  | { type: 'participant.retried'; roundNumber: number; participantId: Id }
  | { type: 'participant.excluded'; roundNumber: number; participantId: Id }
  | { type: 'round.published'; roundNumber: number; snapshotId: Id }
  | { type: 'run.completed' }
  | { type: 'run.cancelled' }
  | { type: 'run.failed' };

export interface RunEvent {
  schemaVersion: 1;
  runId: Id;
  eventId: Id;
  seq: number;
  occurredAt: string;
  detail: RunEventDetail;
  snapshot: RunSnapshot;
}
export type ConnectionState =
  | 'connecting' | 'connected' | 'reconnecting' | 'offline' | 'closed';

export interface CommandContext {
  requestId: Id;
  expectedRevision: number;
}
export type RunCommand =
  | { type: 'cancel' }
  | { type: 'retry'; roundNumber: number; participantId: Id }
  | { type: 'exclude'; roundNumber: number; participantId: Id };

export interface RoundtableApi {
  getCatalog(signal?: AbortSignal): Promise<Catalog>;
  createRun(
    input: { requestId: Id; config: DiscussionConfig },
    signal?: AbortSignal
  ): Promise<RunSnapshot>;
  getRun(runId: Id, signal?: AbortSignal): Promise<RunSnapshot>;
  command(
    runId: Id,
    command: RunCommand,
    context: CommandContext,
    signal?: AbortSignal
  ): Promise<RunSnapshot>;
  subscribe(
    runId: Id,
    options: {
      afterSeq: number;
      onEvent: (event: RunEvent) => void;
      onConnection: (state: ConnectionState) => void;
      onError: (error: PublicError) => void;
    }
  ): () => void;
  dispose(): void;
}
```

Keep a single monotonic counter per run: each state-changing event increments both `revision` and `lastEventSeq` by one, starting at 1. Event `seq` equals both snapshot fields. HTTP create/command responses return the snapshot associated with their accepted operation; duplicate requests return their original result. The client ignores any older response if a newer event has already arrived. Heartbeats do not increment the counter.

Create and command request IDs are idempotency keys. Retrying a request after uncertain delivery uses the same ID and identical body. A deliberate new operation gets a new ID. Reusing an ID with a different body is an error. Do not automatically retry state-changing requests with a fresh ID. Abort of an HTTP request means the client stopped waiting; it does not prove that the operation was cancelled.

## 8. State machine and update rules

Keep server-like run status separate from local view state (`setup`, `submitting`, `viewing`, `create_error`) and connection state. Losing a stream does not mean an agent failed or the meeting stopped.

| Current run state | Trigger | Result / behavior |
|---|---|---|
| No run | Valid Start | Local submitting; call create once |
| `queued` | `round.started` | `round_active`; all expected slots start in one logical round |
| `round_active` | Participant progress/result | Update slots; stay active while other attempts run |
| `round_active` | All attempts settled, failures unresolved | `round_blocked`; reveal failure actions |
| `round_blocked` | Retry accepted | `round_active`; new attempt, same input snapshot |
| `round_blocked` | Exclusion accepted | Remain blocked or publish if barrier now satisfied |
| `round_active` / `round_blocked` | `round.published` | `between_rounds`; immutable publication visible |
| `between_rounds` | More rounds configured | Next `round.started`; `round_active` |
| `between_rounds` | Final round already published | `run.completed`; `completed` |
| Any nonterminal state | Cancellation accepted | `cancelled`; unfinished work stops |
| Any nonterminal state | Unrecoverable service failure | `failed`; preserve existing work |
| Any terminal state | New meeting | Fresh draft/new run ID; old history remains readable until replaced |

The mock service performs the transitions. The frontend reducer validates and projects snapshots, without scheduling the next round. Use exhaustive TypeScript switches with a `never` check. A final round may briefly pass through `between_rounds` before completion; do not start another round.

On each incoming snapshot/event:

1. Reject an unknown schema, wrong run ID, malformed relationships, or inconsistent sequence fields.
2. Ignore duplicate/stale sequences and callbacks from an old subscription generation.
3. For the next expected event, apply the authoritative snapshot atomically.
4. For a sequence gap, stop applying events, close the subscription, fetch a fresh snapshot, then subscribe after its sequence. Do not invent missed events.
5. Keep selection and scroll position where still valid. Never mutate previously published rounds.
6. After a terminal state, close the stream; do not allow a late active snapshot to resurrect the run.

HTTP snapshots may legitimately jump several sequences; they are complete resynchronization points. Reconcile only if newer than current state. On a new create, subscribe after the sequence returned by create so that replay catches any work occurring between creation and subscription.

## 9. Browser mock service

The mock implements exactly `RoundtableApi` and the same validation contract as HTTP/SSE. It owns an in-memory run registry, immutable input snapshots, event history, idempotency records, and cancellable scheduled work. This is a simulation dependency behind the interface, not production orchestration embedded in Svelte.

Use an injected clock/scheduler and seeded deterministic fixture selection. Tests advance fake time; avoid real sleeps and unseeded `Math.random`. Human demo mode can use 0.8–3 seconds per attempt with staggered completion; a slow fixture may approach the configured timeout. Capture question, role, and previous snapshot at round start, not when a timer later fires.

The mock must replay all stored events with `seq > afterSeq` before delivering newer live events, without a subscribe/replay race. Unsubscribe stops delivery to that observer; it does not cancel service work. Cancel stops that run’s work. Dispose releases all adapter-owned timers/listeners.

### Required demo scenarios

| Scenario | Observable outcome |
|---|---|
| Healthy two rounds | All complete; at least one changes mind and one maintains disagreement |
| Three-round reversal | A participant changes in Round 2 and revises again in Round 3; all history preserved |
| Slow participant | Early responders wait; no premature publication |
| Timeout then retry | Round blocks; retry succeeds with same round input and new attempt |
| Failure then exclusion | Exclude failed participant from a three-plus-person run; remaining agents continue |
| Insufficient participants | A failure in a two-person run cannot be bypassed with exclusion |
| Disconnect/reconnect | Service continues, client shows reconnecting, missing state recovers without duplicates |
| Cancellation | Timers stop, terminal state holds, published and partial results remain distinguished |
| Malformed/gapped event | Client detects it, resynchronizes or shows recoverable protocol error |

Expose scenario selection in a small “Demo scenarios” area before starting a meeting. Keep this outside the public discussion configuration; scenario injection is mock-only constructor/test setup. No test-only shortcuts in domain reducers. A fixed seed must yield the same results for the same scenario and configuration.

### Response fixture example

For the sample state-management question:

- Architect, Round 1: “Migrate”; maintenance could become simpler.
- Skeptic, Round 1: “Keep”; migration risk currently outweighs demonstrated benefit.
- Pragmatist, Round 1: “Investigate first”; establish evidence of pain and measurable criteria.
- Architect, Round 2: “Investigate first”; changed after Pragmatist’s missing-evidence argument, with a valid reference to that response.
- Skeptic, Round 2: “Keep”; unchanged, with a clear reason and remaining disagreement.
- Pragmatist, Round 2: “Investigate first”; unchanged, recommending a small evidence-gathering exercise.

Provide coherent fixtures for 2–6 participants and both round counts; never reference a seat that does not exist. For arbitrary questions, display plainly labeled illustrative responses rather than pretending real inference occurred. Do not reuse an unrelated sample answer as though it answers the user’s question.

## 10. Client-only HTTP and SSE adapter

Implement the client adapter now, but do not implement or start the endpoints below. They are the proposed version-1 contract for a future backend. The demo must never contact them.

```text
VITE_ROUNDTABLE_MODE=mock
VITE_ROUNDTABLE_API_BASE_URL=/api/v1
```

Only `mock` and `http` are valid mode values. These public configuration values contain no secrets. Default to mock. HTTP mode must show a helpful connection error if no service exists, without silently switching to fabricated results. Use dependency injection for `fetch`, the SSE parser, and the reconnect scheduler so the adapter can be tested offline.

### 10.1 Proposed endpoint mapping

| Method/path relative to base | Request | Success |
|---|---|---|
| `GET /catalog` | None | `200 Catalog` |
| `POST /runs` | `{ requestId, config }` | `201 RunSnapshot` |
| `GET /runs/:runId` | None | `200 RunSnapshot` |
| `POST /runs/:runId/commands` | `{ requestId, expectedRevision, command }` | `200 RunSnapshot` |
| `GET /runs/:runId/events?afterSeq=N` | SSE subscription | `text/event-stream` |

Encode path IDs and query values. JSON error body: `{ schemaVersion: 1, error: PublicError }`. Map 400/422 to validation, 404 to not found, 409 to stale revision or command conflict, and 5xx/network errors to service unavailability. Check response status and schema before accepting JSON. Bound HTTP waits and make aborts distinguishable from domain cancellation.

On 409, refresh the run and explain that its state changed; do not blindly reissue a now-invalid command. Pending commands disable the corresponding controls. Same-ID replay of an accepted command should return its original result even if its original expected revision is now old; this is a documented future-service requirement, simulated in the mock.

No credentials, auth headers, token parameters, or login flows are part of this adapter. Use same-origin URLs and `fetch` with `credentials: 'omit'` for both JSON requests and the SSE stream. Implement SSE using a fetch-stream reader and a tested parser. This is still standard SSE on the wire; a native `EventSource` is not required. Do not add authentication code.

### 10.2 SSE wire framing and lifecycle

Use one stream per run, not one per participant. Each state event has:

- `id:` the decimal sequence number.
- `event: roundtable`.
- `data:` a JSON-serialized `RunEvent`.
- A blank line ending the record.

SSE uses UTF-8 records, named events, event IDs, and blank-line delimiters; comment lines can act as heartbeats. Follow the [MDN SSE format and lifecycle documentation](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events). The fetch-stream reader must handle split UTF-8 characters, partial chunks, CRLF/LF lines, multiline data, comments, and incomplete final records; test these explicitly. Prefer a small established parser over an incomplete hand-written parser, but keep it behind the adapter.

The stream ID must equal payload `seq`; mismatch is a protocol error. Heartbeats carry no domain state. `afterSeq` is an exclusive replay cursor, and replay must precede new live events. Client-controlled reconnects always use the last applied sequence, not the last received-but-rejected one.

Implement one reconnect owner. Reconnect with bounded backoff (for example 1s, 2s, 4s, 8s, capped at 15s), stop after five failed attempts, and expose Retry connection. Cleanup aborts/closes the stream and every retry timer.

On disconnect, keep the last confirmed state visible with “Connection lost; meeting status may be out of date.” A client stream outage must not timeout agents. Before resuming after a gap or reconnect, fetch the authoritative run snapshot, replace state if newer, and subscribe after that sequence. If the fetched run is terminal, do not open another stream. Resubscription must remain safe when more events occur between fetch and subscribe.

Unknown schema version or repeated malformed snapshots should stop automatic processing and show an actionable protocol error. Do not swallow it into an endless reconnect loop. Because the stream carries complete snapshots, UI history can be reconstructed even after old event history has expired. Activity entries reconstructed from snapshots need not invent exact missed event timestamps.

## 11. Components and state ownership

| Component/module | Responsibility |
|---|---|
| App shell | Adapter injection, initialization, global layout/error boundary |
| SetupPanel | Draft editing and field errors; emits Start intent |
| ParticipantEditor / ModelPicker | Catalog-driven choices and valid participant configuration |
| RoundtableRoom | Responsive scene, layout coordinates, visual layering |
| AgentSeat / AgentAvatar | Presentational identity and status; emits selection only |
| ProviderBadge | Local icon lookup and readable fallback |
| ParticipantList | Accessible linear alternative and mobile detail access |
| RoundProgress | Labels/counts derived from authoritative state |
| ConnectionBanner | Transport health and reconnect intent |
| TranscriptTabs / ResponseCard | Published text, round navigation, valid response references |
| ParticipantDetails | Full identity, attempt history, opinion history, retry/exclude intents |
| ComparisonView | Initial/latest positions and explicit revisions |
| ActivityLog | Concise event/snapshot-derived history |
| ExportMenu | Local Markdown/JSON downloads; no upload |
| Controller | Pending operations, adapter lifecycle, snapshot reconciliation |
| Reducer/selectors | Pure validation/projection and derived read models |

Use typed props and callback props. Avoid a global event bus. Do not use effects to replicate derived values or to infer barrier completion. Cleanup subscriptions on run changes and component disposal; guard asynchronous callbacks using the active run ID and subscription generation.

## 12. Persistence, exports, and privacy

Persist a versioned draft and UI preferences in browser storage. Provide “Clear saved draft.” Handle invalid JSON, unsupported versions, storage denial, and quota failures without breaking the app. Explain near persistence controls that the draft stays in this browser. Never persist credentials because none exist.

Do not persist running mock timers or imply they survive refresh. On a full reload, restore the draft and explain that the previous in-memory demo run is unavailable; do not recreate it as an active meeting. Completed results remain exportable while the page is open. Historical-run browsing and import are outside this version.

Export Markdown with the question, participants/provider/model identities, configuration, published round responses, revisions and references, exclusions/errors, and terminal/current status. An interrupted export must say “Incomplete meeting,” with unpublished material under a separate heading if included. Export JSON as `{ schemaVersion: 1, exportedAt, run }` using the authoritative snapshot. Escape Markdown syntax where user text becomes headings, tables, or links; do not corrupt code fences in response text. Use safe filenames, Blob downloads, and revoke object URLs.

No telemetry, analytics, external fonts, remote avatars, or third-party network calls in mock mode. Display public errors without raw stack traces or arbitrary server HTML.

## 13. Accessibility and responsive behavior

Target WCAG 2.2 AA behavior and verify it manually as well as with automated checks. This is an implementation target, not a claim of certification.

- All actions work with keyboard alone; no drag-only interaction.
- Use semantic buttons, forms, labels, headings, and a meaningful page landmark structure.
- Provide visible focus indicators and sufficiently large touch targets, aiming for 44×44 CSS pixels.
- Match DOM/focus order to a predictable participant order, independent of visual seat coordinates.
- Expose meaningful seat buttons or the participant list, without duplicate confusing tab stops. Decorative SVG is hidden from assistive technology.
- Use readable accessible names, such as “Architect, Example GPT via Copilot, ready, waiting for others.”
- Tabs support standard keyboard behavior and associated panels. Do not create inert elements styled as tabs.
- Dialog/drawer focus moves in on opening, stays appropriately contained for modal dialogs, closes with Escape, and returns to the invoking control.
- Announce round changes, blocked states, and completion via a polite live region. Do not announce every second or decorative animation frame.
- Do not move focus or scroll automatically when a new response arrives. Provide a visible new-results cue.
- Errors identify their fields via text and accessible descriptions; color alone is insufficient.
- Meet text and control contrast requirements; check actual combinations rather than assuming the suggested palette passes.
- Honor `prefers-reduced-motion`; motion never communicates information unavailable in text.
- At 200% zoom and 320px width, controls and reading panels reflow without page-level horizontal overflow. Long code/text can scroll inside its own labeled region.

## 14. Testing requirements

Use Vitest for domain/adapter tests, Svelte Testing Library or an equivalent Svelte-aware component setup, and Playwright for browser flows. The [official Svelte testing guide](https://svelte.dev/docs/svelte/testing) describes unit/component testing with Vitest. Favor behavioral assertions and accessible queries over snapshots of implementation details.

### 14.1 Domain and mock tests

- Every seat count 2–6 maps to valid, distinct positions and stable ordering.
- Config validation rejects invalid models, missing questions, duplicate IDs, unsupported rounds, and invalid limits.
- Round 1 has no peer input; each later attempt gets the same previous publication ID and content.
- The first finished participant cannot trigger publication or expose current-round text.
- Timeout blocks publication; retry preserves peers’ work and the frozen input.
- Exclusion affects current and future rounds, rejects fewer than two viable participants, and remains visible.
- Published snapshots are immutable; prior references remain resolvable.
- Two- and three-round scenarios terminate exactly once with no extra round.
- Stop clears scheduled work; late callbacks cannot resurrect a cancelled run.
- Duplicate create/command request IDs do not duplicate runs or retries; changed-body reuse is rejected.
- Retry attempt IDs and histories are distinct; cancellation and completion races are deterministic.

### 14.2 Adapter/reducer contract tests

Run reusable contract assertions against the browser mock and against the HTTP adapter using injected fake fetch/SSE transports. No real service is needed.

Cover:

- Correct routes, encoding, bodies, runtime schemas, and error normalization.
- Snapshot/event sequence equality, duplicate suppression, stale HTTP responses, and wrong-run rejection.
- Sequence gaps and reconnect recovery, including events between GET and resubscribe.
- Unsubscribe/dispose prevent callbacks and clean up timers/readers.
- Terminal snapshots suppress reconnects and stale events.
- Unsupported schemas, malformed JSON, invalid cross-references, and repeated protocol failure.
- SSE parsing across chunk boundaries and Unicode splits.
- Aborted requests do not falsely mean cancelled runs.
- One reconnect loop and one stream at a time; exhausted retries expose a user action.

### 14.3 Component and browser tests

- Add/remove/edit participants and provider-dependent model choices.
- Keyboard-only setup, selection, tabs, details, failure actions, and exports.
- Full healthy two-round flow and three-round history.
- Slow, retry, exclusion, insufficient-participant, cancellation, and reconnect scenarios.
- Current-round responses stay concealed until publication.
- Demo labeling remains visible, including exported results identifying simulated content.
- Refresh restores draft but does not claim to resume the in-memory run.
- Malicious HTML-like text renders harmlessly; long Unicode names/questions do not break layout.
- Screenshots at 1440×900, 1024×768, 768×1024, and 390×844; also verify 320px reflow.
- Inspect all counts 2–6 for overlapping avatars, clipped labels, layering errors, and unreadable status.
- Reduced-motion and automated accessibility checks, plus a manual focus/screen-reader spot check.

Use the injected clock to avoid flaky waits. Await visible conditions/events in browser tests. Assert mock mode makes no application API or provider requests; ordinary local asset loads are allowed.

## 15. Acceptance criteria

The implementation is complete only when all of the following can be demonstrated:

- [ ] A fresh install starts a working mock-only frontend without any account, secret, SDK, or backend.
- [ ] The main screen visibly resembles an illustrated office meeting around a physical table.
- [ ] Every supported participant count has coherent chairs, mascots, laptops, readable identities, and usable selection.
- [ ] Provider and model identities are separate, catalog-driven, and explicit demo data.
- [ ] Setup edits update seating and validate before starting; a double-click creates one run.
- [ ] Three sample agents produce independent opinions, wait at the barrier, and start reconsideration from the same completed snapshot.
- [ ] At least one fixture changes its mind with a reason/reference; another preserves disagreement.
- [ ] Current-round content is not revealed before publication or fed to same-round peers.
- [ ] Third-round behavior, failure/retry, exclusion, timeout, and cancellation follow the specified state machine.
- [ ] Counts/statuses come from adapter state, not decorative timers or inferred orchestration in components.
- [ ] Exclusion cannot turn a two-person meeting into a falsely successful one-person meeting.
- [ ] Reconnect and duplicate/stale events cannot duplicate responses or revive a terminal run.
- [ ] Mock and HTTP/SSE adapters implement the same interface, with no transport imports in components.
- [ ] HTTP mode reports missing backend clearly; no server code has been added.
- [ ] Full responses, initial/latest positions, revision history, and unresolved disagreements are readable.
- [ ] Markdown/JSON export works locally and distinguishes complete, incomplete, and unpublished material.
- [ ] Mobile, keyboard use, reduced motion, contrast, and focus behavior pass the specified checks.
- [ ] Type checking, tests, and production build pass; no unexplained console errors remain.
- [ ] README and backend-contract documentation let another developer connect a service without redesigning views.

## 16. Implementation order and handoff

Build in this order, completing the functional path before adding decorative polish:

1. Scaffold Svelte/TypeScript/Vite, strict checking, CSS tokens, and test tools.
2. Define runtime schemas, domain types, API interface, and state invariants.
3. Implement the deterministic mock and test the two-round barrier, retries, and cancellation.
4. Build setup, basic progress, transcript, and comparison against the injected interface.
5. Implement the illustrated office, dynamic seats, provider badges, and responsive list.
6. Add motion, details, accessibility, persistence, exports, and all failure/reconnect demos.
7. Implement/test the client-only HTTP/SSE adapter and document the proposed wire protocol.
8. Run automated checks, inspect responsive screenshots, fix issues, and prepare handoff notes.

Deliver these project artifacts:

- Complete source and local assets; dependency lockfile and `.env.example` containing only public nonsecret settings.
- README with install/run/build/check/test commands, Node version, demo scenarios, limitations, and adapter configuration.
- `docs/backend-contract.md` with the final implemented types, endpoint table, SSE framing, event order, cursor/replay behavior, idempotency, errors, and failure policy.
- `docs/architecture.md` showing ownership boundaries and where a future backend connects.
- `docs/manual-qa.md` recording tested screen sizes, accessibility checks, and remaining known issues.
- Meaningful unit/component/contract/browser tests and screenshot evidence of desktop/mobile layouts.

Provide package scripts equivalent to `dev`, `build`, `preview`, `check`, `test`, and `test:e2e`. Report the exact commands run and their real results. Do not claim a check passed if it was not run. Resolve essential acceptance failures; keep optional future features separate from unfinished requirements.

### Future backend connection checklist — documentation only

The later backend developer should be able to implement the documented catalog/create/read/command/event contract, own synchronization and immutable snapshot publication, preserve per-agent identity across rounds, enforce timeout/retry/exclusion policy, and return public structured opinions. They then select HTTP mode and configure the public API base URL. If their wire format differs, adapt the transport layer rather than changing the office or transcript components.

“Plug-and-play” here means the frontend has a stable, tested integration boundary. It does not mean an unspecified future service is automatically compatible. List any contract decisions that must be agreed before connection; never disguise absent backend functionality with mock success in HTTP mode.

**Final instruction to Grok:** build the complete frontend described here, with the cute office as its central identity and the synchronized round model as its central behavior. Keep all real backend, Copilot SDK, model execution, credentials, and authentication work out of this implementation.
