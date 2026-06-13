import type { FaceKey } from '../facelets/facelets'
import { FACE_COLORS } from '../facelets/facelets'

export interface RGB {
  r: number
  g: number
  b: number
}

// sRGB (0-255) → CIE Lab (D65). Lab distance is much closer to perceived
// color difference than RGB distance, which matters under uneven lighting.
export function rgbToLab({ r, g, b }: RGB): [number, number, number] {
  const lin = (c: number) => {
    const v = c / 255
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  const [lr, lg, lb] = [lin(r), lin(g), lin(b)]
  // sRGB → XYZ (D65), normalized to white point
  const x = (lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375) / 0.95047
  const y = lr * 0.2126729 + lg * 0.7151522 + lb * 0.072175
  const z = (lr * 0.0193339 + lg * 0.119192 + lb * 0.9503041) / 1.08883
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const [fx, fy, fz] = [f(x), f(y), f(z)]
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

export function labDistance(a: RGB, b: RGB): number {
  const [l1, a1, b1] = rgbToLab(a)
  const [l2, a2, b2] = rgbToLab(b)
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2)
}

const FACE_ORDER: FaceKey[] = ['U', 'R', 'F', 'D', 'L', 'B']

// Ideal sticker color for each face, derived from the standard scheme. Used for
// the live per-face preview, where only the current face's samples are known
// (so we can't yet classify relative to all six scanned centers).
const IDEAL_PALETTE: { face: FaceKey; rgb: RGB }[] = FACE_ORDER.map((face) => {
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

/** Nearest standard cube color to a sampled RGB, in perceptual Lab space. */
export function nearestPaletteFace(rgb: RGB): FaceKey {
  let best: FaceKey = 'U'
  let bestD = Infinity
  for (const p of IDEAL_PALETTE) {
    const d = labDistance(rgb, p.rgb)
    if (d < bestD) {
      bestD = d
      best = p.face
    }
  }
  return best
}

/**
 * Classify the 9 raw samples of a single face for the live scan preview.
 * The center sticker never moves on a real cube, so it is forced to
 * `centerFace` (its true main color) instead of being detected — that anchors
 * the face and removes the reading users most often get wrong. The other 8 are
 * matched to the nearest standard color.
 */
export function classifyFace(samples: RGB[], centerFace: FaceKey): FaceKey[] {
  return samples.map((rgb, i) => (i === 4 ? centerFace : nearestPaletteFace(rgb)))
}

/**
 * Classify scanned sticker colors against the scanned center colors.
 * `samplesByFace` holds the 9 raw RGB samples per face in facelet reading
 * order (row-major, top-left first). The center sample of each face is the
 * ground truth for that face's color, so every sticker is assigned to the
 * nearest center in Lab space — robust to lighting since centers and stickers
 * were captured under the same conditions.
 * Returns the 54 facelets in cubejs order (U R F D L B).
 */
export function classifyScan(samplesByFace: Record<FaceKey, RGB[]>): FaceKey[] {
  const centers = FACE_ORDER.map((f) => ({ face: f, rgb: samplesByFace[f][4] }))
  const nearest = (rgb: RGB): FaceKey => {
    let best: FaceKey = 'U'
    let bestD = Infinity
    for (const c of centers) {
      const d = labDistance(rgb, c.rgb)
      if (d < bestD) {
        bestD = d
        best = c.face
      }
    }
    return best
  }
  return FACE_ORDER.flatMap((f) => samplesByFace[f].map(nearest))
}
