import type { FaceKey } from '../facelets/facelets'
import { faceletsAfter } from './state'

export function clampIndex(index: number, total: number): number {
  return Math.max(0, Math.min(index, total))
}

export interface DisplayInput {
  grid: (FaceKey | null)[]
  inputFacelets: FaceKey[] | null
  solution: string[] | null
  playbackIndex: number
}

// When a solution exists, show the input with the first `playbackIndex` moves applied;
// otherwise show the editable grid.
export function selectDisplayGrid(s: DisplayInput): (FaceKey | null)[] {
  if (s.solution && s.inputFacelets) {
    return faceletsAfter(s.inputFacelets, s.solution, s.playbackIndex)
  }
  return s.grid
}
