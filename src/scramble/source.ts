export interface ScrambleSource {
  /** Returns the next 3x3 scramble as a move string. */
  next(): string
}
