export interface SseMessage {
  id: string | null
  event: string | null
  data: string
  comments: string[]
}

/**
 * Incremental SSE parser supporting CRLF/LF, multiline data, comments,
 * partial chunks, and incomplete final records.
 */
export class SseParser {
  private buffer = ''

  push(chunk: string): SseMessage[] {
    this.buffer += chunk
    const messages: SseMessage[] = []
    // Normalize to \n while preserving content; treat \r\n and bare \r as line ends.
    this.buffer = this.buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

    while (true) {
      const boundary = this.buffer.indexOf('\n\n')
      if (boundary === -1) break
      const raw = this.buffer.slice(0, boundary)
      this.buffer = this.buffer.slice(boundary + 2)
      const parsed = parseRecord(raw)
      if (parsed) messages.push(parsed)
    }
    return messages
  }

  flush(): SseMessage[] {
    if (!this.buffer.trim()) {
      this.buffer = ''
      return []
    }
    const parsed = parseRecord(this.buffer)
    this.buffer = ''
    return parsed ? [parsed] : []
  }
}

function parseRecord(raw: string): SseMessage | null {
  const lines = raw.split('\n')
  let id: string | null = null
  let event: string | null = null
  const dataLines: string[] = []
  const comments: string[] = []

  for (const line of lines) {
    if (line.startsWith(':')) {
      comments.push(line.slice(1).trimStart())
      continue
    }
    const colon = line.indexOf(':')
    const field = colon === -1 ? line : line.slice(0, colon)
    let value = colon === -1 ? '' : line.slice(colon + 1)
    if (value.startsWith(' ')) value = value.slice(1)
    switch (field) {
      case 'id':
        id = value
        break
      case 'event':
        event = value
        break
      case 'data':
        dataLines.push(value)
        break
      default:
        break
    }
  }

  if (!dataLines.length && !event && id == null && !comments.length) return null
  return {
    id,
    event,
    data: dataLines.join('\n'),
    comments,
  }
}
