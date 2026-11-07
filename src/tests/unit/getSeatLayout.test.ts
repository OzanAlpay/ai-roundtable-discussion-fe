import { describe, expect, it } from 'vitest'
import { getSeatLayout } from '../../lib/scene/getSeatLayout'

describe('getSeatLayout', () => {
  for (const count of [2, 3, 4, 5, 6]) {
    it(`returns ${count} distinct ordered seats`, () => {
      const seats = getSeatLayout(count)
      expect(seats).toHaveLength(count)
      expect(seats.map((s) => s.participantIndex)).toEqual([...Array(count).keys()])
      const keys = new Set(seats.map((s) => `${s.x}:${s.y}`))
      expect(keys.size).toBe(count)
      for (const seat of seats) {
        expect(seat.x).toBeGreaterThan(0)
        expect(seat.x).toBeLessThan(1)
        expect(seat.y).toBeGreaterThan(0)
        expect(seat.y).toBeLessThan(1)
      }
    })
  }

  it('rejects unsupported counts', () => {
    expect(() => getSeatLayout(1)).toThrow()
    expect(() => getSeatLayout(7)).toThrow()
  })
})
