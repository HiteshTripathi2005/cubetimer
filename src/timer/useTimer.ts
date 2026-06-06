import { useCallback, useEffect, useRef, useState } from 'react'
import type { Penalty } from '../types'
import { formatTime } from '../stats/averages'
import {
  initialTimerState, reduce, type TimerConfig, type TimerEvent, type TimerState,
} from './machine'

interface UseTimerArgs {
  config: TimerConfig
  onSolve: (timeMs: number, penalty: Penalty) => void
  decimals?: 2 | 3
}

interface UseTimerReturn {
  phase: TimerState['phase']
  display: string
  inspectionSeconds: number | null
}

export function useTimer({ config, onSolve, decimals = 2 }: UseTimerArgs): UseTimerReturn {
  const [state, setState] = useState<TimerState>(initialTimerState)
  const [display, setDisplay] = useState('0.00')
  const [inspectionSeconds, setInspectionSeconds] = useState<number | null>(null)

  const stateRef = useRef(state)
  stateRef.current = state
  const configRef = useRef(config)
  configRef.current = config
  const onSolveRef = useRef(onSolve)
  onSolveRef.current = onSolve
  const holdTimer = useRef<number | null>(null)
  const runningRaf = useRef<number | null>(null)
  const inspectionRaf = useRef<number | null>(null)

  const dispatch = useCallback((event: Omit<TimerEvent, 'now'> & { now?: number }) => {
    const now = event.now ?? performance.now()
    const next = reduce(stateRef.current, { ...event, now } as TimerEvent, configRef.current)
    stateRef.current = next
    setState(next)
    if (next.lastResult) {
      onSolveRef.current(next.lastResult.elapsedMs, next.lastResult.penalty)
    }
  }, [])

  // hold timer: after PRESS while holding, arm after holdToStartMs
  useEffect(() => {
    if (state.phase === 'holding') {
      holdTimer.current = window.setTimeout(
        () => dispatch({ type: 'HOLD_ELAPSED' }),
        configRef.current.holdToStartMs,
      )
    }
    return () => {
      if (holdTimer.current) {
        window.clearTimeout(holdTimer.current)
        holdTimer.current = null
      }
    }
  }, [state.phase, dispatch])

  // running display ticker
  useEffect(() => {
    if (state.phase === 'running' && state.solveStartedAt !== null) {
      const tick = () => {
        const elapsed = performance.now() - (stateRef.current.solveStartedAt ?? 0)
        setDisplay(formatTime(elapsed, decimals))
        runningRaf.current = requestAnimationFrame(tick)
      }
      runningRaf.current = requestAnimationFrame(tick)
      return () => { if (runningRaf.current) cancelAnimationFrame(runningRaf.current) }
    }
  }, [state.phase, state.solveStartedAt, decimals])

  // inspection countdown display
  useEffect(() => {
    if (state.phase === 'inspecting' && state.inspectionStartedAt !== null) {
      const tick = () => {
        const elapsed = (performance.now() - (stateRef.current.inspectionStartedAt ?? 0)) / 1000
        setInspectionSeconds(Math.max(0, Math.ceil(15 - elapsed)))
        inspectionRaf.current = requestAnimationFrame(tick)
      }
      inspectionRaf.current = requestAnimationFrame(tick)
      return () => { if (inspectionRaf.current) cancelAnimationFrame(inspectionRaf.current) }
    }
    setInspectionSeconds(null)
  }, [state.phase, state.inspectionStartedAt])

  // reset display to last result when returning to idle
  useEffect(() => {
    if (state.phase === 'idle' && state.lastResult) {
      setDisplay(formatTime(state.lastResult.elapsedMs, decimals))
    }
  }, [state.phase, state.lastResult, decimals])

  // keyboard + touch wiring
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      e.preventDefault()
      if (e.repeat) return
      if (stateRef.current.phase === 'running') dispatch({ type: 'STOP' })
      else dispatch({ type: 'PRESS' })
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      e.preventDefault()
      if (stateRef.current.phase === 'holding' || stateRef.current.phase === 'ready') {
        dispatch({ type: 'RELEASE' })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [dispatch])

  return { phase: state.phase, display, inspectionSeconds }
}
