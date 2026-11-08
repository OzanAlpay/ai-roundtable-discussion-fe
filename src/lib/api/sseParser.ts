export interface SseMessage {
  id: string | null
  event: string | null
  data: string
  comments: string[]
}
/** Incremental line framing: CRLF may span chunks, and EOF never terminates a record. */
export class SseParser {
  private line = ''
  private previousCR = false
  private record: string[] = []
  private size = 0
  push(chunk: string): SseMessage[] {
    const messages: SseMessage[] = []
    for (const ch of chunk) {
      if (this.previousCR) {
        this.previousCR = false
        if (ch === '\n') continue
      }
      if (ch === '\r' || ch === '\n') {
        if (this.line === '') {
          const parsed = parseRecord(this.record)
          if (parsed) messages.push(parsed)
          this.record = []
          this.size = 0
        } else this.record.push(this.line)
        this.line = ''
        this.previousCR = ch === '\r'
      } else {
        this.line += ch
        this.size++
        if (this.size > 4_000_000) throw new Error('SSE record is too large')
      }
    }
    return messages
  }
  flush(): SseMessage[] {
    this.line = ''
    this.record = []
    this.previousCR = false
    this.size = 0
    return []
  }
}
function parseRecord(lines: string[]): SseMessage | null {
  let id: string | null = null,
    event: string | null = null
  const data: string[] = [],
    comments: string[] = []
  for (const line of lines) {
    if (line.startsWith(':')) {
      comments.push(line.slice(1).trimStart())
      continue
    }
    const colon = line.indexOf(':')
    const field = colon < 0 ? line : line.slice(0, colon)
    let value = colon < 0 ? '' : line.slice(colon + 1)
    if (value.startsWith(' ')) value = value.slice(1)
    if (field === 'id' && !value.includes('\0')) id = value
    else if (field === 'event') event = value
    else if (field === 'data') data.push(value)
  }
  return data.length || comments.length ? { id, event, data: data.join('\n'), comments } : null
}
