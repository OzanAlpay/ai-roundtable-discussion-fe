import type {
  Catalog,
  CommandContext,
  ConnectionState,
  DiscussionConfig,
  Id,
  PublicError,
  RunCommand,
  RunEvent,
  RunSnapshot,
} from '../domain/types'

export interface RoundtableApi {
  getCatalog(signal?: AbortSignal): Promise<Catalog>
  createRun(
    input: { requestId: Id; config: DiscussionConfig },
    signal?: AbortSignal,
  ): Promise<RunSnapshot>
  getRun(runId: Id, signal?: AbortSignal): Promise<RunSnapshot>
  command(
    runId: Id,
    command: RunCommand,
    context: CommandContext,
    signal?: AbortSignal,
  ): Promise<RunSnapshot>
  subscribe(
    runId: Id,
    options: {
      afterSeq: number
      /** Authoritative GET result delivered before SSE reconnect. */
      onSnapshot?: (snapshot: RunSnapshot) => void
      onEvent: (event: RunEvent) => void
      onConnection: (state: ConnectionState) => void
      onError: (error: PublicError) => void
    },
  ): () => void
  dispose(): void
}
