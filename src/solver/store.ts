import { create } from 'zustand'
import type { FaceKey } from '../facelets/facelets'
import { CENTER_INDICES } from '../cube/geometry'
import { solvedFacelets } from '../cube/state'
import { faceletsFromScramble } from '../facelets/facelets'
import { ScrambowSource } from '../scramble/scrambowSource'

type PaintGrid = (FaceKey | null)[]

const scrambleSource = new ScrambowSource()
const CENTERS = CENTER_INDICES as readonly number[]

function blankGrid(): PaintGrid {
  const solved = solvedFacelets()
  return solved.map((c, i) => (CENTERS.includes(i) ? c : null))
}

interface SolverStoreState {
  grid: PaintGrid
  activeColor: FaceKey
  resetToSolved: () => void
  clear: () => void
  scramble: () => void
  setActiveColor: (color: FaceKey) => void
  paintSticker: (index: number) => void
}

export const useSolverStore = create<SolverStoreState>((set, get) => ({
  grid: solvedFacelets(),
  activeColor: 'U',
  resetToSolved: () => set({ grid: solvedFacelets() }),
  clear: () => set({ grid: blankGrid() }),
  scramble: () => set({ grid: faceletsFromScramble(scrambleSource.next()) }),
  setActiveColor: (color) => set({ activeColor: color }),
  paintSticker: (index) => {
    if (CENTERS.includes(index)) return
    const grid = [...get().grid]
    grid[index] = get().activeColor
    set({ grid })
  },
}))
