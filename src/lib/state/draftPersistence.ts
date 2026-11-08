import { discussionConfigSchema } from '../domain/schemas'
import type { DiscussionConfig } from '../domain/types'
import { createDefaultDraftConfig } from '../api/mock/fixtures'

const DRAFT_KEY = 'copilot-roundtable.draft.v1'
const PREFS_KEY = 'copilot-roundtable.prefs.v1'

export interface UiPreferences {
  schemaVersion: 1
  selectedTab: string
  demoScenarioId: string
}

export interface StoredDraft {
  schemaVersion: 1
  savedAt: string
  config: DiscussionConfig
}

export function loadDraft(): DiscussionConfig {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return createDefaultDraftConfig()
    const parsed = JSON.parse(raw) as StoredDraft
    if (parsed?.schemaVersion !== 1 || !parsed.config) return createDefaultDraftConfig()
    const valid = discussionConfigSchema.safeParse(parsed.config)
    return valid.success ? valid.data : createDefaultDraftConfig()
  } catch {
    return createDefaultDraftConfig()
  }
}

export function saveDraft(config: DiscussionConfig): { ok: boolean; message?: string } {
  try {
    const payload: StoredDraft = {
      schemaVersion: 1,
      savedAt: new Date().toISOString(),
      config,
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload))
    return { ok: true }
  } catch {
    return { ok: false, message: 'Could not save draft in this browser.' }
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    // ignore
  }
}

export function loadPrefs(): UiPreferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) {
      return { schemaVersion: 1, selectedTab: 'overview', demoScenarioId: 'healthy-two-rounds' }
    }
    const parsed = JSON.parse(raw) as UiPreferences
    if (parsed?.schemaVersion !== 1) {
      return { schemaVersion: 1, selectedTab: 'overview', demoScenarioId: 'healthy-two-rounds' }
    }
    return {
      schemaVersion: 1,
      selectedTab: typeof parsed.selectedTab === 'string' ? parsed.selectedTab : 'overview',
      demoScenarioId:
        typeof parsed.demoScenarioId === 'string' ? parsed.demoScenarioId : 'healthy-two-rounds',
    }
  } catch {
    return { schemaVersion: 1, selectedTab: 'overview', demoScenarioId: 'healthy-two-rounds' }
  }
}

export function savePrefs(prefs: UiPreferences): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // ignore
  }
}
