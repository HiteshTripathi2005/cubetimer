import type { FaceKey } from '../facelets/facelets'
import { FACE_COLORS } from '../facelets/facelets'

const ORDER: FaceKey[] = ['U', 'R', 'F', 'D', 'L', 'B']

interface Props {
  active: FaceKey
  onSelect: (color: FaceKey) => void
}

export function ColorPalette({ active, onSelect }: Props) {
  return (
    <div className="flex gap-2">
      {ORDER.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Paint color ${c}`}
          onClick={() => onSelect(c)}
          className={`w-8 h-8 rounded-md border-2 ${active === c ? 'border-zinc-900 dark:border-white' : 'border-transparent'}`}
          style={{ backgroundColor: FACE_COLORS[c] }}
        />
      ))}
    </div>
  )
}
