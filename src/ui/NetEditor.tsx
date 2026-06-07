import type { FaceKey } from '../facelets/facelets'
import { FACE_COLORS } from '../facelets/facelets'
import { NET_CELLS, CENTER_INDICES } from '../cube/geometry'

const CENTERS = CENTER_INDICES as readonly number[]
const COLS = 12
const ROWS = 9

interface Props {
  grid: (FaceKey | null)[]
  onPaint: (index: number) => void
}

export function NetEditor({ grid, onPaint }: Props) {
  return (
    <div
      className="grid gap-0.5 w-full max-w-xs"
      style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)`, aspectRatio: `${COLS} / ${ROWS}` }}
    >
      {NET_CELLS.map((cell) => {
        const color = grid[cell.index]
        const isCenter = CENTERS.includes(cell.index)
        return (
          <button
            key={cell.index}
            type="button"
            aria-label={`sticker ${cell.index}`}
            disabled={isCenter}
            onClick={() => onPaint(cell.index)}
            style={{
              gridColumn: cell.col + 1,
              gridRow: cell.row + 1,
              backgroundColor: color ? FACE_COLORS[color] : '#d4d4d8',
            }}
            className="rounded-[2px] border border-zinc-800/20 aspect-square"
          />
        )
      })}
    </div>
  )
}
