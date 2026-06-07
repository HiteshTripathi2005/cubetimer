import { describe, it, expect, beforeEach } from 'vitest'
import { useSolverStore } from './store'
import { CENTER_INDICES } from '../cube/geometry'
import { applyMoves } from '../cube/state'

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

describe('useSolverStore — solve + playback', () => {
  beforeEach(() => {
    const s = useSolverStore.getState()
    s.resetToSolved()
    s.clearSolution()
  })

  it('solveCurrent on a scrambled grid produces a verified solution', async () => {
    const s = useSolverStore.getState()
    useSolverStore.setState({ grid: applyMoves(useSolverStore.getState().grid, "R U R' U'") })
    await s.solveCurrent()
    const st = useSolverStore.getState()
    expect(st.status).toBe('solved')
    expect(st.solution && st.solution.length).toBeGreaterThan(0)
    expect(st.playbackIndex).toBe(0)
  })

  it('solveCurrent on an invalid grid sets an error and no solution', async () => {
    useSolverStore.getState().clear() // nulls present
    await useSolverStore.getState().solveCurrent()
    const st = useSolverStore.getState()
    expect(st.status).toBe('error')
    expect(st.error).toMatch(/painted/i)
    expect(st.solution).toBeNull()
  })

  it('stepForward/stepBack clamp within the solution', async () => {
    const s = useSolverStore.getState()
    useSolverStore.setState({ grid: applyMoves(useSolverStore.getState().grid, "R U R' U'") })
    await s.solveCurrent()
    const len = useSolverStore.getState().solution!.length
    s.stepBack()
    expect(useSolverStore.getState().playbackIndex).toBe(0)
    for (let i = 0; i < len + 3; i++) s.stepForward()
    expect(useSolverStore.getState().playbackIndex).toBe(len)
  })

  it('editing the grid clears any solution', async () => {
    const s = useSolverStore.getState()
    useSolverStore.setState({ grid: applyMoves(useSolverStore.getState().grid, 'R') })
    await s.solveCurrent()
    expect(useSolverStore.getState().solution).not.toBeNull()
    s.resetToSolved()
    expect(useSolverStore.getState().solution).toBeNull()
    expect(useSolverStore.getState().status).toBe('idle')
  })
})
