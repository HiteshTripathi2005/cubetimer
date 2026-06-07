import type { FaceKey } from '../facelets/facelets'
import { FACE_COLORS } from '../facelets/facelets'
import { NET_CELLS, CENTER_INDICES } from '../cube/geometry'

const CENTERS = CENTER_INDICES as readonly number[]
const COLS = 12
const ROWS = 9

interface Props {
  grid: (FaceKey | null)[]
  onPaint: (index: number) => void
  /** Colors to flag (e.g. the off-count colors) — their stickers get a ring. */
  highlight?: FaceKey[]
}

export function NetEditor({ grid, onPaint, highlight }: Props) {
  return (
    <div
      className="grid gap-0.5 w-full max-w-xs"
      style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)`, aspectRatio: `${COLS} / ${ROWS}` }}
    >
      {NET_CELLS.map((cell) => {
        const color = grid[cell.index]
        const isCenter = CENTERS.includes(cell.index)
        const flagged = color !== null && highlight?.includes(color) === true
        return (
          <button
            key={cell.index}
            type="button"
            aria-label={`sticker ${cell.index}`}
            data-highlight={flagged ? 'true' : 'false'}
            disabled={isCenter}
            onClick={() => onPaint(cell.index)}
            style={{
              gridColumn: cell.col + 1,
              gridRow: cell.row + 1,
              backgroundColor: color ? FACE_COLORS[color] : '#d4d4d8',
            }}
            className={`rounded-[2px] border border-zinc-800/20 aspect-square ${
              flagged ? 'ring-2 ring-amber-400 outline outline-2 outline-amber-500 z-10 animate-pulse' : ''
            }`}
          />
        )
      })}
    </div>
  )
}
