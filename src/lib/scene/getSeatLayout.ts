export type SceneMode = 'desktop' | 'compact'

export interface SeatLayout {
  chairIndex: number
  x: number
  y: number
  layer: 'back' | 'front' | 'side'
  facing: 'inward'
  labelAnchor: 'above' | 'below' | 'left' | 'right'
}

/** Always render this many chairs around the oval table. */
export const FIXED_CHAIR_COUNT = 8

/**
 * Pleasant chair subsets for 2–6 participants inside the fixed 8-chair ring.
 * Values are chair indices (0 = NW, clockwise).
 */
const OCCUPIED_SUBSETS: Record<number, number[]> = {
  2: [1, 5],
  3: [0, 2, 5],
  4: [0, 2, 4, 6],
  5: [0, 2, 3, 5, 7],
  6: [0, 1, 2, 4, 5, 6],
}

/** Fixed oval ring. Coordinates are normalized 0–1 within the room stage. */
const CHAIR_RING: Omit<SeatLayout, 'chairIndex'>[] = [
  { x: 0.28, y: 0.3, layer: 'back', facing: 'inward', labelAnchor: 'above' },
  { x: 0.5, y: 0.24, layer: 'back', facing: 'inward', labelAnchor: 'above' },
  { x: 0.72, y: 0.3, layer: 'back', facing: 'inward', labelAnchor: 'above' },
  { x: 0.88, y: 0.5, layer: 'side', facing: 'inward', labelAnchor: 'right' },
  { x: 0.72, y: 0.72, layer: 'front', facing: 'inward', labelAnchor: 'below' },
  { x: 0.5, y: 0.78, layer: 'front', facing: 'inward', labelAnchor: 'below' },
  { x: 0.28, y: 0.72, layer: 'front', facing: 'inward', labelAnchor: 'below' },
  { x: 0.12, y: 0.5, layer: 'side', facing: 'inward', labelAnchor: 'left' },
]

/**
 * Always returns 8 chairs. Participant count no longer changes chair count.
 */
export function getSeatLayout(sceneMode: SceneMode = 'desktop'): SeatLayout[] {
  const compactScale = sceneMode === 'compact' ? 0.92 : 1
  return CHAIR_RING.map((seat, chairIndex) => ({
    chairIndex,
    ...seat,
    x: 0.5 + (seat.x - 0.5) * compactScale,
    y: 0.5 + (seat.y - 0.5) * compactScale,
  }))
}

/**
 * Maps participant indices (0..count-1) onto a pleasant subset of the 8 chairs.
 */
export function mapParticipantsToChairs(participantCount: number): number[] {
  if (participantCount < 2 || participantCount > 6) {
    throw new Error(`Unsupported participant count: ${participantCount}`)
  }
  return OCCUPIED_SUBSETS[participantCount]!
}

/** Chair index → participant index, or -1 when empty. */
export function participantIndexForChair(
  chairIndex: number,
  participantCount: number,
): number {
  const occupied = mapParticipantsToChairs(participantCount)
  return occupied.indexOf(chairIndex)
}

/** Table width is fixed for the 8-chair oval; sceneMode can nudge slightly. */
export function tableWidthFactor(sceneMode: SceneMode = 'desktop'): number {
  return sceneMode === 'compact' ? 1.02 : 1.08
}
