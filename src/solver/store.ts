import { create } from 'zustand'
import type { FaceKey } from '../facelets/facelets'
import { CENTER_INDICES } from '../cube/geometry'
import { solvedFacelets } from '../cube/state'
import { faceletsFromScramble } from '../facelets/facelets'
import { ScrambowSource } from '../scramble/scrambowSource'
import { validateGrid } from './validate'
import { SolverError } from './solve'
import { solveAsync } from './client'
import { clampIndex } from '../cube/playback'

type PaintGrid = (FaceKey | null)[]
type SolveStatus = 'idle' | 'solving' | 'solved' | 'error'

const scrambleSource = new ScrambowSource()
const CENTERS = CENTER_INDICES as readonly number[]

function blankGrid(): PaintGrid {
  const solved = solvedFacelets()
  return solved.map((c, i) => (CENTERS.includes(i) ? c : null))
}

interface SolverStoreState {
  grid: PaintGrid
  activeColor: FaceKey
  // solve + playback
  inputFacelets: FaceKey[] | null
  solution: string[] | null
  playbackIndex: number
  isPlaying: boolean
  speedMs: number
  status: SolveStatus
  error: string | null
  // grid actions
  resetToSolved: () => void
  clear: () => void
  scramble: () => void
  applyScan: (grid: FaceKey[]) => void
  setActiveColor: (color: FaceKey) => void
  paintSticker: (index: number) => void
  // solve + playback actions
  clearSolution: () => void
  solveCurrent: () => Promise<void>
  play: () => void
  pause: () => void
  stepForward: () => void
  stepBack: () => void
  setPlaybackIndex: (i: number) => void
  setSpeed: (ms: number) => void
}

const clearedSolve = {
  inputFacelets: null,
  solution: null,
  playbackIndex: 0,
  isPlaying: false,
  status: 'idle' as SolveStatus,
  error: null,
}

export const useSolverStore = create<SolverStoreState>((set, get) => ({
  grid: solvedFacelets(),
  activeColor: 'U',
  ...clearedSolve,
  speedMs: 600,

  resetToSolved: () => set({ grid: solvedFacelets(), ...clearedSolve }),
  clear: () => set({ grid: blankGrid(), ...clearedSolve }),
  scramble: () => set({ grid: faceletsFromScramble(scrambleSource.next()), ...clearedSolve }),
  applyScan: (grid) => set({ grid, ...clearedSolve }),
  setActiveColor: (color) => set({ activeColor: color }),
  paintSticker: (index) => {
    if (CENTERS.includes(index)) return
    const grid = [...get().grid]
    grid[index] = get().activeColor
    set({ grid, ...clearedSolve })
  },

  clearSolution: () => set({ ...clearedSolve }),

  solveCurrent: async () => {
    const result = validateGrid(get().grid)
    if (!result.ok) {
      set({ status: 'error', error: result.message, solution: null, inputFacelets: null })
      return
    }
    const gridAtSolve = get().grid
    set({ status: 'solving', error: null })
    // Solving runs in a worker; if the user edits the cube meanwhile, the
    // grid reference changes and the stale response is discarded.
    const stale = () => get().grid !== gridAtSolve
    try {
      const solution = await solveAsync(result.facelets)
      if (stale()) return
      set({
        solution,
        inputFacelets: result.facelets,
        playbackIndex: 0,
        isPlaying: false,
        status: 'solved',
        error: null,
      })
    } catch (e) {
      if (stale()) return
      const message = e instanceof SolverError ? e.message : 'Could not solve this cube.'
      set({ status: 'error', error: message, solution: null, inputFacelets: null })
    }
  },

  play: () => { if (get().solution) set({ isPlaying: true }) },
  pause: () => set({ isPlaying: false }),
  stepForward: () => {
    const { solution, playbackIndex } = get()
    if (!solution) return
    set({ playbackIndex: clampIndex(playbackIndex + 1, solution.length), isPlaying: false })
  },
  stepBack: () => {
    const { solution, playbackIndex } = get()
    if (!solution) return
    set({ playbackIndex: clampIndex(playbackIndex - 1, solution.length), isPlaying: false })
  },
  setPlaybackIndex: (i) => {
    const { solution } = get()
    if (!solution) return
    set({ playbackIndex: clampIndex(i, solution.length) })
  },
  setSpeed: (ms) => set({ speedMs: ms }),
}))
