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
  audioCues?: boolean
}

interface PointerHandlers {
  onPointerDown: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
}

interface UseTimerReturn {
  phase: TimerState['phase']
  display: string
  inspectionSeconds: number | null
  pointerHandlers: PointerHandlers
}

// Lazy AudioContext singleton
let audioCtx: AudioContext | null = null
function getAudioContext(): AudioContext | null {
  if (audioCtx) return audioCtx
  try {
    audioCtx = new AudioContext()
    return audioCtx
  } catch {
    return null
  }
}

function playBeep(frequency: number, durationS: number): void {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = frequency
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationS)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + durationS)
  } catch {
    // silently degrade when AudioContext is unavailable or autoplay is blocked
  }
}

export function useTimer({ config, onSolve, decimals = 2, audioCues = false }: UseTimerArgs): UseTimerReturn {
  const [state, setState] = useState<TimerState>(initialTimerState)
  const [runningDisplay, setRunningDisplay] = useState('0.00')
  const [inspectionSecondsState, setInspectionSecondsState] = useState<number | null>(null)

  const stateRef = useRef(state)
  const configRef = useRef(config)
  const onSolveRef = useRef(onSolve)
  const audioCuesRef = useRef(audioCues)
  const holdTimer = useRef<number | null>(null)
  const runningRaf = useRef<number | null>(null)
  const inspectionRaf = useRef<number | null>(null)
  const cue8Ref = useRef(false)
  const cue12Ref = useRef(false)
  const autoStartedRef = useRef(false)

  // sync latest-ref values after every render (standard "latest ref" pattern)
  useEffect(() => {
    stateRef.current = state
    configRef.current = config
    onSolveRef.current = onSolve
    audioCuesRef.current = audioCues
  })

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
        setRunningDisplay(formatTime(elapsed, decimals))
        runningRaf.current = requestAnimationFrame(tick)
      }
      runningRaf.current = requestAnimationFrame(tick)
      return () => { if (runningRaf.current) cancelAnimationFrame(runningRaf.current) }
    }
  }, [state.phase, state.solveStartedAt, decimals])

  // reset per-inspection flags whenever a new inspection starts (or clears)
  useEffect(() => {
    cue8Ref.current = false
    cue12Ref.current = false
    autoStartedRef.current = false
  }, [state.inspectionStartedAt])

  // inspection countdown display + audio cues. Runs through inspecting AND the
  // holding/ready arming phases, so the countdown stays live while the user
  // presses to start the solve — it only stops once the solve is running.
  const inspectionActive = state.inspectionStartedAt !== null && state.phase !== 'running'
  useEffect(() => {
    if (inspectionActive) {
      const tick = () => {
        const elapsed = (performance.now() - (stateRef.current.inspectionStartedAt ?? 0)) / 1000
        setInspectionSecondsState(Math.max(0, Math.ceil(15 - elapsed)))
        // auto-start the solve when the 15s inspection runs out (only if the
        // user hasn't already begun arming a hold)
        if (stateRef.current.phase === 'inspecting' && elapsed >= 15 && !autoStartedRef.current) {
          autoStartedRef.current = true
          dispatch({ type: 'AUTO_START' })
          return
        }
        // audio cues at 8s and 12s elapsed — fire once each
        if (audioCuesRef.current) {
          if (!cue8Ref.current && elapsed >= 8) {
            cue8Ref.current = true
            playBeep(880, 0.15)
          }
          if (!cue12Ref.current && elapsed >= 12) {
            cue12Ref.current = true
            playBeep(1320, 0.2)
          }
        }
        inspectionRaf.current = requestAnimationFrame(tick)
      }
      inspectionRaf.current = requestAnimationFrame(tick)
      return () => { if (inspectionRaf.current) cancelAnimationFrame(inspectionRaf.current) }
    }
  }, [inspectionActive, dispatch])

  // keyboard wiring
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

  const display = state.phase === 'running'
    ? runningDisplay
    : (state.lastResult ? formatTime(state.lastResult.elapsedMs, decimals) : (0).toFixed(decimals))

  const inspectionSeconds = inspectionActive ? inspectionSecondsState : null

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    if (stateRef.current.phase === 'running') dispatch({ type: 'STOP' })
    else dispatch({ type: 'PRESS' })
  }, [dispatch])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    if (stateRef.current.phase === 'holding' || stateRef.current.phase === 'ready') {
      dispatch({ type: 'RELEASE' })
    }
  }, [dispatch])

  return {
    phase: state.phase,
    display,
    inspectionSeconds,
    pointerHandlers: { onPointerDown, onPointerUp },
  }
}
