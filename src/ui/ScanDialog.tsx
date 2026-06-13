import { useEffect, useRef, useState } from 'react'
import type { FaceKey } from '../facelets/facelets'
import { FACE_COLORS } from '../facelets/facelets'
import { classifyFace, type RGB } from '../scan/classify'
import { fixScanOrientation } from '../scan/orientation'
import { ColorPalette } from './ColorPalette'

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

// Assembly order of the final 54-facelet grid (cubejs order).
const FACE_ORDER: FaceKey[] = ['U', 'R', 'F', 'D', 'L', 'B']

// Fraction of the (square-cropped) frame covered by the sampling grid.
const GRID_FRACTION = 0.6
const INSET = ((1 - GRID_FRACTION) / 2) * 100 // % inset of the guide grid

// How often the live preview re-samples the camera frame.
const SAMPLE_INTERVAL_MS = 200

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
  // Confirmed 9 colors per face, accumulated as the user confirms each face.
  const [confirmed, setConfirmed] = useState<Partial<Record<FaceKey, FaceKey[]>>>({})
  // The 9 colors currently shown for the active face (null until first sample).
  const [detected, setDetected] = useState<FaceKey[] | null>(null)
  // `manual` freezes the live preview so the user's tap-fixes are not overwritten.
  const [manual, setManual] = useState(false)
  const [activeColor, setActiveColor] = useState<FaceKey>('U')
  const [error, setError] = useState<string | null>(null)

  const step = STEPS[stepIndex]

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

  // Live preview: while not frozen, re-sample the frame and classify the 9
  // blocks of the current face. The center is locked to the face's true color.
  useEffect(() => {
    if (error || manual || !step) return
    const id = window.setInterval(() => {
      if (!videoRef.current || !canvasRef.current) return
      const samples = sampleFrame(videoRef.current, canvasRef.current)
      if (samples) setDetected(classifyFace(samples, step.face))
    }, SAMPLE_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [stepIndex, manual, error, step])

  // Tap a block to correct a misread color. Freezes the preview so the fix sticks.
  const paintCell = (i: number) => {
    if (i === 4 || !step) return // center is locked to the true color
    setManual(true)
    setDetected((prev) => {
      const base = prev ? [...prev] : Array<FaceKey>(9).fill(step.face)
      base[i] = activeColor
      base[4] = step.face
      return base
    })
  }

  const confirmFace = () => {
    if (!detected || !step) return
    const face = [...detected]
    face[4] = step.face
    const next = { ...confirmed, [step.face]: face }
    setConfirmed(next)
    if (stepIndex === STEPS.length - 1) {
      const grid = FACE_ORDER.flatMap((f) => next[f] ?? [])
      // Recover white/yellow faces captured with a different tilt direction.
      onApply(fixScanOrientation(grid) ?? grid)
      onClose()
      return
    }
    setStepIndex(stepIndex + 1)
    setDetected(null)
    setManual(false)
  }

  const back = () => {
    if (stepIndex === 0) return
    const prev = STEPS[stepIndex - 1].face
    setStepIndex(stepIndex - 1)
    // Reload the previous face's confirmed colors (frozen) so it can be redone.
    setDetected(confirmed[prev] ?? null)
    setManual(confirmed[prev] !== undefined)
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
              {/* 3x3 grid showing the color the system reads for each block */}
              <div
                className="absolute grid grid-cols-3 grid-rows-3"
                style={{ inset: `${INSET}%` }}
              >
                {Array.from({ length: 9 }, (_, i) => {
                  const c = detected?.[i] ?? null
                  const isCenter = i === 4
                  return (
                    <button
                      key={i}
                      type="button"
                      data-testid={`block-${i}`}
                      disabled={isCenter}
                      onClick={() => paintCell(i)}
                      aria-label={`block ${i}${c ? ` ${FACE_NAMES[c]}` : ''}`}
                      className="relative flex items-center justify-center border border-white/80"
                      style={{
                        backgroundColor: c ? FACE_COLORS[c] : 'rgba(0,0,0,0.2)',
                        opacity: c ? 0.82 : 1,
                      }}
                    >
                      {isCenter && <span className="text-xs drop-shadow">🔒</span>}
                    </button>
                  )
                })}
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
              The system fills each block with the color it sees — the center is locked to {step ? FACE_NAMES[step.face] : ''}.
              {manual
                ? ' Tap blocks to fix, or resume auto-detect.'
                : ' Align the cube until the colors match, then Confirm. Tap any block to correct it.'}
            </p>

            {/* fix palette: pick a color, then tap a wrong block */}
            <div className="flex items-center justify-between gap-2">
              <ColorPalette active={activeColor} onSelect={setActiveColor} />
              {manual && (
                <button type="button" onClick={() => setManual(false)}
                  className="rounded-md border border-zinc-300 dark:border-zinc-700 px-2 py-1 text-xs">
                  ↺ Auto
                </button>
              )}
            </div>

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
              <button type="button" onClick={confirmFace} disabled={!detected}
                className="flex-1 rounded-md bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-500 disabled:opacity-50">
                {stepIndex === STEPS.length - 1 ? 'Confirm & finish' : 'Confirm face'}
                {step?.face && <span className="ml-1 font-mono">({step.face})</span>}
              </button>
              <button type="button" onClick={back} disabled={stepIndex === 0}
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
