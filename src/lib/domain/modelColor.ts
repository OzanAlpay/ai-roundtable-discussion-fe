import type { Model } from './types'

const FAMILY_COLOR_KEYS: Record<string, string> = {
  claude: 'anthropic',
  gpt: 'openai',
  gemini: 'google',
  grok: 'grok',
}

const NAME_HINTS: [RegExp, string][] = [
  [/claude/i, 'anthropic'],
  [/gpt|codex|o1|o3|o4/i, 'openai'],
  [/gemini/i, 'google'],
  [/grok/i, 'grok'],
]

export function modelColorKey(model: Model | null | undefined): string {
  const family = model?.family?.toLowerCase()
  if (family && FAMILY_COLOR_KEYS[family]) return FAMILY_COLOR_KEYS[family]
  const label = `${model?.id ?? ''} ${model?.name ?? ''}`
  for (const [pattern, key] of NAME_HINTS) {
    if (pattern.test(label)) return key
  }
  return 'neutral'
}
