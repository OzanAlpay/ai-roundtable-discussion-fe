export type SceneMode = 'desktop' | 'compact'

export interface SeatLayout {
  participantIndex: number
  x: number
  y: number
  layer: 'back' | 'front' | 'side'
  facing: 'inward'
  labelAnchor: 'above' | 'below' | 'left' | 'right'
}

/**
 * Tuned seat layouts for 2–6 participants. Coordinates are normalized 0–1
 * within the room stage.
 */
export function getSeatLayout(count: number, sceneMode: SceneMode = 'desktop'): SeatLayout[] {
  if (count < 2 || count > 6) {
    throw new Error(`Unsupported seat count: ${count}`)
  }

  const compactScale = sceneMode === 'compact' ? 0.92 : 1
  const layouts: Record<number, Omit<SeatLayout, 'participantIndex'>[]> = {
    2: [
      { x: 0.28, y: 0.34, layer: 'back', facing: 'inward', labelAnchor: 'above' },
      { x: 0.72, y: 0.62, layer: 'front', facing: 'inward', labelAnchor: 'below' },
    ],
    3: [
      { x: 0.28, y: 0.30, layer: 'back', facing: 'inward', labelAnchor: 'above' },
      { x: 0.72, y: 0.30, layer: 'back', facing: 'inward', labelAnchor: 'above' },
      { x: 0.50, y: 0.68, layer: 'front', facing: 'inward', labelAnchor: 'below' },
    ],
    4: [
      { x: 0.28, y: 0.28, layer: 'back', facing: 'inward', labelAnchor: 'above' },
      { x: 0.72, y: 0.28, layer: 'back', facing: 'inward', labelAnchor: 'above' },
      { x: 0.28, y: 0.68, layer: 'front', facing: 'inward', labelAnchor: 'below' },
      { x: 0.72, y: 0.68, layer: 'front', facing: 'inward', labelAnchor: 'below' },
    ],
    5: [
      { x: 0.30, y: 0.26, layer: 'back', facing: 'inward', labelAnchor: 'above' },
      { x: 0.70, y: 0.26, layer: 'back', facing: 'inward', labelAnchor: 'above' },
      { x: 0.14, y: 0.50, layer: 'side', facing: 'inward', labelAnchor: 'left' },
      { x: 0.86, y: 0.50, layer: 'side', facing: 'inward', labelAnchor: 'right' },
      { x: 0.50, y: 0.72, layer: 'front', facing: 'inward', labelAnchor: 'below' },
    ],
    6: [
      { x: 0.30, y: 0.24, layer: 'back', facing: 'inward', labelAnchor: 'above' },
      { x: 0.70, y: 0.24, layer: 'back', facing: 'inward', labelAnchor: 'above' },
      { x: 0.12, y: 0.48, layer: 'side', facing: 'inward', labelAnchor: 'left' },
      { x: 0.88, y: 0.48, layer: 'side', facing: 'inward', labelAnchor: 'right' },
      { x: 0.30, y: 0.74, layer: 'front', facing: 'inward', labelAnchor: 'below' },
      { x: 0.70, y: 0.74, layer: 'front', facing: 'inward', labelAnchor: 'below' },
    ],
  }

  return layouts[count]!.map((seat, participantIndex) => ({
    participantIndex,
    ...seat,
    x: 0.5 + (seat.x - 0.5) * compactScale,
    y: 0.5 + (seat.y - 0.5) * compactScale,
  }))
}

export function tableWidthFactor(count: number): number {
  return count >= 6 ? 1.12 : count >= 5 ? 1.06 : 1
}
