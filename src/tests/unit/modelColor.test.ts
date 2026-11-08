import { describe, it, expect } from 'vitest'
import { modelColorKey } from '../../lib/domain/modelColor'

describe('modelColorKey', () => {
  it('maps families to provider color keys', () => {
    expect(modelColorKey({ family: 'claude' } as never)).toBe('anthropic')
    expect(modelColorKey({ family: 'gpt' } as never)).toBe('openai')
    expect(modelColorKey({ family: 'gemini' } as never)).toBe('google')
    expect(modelColorKey({ family: 'grok' } as never)).toBe('grok')
  })

  it('falls back to model id/name when family is missing', () => {
    expect(modelColorKey({ id: 'm1', name: 'GPT-5.2' } as never)).toBe('openai')
    expect(modelColorKey({ id: 'claude-sonnet-4.6', name: 'Claude' } as never)).toBe('anthropic')
    expect(modelColorKey({ id: 'm2', name: 'Gemini 3' } as never)).toBe('google')
  })

  it('returns neutral for unknown models', () => {
    expect(modelColorKey(null)).toBe('neutral')
    expect(modelColorKey({ id: 'm3', name: 'Mistral Large' } as never)).toBe('neutral')
  })
})
