import { describe, expect, it } from 'vitest'
import {
  FIXED_CHAIR_COUNT,
  getSeatLayout,
  mapParticipantsToChairs,
  participantIndexForChair,
} from '../../lib/scene/getSeatLayout'

describe('getSeatLayout', () => {
  it('always returns 8 distinct chairs', () => {
    const seats = getSeatLayout()
    expect(seats).toHaveLength(FIXED_CHAIR_COUNT)
    expect(seats.map((s) => s.chairIndex)).toEqual([...Array(FIXED_CHAIR_COUNT).keys()])
    const keys = new Set(seats.map((s) => `${s.x}:${s.y}`))
    expect(keys.size).toBe(FIXED_CHAIR_COUNT)
    for (const seat of seats) {
      expect(seat.x).toBeGreaterThan(0)
      expect(seat.x).toBeLessThan(1)
      expect(seat.y).toBeGreaterThan(0)
      expect(seat.y).toBeLessThan(1)
    }
  })

  it('compacts slightly in compact scene mode', () => {
    const desktop = getSeatLayout('desktop')
    const compact = getSeatLayout('compact')
    expect(Math.abs(compact[0]!.x - 0.5)).toBeLessThan(Math.abs(desktop[0]!.x - 0.5) + 1e-9)
  })
})

describe('mapParticipantsToChairs', () => {
  for (const count of [2, 3, 4, 5, 6]) {
    it(`maps ${count} participants onto distinct chairs within 0..7`, () => {
      const chairs = mapParticipantsToChairs(count)
      expect(chairs).toHaveLength(count)
      expect(new Set(chairs).size).toBe(count)
      for (const chair of chairs) {
        expect(chair).toBeGreaterThanOrEqual(0)
        expect(chair).toBeLessThan(FIXED_CHAIR_COUNT)
      }
    })
  }

  it('rejects unsupported counts', () => {
    expect(() => mapParticipantsToChairs(1)).toThrow()
    expect(() => mapParticipantsToChairs(7)).toThrow()
  })

  it('resolves participantIndexForChair for empty and occupied seats', () => {
    expect(participantIndexForChair(1, 2)).toBe(0)
    expect(participantIndexForChair(5, 2)).toBe(1)
    expect(participantIndexForChair(0, 2)).toBe(-1)
  })
})
