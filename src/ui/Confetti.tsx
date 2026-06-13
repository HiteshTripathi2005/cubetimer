import { useEffect, useMemo, useState } from 'react'

interface Piece {
  id: string
  left: number
  bg: string
  delay: number
  duration: number
  rotate: number
}

const COLORS = ['#ec0000', '#00a000', '#ffd500', '#ff8c00', '#0051ba', '#6366f1', '#ffffff']

function generate(fireKey: number): Piece[] {
  return Array.from({ length: 70 }, (_, i) => ({
    id: `${fireKey}-${i}`,
    left: Math.random() * 100,
    bg: COLORS[Math.floor(Math.random() * COLORS.length)],
    delay: Math.random() * 0.25,
    duration: 1.6 + Math.random() * 1.1,
    rotate: Math.random() * 360,
  }))
}

// Confetti burst. Re-fires whenever `fireKey` changes to a new non-zero value.
// Self-contained (no dependency); pieces are derived from the key and removed
// after the fall finishes.
export function Confetti({ fireKey }: { fireKey: number }) {
  const pieces = useMemo(() => (fireKey ? generate(fireKey) : []), [fireKey])
  const [doneKey, setDoneKey] = useState(0)

  useEffect(() => {
    if (!fireKey) return
    const t = window.setTimeout(() => setDoneKey(fireKey), 3000)
    return () => window.clearTimeout(t)
  }, [fireKey])

  if (!fireKey || doneKey === fireKey || pieces.length === 0) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.bg,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  )
}
