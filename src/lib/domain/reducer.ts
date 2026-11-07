import { assertRunEvent, assertRunSnapshot, ProtocolError } from './invariants'
import { parseRunEvent, parseRunSnapshot } from './schemas'
import type { ConnectionState, PublicError, RunEvent, RunSnapshot } from './types'

export type ApplyResult =
  | { kind: 'applied'; snapshot: RunSnapshot; event?: RunEvent }
  | { kind: 'ignored'; reason: 'duplicate' | 'stale' | 'wrong_run' | 'generation' }
  | { kind: 'gap'; expectedSeq: number; receivedSeq: number }
  | { kind: 'terminal_closed' }
  | { kind: 'error'; error: PublicError }

export interface ClientRunState {
  snapshot: RunSnapshot | null
  connection: ConnectionState
  subscriptionGeneration: number
  protocolError: PublicError | null
  lastAppliedSeq: number
}

export function createClientRunState(): ClientRunState {
  return {
    snapshot: null,
    connection: 'closed',
    subscriptionGeneration: 0,
    protocolError: null,
    lastAppliedSeq: 0,
  }
}

const TERMINAL = new Set(['completed', 'cancelled', 'failed'])

export function isTerminalStatus(status: RunSnapshot['status']): boolean {
  return TERMINAL.has(status)
}

export function applySnapshot(
  state: ClientRunState,
  raw: unknown,
  opts?: { allowJump?: boolean; expectedRunId?: string },
): ApplyResult {
  let snapshot: RunSnapshot
  try {
    snapshot = parseRunSnapshot(raw)
    assertRunSnapshot(snapshot)
  } catch (error) {
    return {
      kind: 'error',
      error: toPublicError(error, 'protocol.invalid_snapshot', 'Received an invalid run snapshot.'),
    }
  }

  if (opts?.expectedRunId && snapshot.id !== opts.expectedRunId) {
    return { kind: 'ignored', reason: 'wrong_run' }
  }

  if (state.snapshot && isTerminalStatus(state.snapshot.status) && !isTerminalStatus(snapshot.status)) {
    return { kind: 'terminal_closed' }
  }

  if (state.snapshot && snapshot.id !== state.snapshot.id) {
    return { kind: 'ignored', reason: 'wrong_run' }
  }

  if (state.snapshot && snapshot.lastEventSeq < state.lastAppliedSeq) {
    return { kind: 'ignored', reason: 'stale' }
  }

  if (state.snapshot && snapshot.lastEventSeq === state.lastAppliedSeq) {
    return { kind: 'ignored', reason: 'duplicate' }
  }

  if (
    state.snapshot &&
    !opts?.allowJump &&
    snapshot.lastEventSeq > state.lastAppliedSeq + 1
  ) {
    // HTTP snapshots may jump; callers set allowJump for GET/create/command.
  }

  return { kind: 'applied', snapshot }
}

export function applyEvent(
  state: ClientRunState,
  raw: unknown,
  opts?: { generation?: number; expectedRunId?: string },
): ApplyResult {
  if (opts?.generation !== undefined && opts.generation !== state.subscriptionGeneration) {
    return { kind: 'ignored', reason: 'generation' }
  }

  let event: RunEvent
  try {
    event = parseRunEvent(raw)
    assertRunEvent(event)
  } catch (error) {
    return {
      kind: 'error',
      error: toPublicError(error, 'protocol.invalid_event', 'Received an invalid run event.'),
    }
  }

  if (opts?.expectedRunId && event.runId !== opts.expectedRunId) {
    return { kind: 'ignored', reason: 'wrong_run' }
  }

  if (state.snapshot && event.runId !== state.snapshot.id) {
    return { kind: 'ignored', reason: 'wrong_run' }
  }

  if (state.snapshot && isTerminalStatus(state.snapshot.status) && !isTerminalStatus(event.snapshot.status)) {
    return { kind: 'terminal_closed' }
  }

  if (event.seq <= state.lastAppliedSeq) {
    return { kind: 'ignored', reason: event.seq === state.lastAppliedSeq ? 'duplicate' : 'stale' }
  }

  if (state.snapshot && event.seq > state.lastAppliedSeq + 1) {
    return { kind: 'gap', expectedSeq: state.lastAppliedSeq + 1, receivedSeq: event.seq }
  }

  return { kind: 'applied', snapshot: event.snapshot, event }
}

export function commitApplied(state: ClientRunState, snapshot: RunSnapshot): ClientRunState {
  return {
    ...state,
    snapshot,
    lastAppliedSeq: snapshot.lastEventSeq,
    protocolError: null,
  }
}

export function bumpSubscriptionGeneration(state: ClientRunState): ClientRunState {
  return {
    ...state,
    subscriptionGeneration: state.subscriptionGeneration + 1,
  }
}

export function setConnection(state: ClientRunState, connection: ConnectionState): ClientRunState {
  return { ...state, connection }
}

export function setProtocolError(state: ClientRunState, error: PublicError | null): ClientRunState {
  return { ...state, protocolError: error }
}

function toPublicError(error: unknown, code: string, message: string): PublicError {
  if (error instanceof ProtocolError) {
    return { code: error.code, message: error.message, retryable: error.retryable }
  }
  if (error instanceof Error) {
    return { code, message: `${message} ${error.message}`, retryable: false }
  }
  return { code, message, retryable: false }
}

export function exhaustive(_value: never): never {
  throw new Error('Unhandled case')
}
