import type { FaceKey } from '../facelets/facelets'

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
