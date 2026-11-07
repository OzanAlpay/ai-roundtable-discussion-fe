import type { Catalog } from '../../domain/types'
import { deepFreeze } from '../../domain/invariants'

export const DEMO_CATALOG: Catalog = deepFreeze({
  schemaVersion: 1,
  providers: [
    { id: 'demo-copilot', name: 'Copilot', iconKey: 'copilot' },
    { id: 'demo-openai', name: 'OpenAI', iconKey: 'openai' },
    { id: 'demo-anthropic', name: 'Anthropic', iconKey: 'anthropic' },
    { id: 'demo-grok', name: 'Grok', iconKey: 'grok' },
    { id: 'demo-google', name: 'Google', iconKey: 'google' },
  ],
  models: [
    {
      id: 'demo-gpt',
      providerId: 'demo-copilot',
      name: 'Example GPT',
      family: 'gpt',
      availability: 'available',
      isDemo: true,
    },
    {
      id: 'demo-gpt-fast',
      providerId: 'demo-openai',
      name: 'Example GPT Fast',
      family: 'gpt',
      availability: 'available',
      isDemo: true,
    },
    {
      id: 'demo-claude',
      providerId: 'demo-anthropic',
      name: 'Example Claude',
      family: 'claude',
      availability: 'available',
      isDemo: true,
    },
    {
      id: 'demo-claude-sonnet',
      providerId: 'demo-anthropic',
      name: 'Example Claude Sonnet',
      family: 'claude',
      availability: 'available',
      isDemo: true,
    },
    {
      id: 'demo-grok-fast',
      providerId: 'demo-grok',
      name: 'Example Grok Fast',
      family: 'grok',
      availability: 'available',
      isDemo: true,
    },
    {
      id: 'demo-gemini',
      providerId: 'demo-google',
      name: 'Example Gemini',
      family: 'gemini',
      availability: 'available',
      isDemo: true,
    },
    {
      id: 'demo-unavailable',
      providerId: 'demo-openai',
      name: 'Example Offline Model',
      availability: 'unavailable',
      unavailableReason: 'Demo fixture marked unavailable.',
      isDemo: true,
    },
  ],
})

export const DEFAULT_ROLE_INSTRUCTIONS: Record<string, string> = {
  Architect:
    'Favor coherent long-term structure, maintainability, and clear migration paths. State a firm position.',
  Skeptic:
    'Challenge assumptions, surface risks, and resist change without evidence. Preserve disagreement when warranted.',
  Pragmatist:
    'Optimize for shipping value with reversible steps. Prefer experiments and measurable criteria.',
  'Performance reviewer':
    'Focus on runtime cost, complexity, and measurable performance tradeoffs.',
  'Product thinker':
    'Weigh user impact, learning speed, and opportunity cost over pure technical elegance.',
  Custom: '',
}
