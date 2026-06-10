import type { FaceKey } from '../facelets/facelets'
import { FACE_COLORS } from '../facelets/facelets'
import { lastLayerView } from '../algs/lastLayer'

const ORIENTED = '#ffd500' // conventional yellow for the top color
const MUTED = '#52525b' // zinc-600

const CELL = 14
const GAP = 1
const STRIP = 5
const SIZE = STRIP + GAP + 3 * CELL + 2 * GAP + GAP + STRIP // 56
const cellPos = (i: number) => STRIP + GAP + i * (CELL + GAP)

interface Props {
  alg: string
  kind: 'OLL' | 'PLL'
}

/**
 * Top-down last-layer diagram for the state the algorithm solves, computed
 * from the algorithm itself. OLL: top-color stickers yellow, rest muted.
 * PLL: top yellow, side strips show the actual face colors.
 */
export function CaseDiagram({ alg, kind }: Props) {
  const v = lastLayerView(alg)
  const fill = (f: FaceKey) => {
    if (f === v.topColor) return ORIENTED
    return kind === 'OLL' ? MUTED : FACE_COLORS[f]
  }
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-20 w-20 shrink-0" role="img" aria-label={`case diagram`}>
      {v.top.map((f, i) => (
        <rect key={`t${i}`} x={cellPos(i % 3)} y={cellPos(Math.floor(i / 3))} width={CELL} height={CELL} rx={1.5} fill={fill(f)} />
      ))}
      {v.back.map((f, i) => (
        <rect key={`b${i}`} x={cellPos(i)} y={0} width={CELL} height={STRIP} rx={1.5} fill={fill(f)} />
      ))}
      {v.front.map((f, i) => (
        <rect key={`f${i}`} x={cellPos(i)} y={SIZE - STRIP} width={CELL} height={STRIP} rx={1.5} fill={fill(f)} />
      ))}
      {v.left.map((f, i) => (
        <rect key={`l${i}`} x={0} y={cellPos(i)} width={STRIP} height={CELL} rx={1.5} fill={fill(f)} />
      ))}
      {v.right.map((f, i) => (
        <rect key={`r${i}`} x={SIZE - STRIP} y={cellPos(i)} width={STRIP} height={CELL} rx={1.5} fill={fill(f)} />
      ))}
    </svg>
  )
}
