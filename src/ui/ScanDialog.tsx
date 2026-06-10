import { useEffect, useRef, useState } from 'react'
import type { FaceKey } from '../facelets/facelets'
import { FACE_COLORS } from '../facelets/facelets'
import { classifyScan, labDistance, type RGB } from '../scan/classify'
import { fixScanOrientation } from '../scan/orientation'

// Guided 6-face scan. Each step prescribes how to hold the cube so the 3x3
// camera grid maps directly to facelet reading order (row-major) for that
// face — no rotation bookkeeping needed. `around` lists which neighboring
// face's color should be visible on each side of the scanned face in that
// orientation; it is drawn as colored guide strips so the user can match what
// they actually see instead of decoding direction words.
interface Step {
  face: FaceKey
  title: string
  hint: string
  around: { top: FaceKey; right: FaceKey; bottom: FaceKey; left: FaceKey }
}

const STEPS: Step[] = [
  {
    face: 'F', title: 'Scan the green face',
    hint: 'Hold the cube with green facing the camera and white on top.',
    around: { top: 'U', right: 'R', bottom: 'D', left: 'L' },
  },
  {
    face: 'R', title: 'Scan the red face',
    hint: 'Spin the cube left so red faces the camera. White stays on top.',
    around: { top: 'U', right: 'B', bottom: 'D', left: 'F' },
  },
  {
    face: 'B', title: 'Scan the blue face',
    hint: 'Spin left again so blue faces the camera. White stays on top.',
    around: { top: 'U', right: 'L', bottom: 'D', left: 'R' },
  },
  {
    face: 'L', title: 'Scan the orange face',
    hint: 'Spin left once more so orange faces the camera. White stays on top.',
    around: { top: 'U', right: 'F', bottom: 'D', left: 'B' },
  },
  {
    face: 'U', title: 'Scan the white face',
    hint: 'Bring green back to the front, then tilt the cube down toward you: white faces the camera with GREEN at the bottom.',
    around: { top: 'B', right: 'R', bottom: 'F', left: 'L' },
  },
  {
    face: 'D', title: 'Scan the yellow face',
    hint: 'Tilt the other way: yellow faces the camera with GREEN at the top.',
    around: { top: 'F', right: 'R', bottom: 'B', left: 'L' },
  },
]

const FACE_NAMES: Record<FaceKey, string> = {
  U: 'white', R: 'red', F: 'green', D: 'yellow', L: 'orange', B: 'blue',
}

// Fraction of the (square-cropped) frame covered by the sampling grid.
const GRID_FRACTION = 0.6
const INSET = ((1 - GRID_FRACTION) / 2) * 100 // % inset of the guide grid

// Ideal palette in RGB, used only for the advisory "is this the right face?"
// check on the captured center (final classification uses scanned centers).
const PALETTE: { face: FaceKey; rgb: RGB }[] = (Object.keys(FACE_COLORS) as FaceKey[]).map((face) => {
  const hex = FACE_COLORS[face]
  return {
    face,
    rgb: {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    },
  }
})

function nearestPaletteFace(rgb: RGB): FaceKey {
  let best: FaceKey = 'U'
  let bestD = Infinity
  for (const p of PALETTE) {
    const d = labDistance(rgb, p.rgb)
    if (d < bestD) {
      bestD = d
      best = p.face
    }
  }
  return best
}

// Average a small patch around each of the 9 cell centers of the guide grid.
function sampleFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement): RGB[] | null {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh) return null
  canvas.width = vw
  canvas.height = vh
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(video, 0, 0)
  const side = Math.min(vw, vh) * GRID_FRACTION
  const ox = (vw - side) / 2
  const oy = (vh - side) / 2
  const patch = Math.max(4, Math.round(side / 30))
  const samples: RGB[] = []
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const cx = ox + ((col + 0.5) * side) / 3
      const cy = oy + ((row + 0.5) * side) / 3
      const data = ctx.getImageData(Math.round(cx - patch / 2), Math.round(cy - patch / 2), patch, patch).data
      let r = 0, g = 0, b = 0
      const n = data.length / 4
      for (let i = 0; i < data.length; i += 4) {
        r += data[i]
        g += data[i + 1]
        b += data[i + 2]
      }
      samples.push({ r: r / n, g: g / n, b: b / n })
    }
  }
  return samples
}

const STRIP_STYLE: Record<'top' | 'right' | 'bottom' | 'left', React.CSSProperties> = {
  top: { left: `${INSET}%`, right: `${INSET}%`, top: `${INSET - 6.5}%`, height: '4.5%' },
  bottom: { left: `${INSET}%`, right: `${INSET}%`, bottom: `${INSET - 6.5}%`, height: '4.5%' },
  left: { top: `${INSET}%`, bottom: `${INSET}%`, left: `${INSET - 6.5}%`, width: '4.5%' },
  right: { top: `${INSET}%`, bottom: `${INSET}%`, right: `${INSET - 6.5}%`, width: '4.5%' },
}

interface Props {
  onApply: (grid: FaceKey[]) => void
  onClose: () => void
}

export function ScanDialog({ onApply, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [scans, setScans] = useState<Partial<Record<FaceKey, RGB[]>>>({})
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false
    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera is not available in this browser. You can still paint the cube manually.')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
      } catch {
        setError('Could not open the camera. Check the camera permission and try again.')
      }
    }
    void start()
    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const step = STEPS[stepIndex]
  const done = stepIndex >= STEPS.length

  const capture = () => {
    if (!videoRef.current || !canvasRef.current || done) return
    const samples = sampleFrame(videoRef.current, canvasRef.current)
    if (!samples) return
    // Advisory only — final classification uses the cube's own centers.
    const looksLike = nearestPaletteFace(samples[4])
    setWarning(
      looksLike !== step.face
        ? `That capture's center looks ${FACE_NAMES[looksLike]}, expected ${FACE_NAMES[step.face]}. If that's wrong, press Back and recapture.`
        : null,
    )
    const next = { ...scans, [step.face]: samples }
    setScans(next)
    if (stepIndex === STEPS.length - 1) {
      const grid = classifyScan(next as Record<FaceKey, RGB[]>)
      // Recover white/yellow faces captured with a different tilt direction.
      onApply(fixScanOrientation(grid) ?? grid)
      onClose()
      return
    }
    setStepIndex(stepIndex + 1)
  }

  const retake = () => {
    if (stepIndex === 0) return
    setWarning(null)
    setStepIndex(stepIndex - 1)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Scan cube">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative flex max-h-full w-full max-w-md flex-col gap-3 overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-xl">
        <header className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-semibold text-zinc-800 dark:text-zinc-100">{step ? step.title : 'Done'}</h2>
            <p className="text-xs text-zinc-400">{step ? step.hint : ''}</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose}
            className="rounded-md px-2 py-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">✕</button>
        </header>

        {error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : (
          <>
            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black">
              <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
              {/* 3x3 alignment guide matching the sampled region */}
              <div
                className="pointer-events-none absolute grid grid-cols-3 grid-rows-3"
                style={{ inset: `${INSET}%` }}
              >
                {Array.from({ length: 9 }, (_, i) => (
                  <div key={i} className="border border-white/70" />
                ))}
              </div>
              {/* neighbor strips: the colors you should see around the face */}
              {step && (['top', 'right', 'bottom', 'left'] as const).map((side) => (
                <div
                  key={side}
                  data-testid={`strip-${side}`}
                  title={`${FACE_NAMES[step.around[side]]} side`}
                  className="pointer-events-none absolute rounded-sm border border-white/50"
                  style={{ ...STRIP_STYLE[side], backgroundColor: FACE_COLORS[step.around[side]] }}
                />
              ))}
            </div>
            <canvas ref={canvasRef} className="hidden" />

            <p className="text-xs text-zinc-400">
              The strips show which neighboring colors should surround the face — if yours don't match, the cube is
              held the wrong way.
            </p>

            {warning && <p className="text-xs font-medium text-amber-500">{warning}</p>}

            {/* progress chips */}
            <div className="flex items-center gap-1.5" aria-label="scan progress">
              {STEPS.map((s, i) => (
                <span
                  key={s.face}
                  className={`h-4 w-4 rounded-sm border ${i < stepIndex ? 'border-transparent' : i === stepIndex ? 'border-indigo-500 ring-2 ring-indigo-300' : 'border-zinc-300 dark:border-zinc-600'}`}
                  style={{ backgroundColor: i <= stepIndex ? FACE_COLORS[s.face] : 'transparent' }}
                  title={s.face}
                />
              ))}
              <span className="ml-2 text-xs text-zinc-400">{Math.min(stepIndex, STEPS.length)} / {STEPS.length} faces</span>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={capture}
                className="flex-1 rounded-md bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-500">
                Capture {step?.face && <span className="font-mono">({step.face})</span>}
              </button>
              <button type="button" onClick={retake} disabled={stepIndex === 0}
                className="rounded-md border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm disabled:opacity-50">
                Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
