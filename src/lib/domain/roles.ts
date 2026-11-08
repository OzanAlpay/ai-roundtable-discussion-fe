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
