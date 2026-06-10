import { describe, it, expect } from 'vitest'
import { solvedFacelets } from '../cube/state'
import { invertAlg, caseState, lastLayerView, LAST_LAYER_INDICES } from './lastLayer'
import { OLL_CASES } from './oll'
import { PLL_CASES } from './pll'

describe('invertAlg', () => {
  it('reverses order and flips modifiers', () => {
    expect(invertAlg("R U2 r' F")).toBe("F' r U2 R'")
    expect(invertAlg('')).toBe('')
  })
})

describe('OLL/PLL data', () => {
  const LL = new Set(LAST_LAYER_INDICES)

  it('has 57 OLL and 21 PLL cases with unique ids', () => {
    expect(OLL_CASES.length).toBe(57)
    expect(PLL_CASES.length).toBe(21)
    const ids = [...OLL_CASES, ...PLL_CASES].map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each([...OLL_CASES, ...PLL_CASES].map((c) => [c.id, c.alg] as const))(
    '%s only affects last-layer stickers',
    (_id, alg) => {
      const solved = solvedFacelets()
      const state = caseState(alg)
      const wrong = state
        .map((f, i) => (f !== solved[i] ? i : -1))
        .filter((i) => i >= 0 && !LL.has(i))
      expect(wrong).toEqual([])
    },
  )

  it.each(OLL_CASES.map((c) => [c.id, c.alg] as const))(
    '%s leaves the top face unoriented (it is a real OLL case)',
    (_id, alg) => {
      const v = lastLayerView(alg)
      expect(v.top.some((f) => f !== v.topColor)).toBe(true)
    },
  )

  it.each(PLL_CASES.map((c) => [c.id, c.alg] as const))(
    '%s keeps the top face oriented but permuted (it is a real PLL case)',
    (_id, alg) => {
      const v = lastLayerView(alg)
      expect(v.top.every((f) => f === v.topColor)).toBe(true)
      const sides = [...v.back, ...v.right, ...v.front, ...v.left]
      const solvedSides = [...lastLayerView('').back, ...lastLayerView('').right, ...lastLayerView('').front, ...lastLayerView('').left]
      expect(sides.join('')).not.toBe(solvedSides.join(''))
    },
  )

  it('every case pattern is unique within its set', () => {
    const key = (alg: string) => {
      const v = lastLayerView(alg)
      return [v.top, v.back, v.right, v.front, v.left].flat().join('')
    }
    const ollKeys = OLL_CASES.map((c) => key(c.alg))
    // OLL uniqueness is on the orientation pattern (top-color vs not).
    const ollOrient = OLL_CASES.map((c) => {
      const v = lastLayerView(c.alg)
      return [v.top, v.back, v.right, v.front, v.left].flat().map((f) => (f === v.topColor ? '1' : '0')).join('')
    })
    expect(new Set(ollOrient).size).toBe(ollKeys.length)
    const pllKeys = PLL_CASES.map((c) => key(c.alg))
    expect(new Set(pllKeys).size).toBe(pllKeys.length)
  })

  it('known case sanity: Sune pattern matches the classic diagram', () => {
    const v = lastLayerView("R U R' U R U2 R'") // OLL 27
    const oriented = v.top.map((f) => f === v.topColor)
    // Sune: all edges oriented, one corner oriented (front-left), three twisted.
    expect(oriented).toEqual([false, true, false, true, true, true, true, true, false])
  })
})
