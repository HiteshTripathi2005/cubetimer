import Cube from 'cubejs'

export type FaceKey = 'U' | 'R' | 'F' | 'D' | 'L' | 'B'

// Standard color scheme.
export const FACE_COLORS: Record<FaceKey, string> = {
  U: '#ffffff', // white
  R: '#ec0000', // red
  F: '#00a000', // green
  D: '#ffd500', // yellow
  L: '#ff8c00', // orange
  B: '#0051ba', // blue
}

// Returns 54 face keys in cubejs order: U(0-8) R(9-17) F(18-26) D(27-35) L(36-44) B(45-53)
export function faceletsFromScramble(scramble: string): FaceKey[] {
  const cube = new Cube()
  if (scramble.trim().length > 0) cube.move(scramble)
  return cube.asString().split('') as FaceKey[]
}
