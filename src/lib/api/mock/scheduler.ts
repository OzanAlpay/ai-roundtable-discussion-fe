export type Cancel = () => void

export interface Clock {
  now(): number
  setTimeout(fn: () => void, ms: number): Cancel
}

export function createRealClock(): Clock {
  return {
    now: () => Date.now(),
    setTimeout: (fn, ms) => {
      const handle = globalThis.setTimeout(fn, ms)
      return () => globalThis.clearTimeout(handle)
    },
  }
}

export function createFakeClock(start = 0): Clock & {
  advance(ms: number): void
  pendingCount(): number
} {
  let now = start
  let nextId = 1
  const timers = new Map<number, { due: number; fn: () => void }>()

  return {
    now: () => now,
    setTimeout: (fn, ms) => {
      const id = nextId++
      timers.set(id, { due: now + Math.max(0, ms), fn })
      return () => {
        timers.delete(id)
      }
    },
    advance(ms: number) {
      const target = now + ms
      while (true) {
        let next: { id: number; due: number; fn: () => void } | null = null
        for (const [id, timer] of timers) {
          if (timer.due <= target && (!next || timer.due < next.due)) {
            next = { id, due: timer.due, fn: timer.fn }
          }
        }
        if (!next) {
          now = target
          return
        }
        now = next.due
        timers.delete(next.id)
        next.fn()
      }
    },
    pendingCount: () => timers.size,
  }
}

export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (1664525 * state + 1013904223) >>> 0
    return state / 0x100000000
  }
}
