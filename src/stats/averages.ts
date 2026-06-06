import type { Solve } from '../types'

export type AverageResult = number | 'DNF' | null

export function effectiveTime(solve: Solve): number | null {
  if (solve.penalty === 'dnf') return null
  return solve.penalty === 'plus2' ? solve.timeMs + 2000 : solve.timeMs
}

function validTimes(solves: Solve[]): number[] {
  const out: number[] = []
  for (const s of solves) {
    const t = effectiveTime(s)
    if (t !== null) out.push(t)
  }
  return out
}

export function best(solves: Solve[]): number | null {
  const t = validTimes(solves)
  return t.length ? Math.min(...t) : null
}

export function worst(solves: Solve[]): number | null {
  const t = validTimes(solves)
  return t.length ? Math.max(...t) : null
}

export function mean(solves: Solve[]): number | null {
  const t = validTimes(solves)
  return t.length ? t.reduce((a, b) => a + b, 0) / t.length : null
}

export function average(solves: Solve[], n: number): AverageResult {
  if (solves.length < n) return null
  const window = solves.slice(-n)
  const trim = Math.ceil(n * 0.05)
  const dnfCount = window.filter((s) => s.penalty === 'dnf').length
  if (dnfCount > trim) return 'DNF'
  const times = window.map((s) =>
    s.penalty === 'dnf' ? Infinity : s.penalty === 'plus2' ? s.timeMs + 2000 : s.timeMs,
  )
  const sorted = [...times].sort((a, b) => a - b)
  const kept = sorted.slice(trim, n - trim)
  return kept.reduce((a, b) => a + b, 0) / kept.length
}

export function bestAverage(solves: Solve[], n: number): AverageResult {
  if (solves.length < n) return null
  let bestVal: number | null = null
  for (let i = 0; i + n <= solves.length; i++) {
    const a = average(solves.slice(i, i + n), n)
    if (typeof a === 'number') bestVal = bestVal === null ? a : Math.min(bestVal, a)
  }
  return bestVal !== null ? bestVal : 'DNF'
}

export function formatTime(value: AverageResult, decimals: 2 | 3): string {
  if (value === null) return '—'
  if (value === 'DNF') return 'DNF'
  const totalSeconds = value / 1000
  if (totalSeconds < 60) return totalSeconds.toFixed(decimals)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds - minutes * 60
  const secStr = seconds.toFixed(decimals).padStart(decimals + 3, '0')
  return `${minutes}:${secStr}`
}
