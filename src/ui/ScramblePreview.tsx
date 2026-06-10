import type { ReactNode } from 'react'
import { faceletsFromScramble, FACE_COLORS, type FaceKey } from '../facelets/facelets'

// grid origin (in sticker units) for each face in the unfolded layout
const FACE_ORIGIN: Record<'U' | 'R' | 'F' | 'D' | 'L' | 'B', { col: number; row: number }> = {
  U: { col: 3, row: 0 },
  L: { col: 0, row: 3 },
  F: { col: 3, row: 3 },
  R: { col: 6, row: 3 },
  B: { col: 9, row: 3 },
  D: { col: 3, row: 6 },
}
// face index range start in the 54-array
const FACE_START: Record<'U' | 'R' | 'F' | 'D' | 'L' | 'B', number> = {
  U: 0, R: 9, F: 18, D: 27, L: 36, B: 45,
}

interface Props { scramble: string }

export function ScramblePreview({ scramble }: Props) {
  const facelets = faceletsFromScramble(scramble)
  const size = 14
  const gap = 2
  const cell = size + gap
  const rects: ReactNode[] = []
  ;(Object.keys(FACE_ORIGIN) as Array<keyof typeof FACE_ORIGIN>).forEach((face) => {
    const origin = FACE_ORIGIN[face]
    const start = FACE_START[face]
    for (let i = 0; i < 9; i++) {
      const r = Math.floor(i / 3)
      const c = i % 3
      const key = facelets[start + i] as FaceKey
      rects.push(
        <rect key={`${face}-${i}`}
          x={(origin.col + c) * cell} y={(origin.row + r) * cell}
          width={size} height={size} rx={2}
          fill={FACE_COLORS[key]} stroke="#27272a" strokeWidth={0.5} />,
      )
    }
  })
  const width = 12 * cell
  const height = 9 * cell
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-h-44" role="img" aria-label="Scramble preview">
      {rects}
    </svg>
  )
}
