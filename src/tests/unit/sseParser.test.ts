import { describe, expect, it } from 'vitest'
import { SseParser } from '../../lib/api/sseParser'

describe('SseParser', () => {
  it('parses messages split across chunks and CRLF', () => {
    const parser = new SseParser()
    const part1 = 'id: 1\r\nevent: roundtable\r\ndata: {"hello":'
    const part2 = '"world"}\r\n\r\n'
    expect(parser.push(part1)).toEqual([])
    const messages = parser.push(part2)
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatchObject({
      id: '1',
      event: 'roundtable',
      data: '{"hello":"world"}',
    })
  })

  it('supports multiline data and comment heartbeats', () => {
    const parser = new SseParser()
    const messages = parser.push(': keep-alive\n\nid: 2\nevent: roundtable\ndata: line1\ndata: line2\n\n')
    expect(messages).toHaveLength(2)
    expect(messages[0]!.comments[0]).toContain('keep-alive')
    expect(messages[1]!.data).toBe('line1\nline2')
  })

  it('handles unicode split across chunks', () => {
    const parser = new SseParser()
    const full = 'data: café\n\n'
    expect(parser.push(full.slice(0, 8)).length).toBe(0)
    const messages = parser.push(full.slice(8))
    expect(messages[0]!.data).toBe('café')
  })
})
