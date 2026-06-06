import { describe, it, expect } from 'vitest'
import type { Solve } from '../types'
import {
  effectiveTime, best, worst, mean, average, bestAverage, formatTime,
} from './averages'

function s(timeMs: number, penalty: Solve['penalty'] = 'none'): Solve {
  return { id: 'x', sessionId: 'a', timeMs, penalty, scramble: '', createdAt: 0 }
}

describe('effectiveTime', () => {
  it('returns raw time for none', () => expect(effectiveTime(s(1000))).toBe(1000))
  it('adds 2000 for plus2', () => expect(effectiveTime(s(1000, 'plus2'))).toBe(3000))
  it('returns null for dnf', () => expect(effectiveTime(s(1000, 'dnf'))).toBeNull())
})

describe('best / worst / mean', () => {
  const list = [s(1000), s(3000), s(2000, 'plus2'), s(9999, 'dnf')] // effective: 1000, 3000, 4000, -
  it('best ignores dnf', () => expect(best(list)).toBe(1000))
  it('worst ignores dnf', () => expect(worst(list)).toBe(4000))
  it('mean ignores dnf', () => expect(mean(list)).toBe((1000 + 3000 + 4000) / 3))
  it('returns null on empty / all-dnf', () => {
    expect(best([])).toBeNull()
    expect(mean([s(1, 'dnf')])).toBeNull()
  })
})

describe('average (ao5)', () => {
  it('returns null with fewer than 5 solves', () => {
    expect(average([s(1), s(2), s(3), s(4)], 5)).toBeNull()
  })
  it('drops one best and one worst, means the middle 3', () => {
    // times 1,2,3,4,5 -> drop 1 and 5 -> mean(2,3,4)=3
    const list = [s(1), s(2), s(3), s(4), s(5)]
    expect(average(list, 5)).toBe(3)
  })
  it('uses only the most recent 5', () => {
    const list = [s(100), s(1), s(2), s(3), s(4), s(5)] // last 5: 1..5
    expect(average(list, 5)).toBe(3)
  })
  it('counts a single dnf as the dropped worst', () => {
    const list = [s(2), s(3), s(4), s(10), s(99, 'dnf')] // drop dnf(worst) + 2(best) -> mean(3,4,10)
    expect(average(list, 5)).toBe((3 + 4 + 10) / 3)
  })
  it('is DNF when two or more dnf in the window', () => {
    const list = [s(2), s(3), s(4, 'dnf'), s(10), s(99, 'dnf')]
    expect(average(list, 5)).toBe('DNF')
  })
})

describe('average (ao12 trims 1, ao100 trims 5)', () => {
  it('ao12 means the middle 10', () => {
    const times = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    const list = times.map((t) => s(t))
    // drop 1 and 12 -> mean(2..11) = 6.5
    expect(average(list, 12)).toBe(6.5)
  })
  it('ao100 tolerates up to 5 dnf, DNF at 6', () => {
    const list = Array.from({ length: 100 }, (_, i) => s(i + 1))
    for (let i = 0; i < 5; i++) list[i] = s(9999, 'dnf')
    expect(typeof average(list, 100)).toBe('number')
    list[5] = s(9999, 'dnf')
    expect(average(list, 100)).toBe('DNF')
  })
})

describe('bestAverage', () => {
  it('returns the best rolling ao5', () => {
    // windows of 5 over 1..6: [1..5]->3, [2..6]->4 ; best = 3
    const list = [1, 2, 3, 4, 5, 6].map((t) => s(t))
    expect(bestAverage(list, 5)).toBe(3)
  })
  it('returns null with too few solves', () => {
    expect(bestAverage([s(1)], 5)).toBeNull()
  })
})

describe('formatTime', () => {
  it('formats sub-minute to 2 decimals', () => expect(formatTime(12480, 2)).toBe('12.48'))
  it('formats sub-minute to 3 decimals', () => expect(formatTime(12480, 3)).toBe('12.480'))
  it('formats minutes', () => expect(formatTime(62340, 2)).toBe('1:02.34'))
  it('formats DNF and null', () => {
    expect(formatTime('DNF', 2)).toBe('DNF')
    expect(formatTime(null, 2)).toBe('—')
  })
})
