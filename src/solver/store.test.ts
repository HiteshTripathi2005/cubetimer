import { describe, it, expect, beforeEach } from 'vitest'
import { useSolverStore } from './store'
import { CENTER_INDICES } from '../cube/geometry'

beforeEach(() => useSolverStore.getState().resetToSolved())

describe('useSolverStore', () => {
  it('resetToSolved fills all 54 stickers, centers correct', () => {
    const { grid } = useSolverStore.getState()
    expect(grid.length).toBe(54)
    expect(grid.every((g) => g !== null)).toBe(true)
    expect(grid[4]).toBe('U')
    expect(grid[13]).toBe('R')
  })

  it('clear blanks non-centers but keeps centers', () => {
    useSolverStore.getState().clear()
    const { grid } = useSolverStore.getState()
    for (let i = 0; i < 54; i++) {
      if ((CENTER_INDICES as readonly number[]).includes(i)) expect(grid[i]).not.toBeNull()
      else expect(grid[i]).toBeNull()
    }
  })

  it('setActiveColor + paintSticker paints a non-center sticker', () => {
    useSolverStore.getState().clear()
    useSolverStore.getState().setActiveColor('R')
    useSolverStore.getState().paintSticker(0)
    expect(useSolverStore.getState().grid[0]).toBe('R')
  })

  it('paintSticker ignores center stickers', () => {
    useSolverStore.getState().setActiveColor('R')
    useSolverStore.getState().paintSticker(4) // U center
    expect(useSolverStore.getState().grid[4]).toBe('U')
  })

  it('scramble produces a full grid different from solved', () => {
    useSolverStore.getState().scramble()
    const { grid } = useSolverStore.getState()
    expect(grid.every((g) => g !== null)).toBe(true)
    expect(grid.join('')).not.toBe('UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB')
  })
})
