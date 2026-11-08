import type { Catalog, DiscussionConfig } from './types'
/** Preserve valid choices; reconcile stale/demo IDs against the service catalog. */
export function reconcileDraft(config: DiscussionConfig, catalog: Catalog): DiscussionConfig {
  const available = catalog.models.filter((m) => m.availability === 'available')
  return {
    ...config,
    participants: config.participants.map((p, index) => {
      if (available.some((m) => m.id === p.modelId && m.providerId === p.providerId)) return p
      const model =
        available.find((m) => m.providerId === p.providerId) ?? available[index % available.length]
      return { ...p, providerId: model?.providerId ?? '', modelId: model?.id ?? '' }
    }),
  }
}
