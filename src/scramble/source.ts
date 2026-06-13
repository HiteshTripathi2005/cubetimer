import type { PuzzleEvent } from '../types'

export interface ScrambleSource {
  /** Returns the next scramble for the given puzzle (defaults to 3×3). */
  next(event?: PuzzleEvent): string
}
