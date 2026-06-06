import type { Penalty } from '../types'

export type TimerPhase = 'idle' | 'inspecting' | 'holding' | 'ready' | 'running'

export interface TimerConfig {
  inspection: boolean
  holdToStartMs: number
}

export interface TimerResult {
  elapsedMs: number
  penalty: Penalty
}

export interface TimerState {
  phase: TimerPhase
  inspectionStartedAt: number | null
  solveStartedAt: number | null
  lastResult: TimerResult | null
}

export type TimerEvent =
  | { type: 'PRESS'; now: number }
  | { type: 'RELEASE'; now: number }
  | { type: 'HOLD_ELAPSED'; now: number }
  | { type: 'STOP'; now: number }

export function initialTimerState(): TimerState {
  return { phase: 'idle', inspectionStartedAt: null, solveStartedAt: null, lastResult: null }
}

function inspectionPenalty(inspectionStartedAt: number | null, solveStart: number): Penalty {
  if (inspectionStartedAt === null) return 'none'
  const elapsed = solveStart - inspectionStartedAt
  if (elapsed > 17000) return 'dnf'
  if (elapsed > 15000) return 'plus2'
  return 'none'
}

export function reduce(state: TimerState, event: TimerEvent, config: TimerConfig): TimerState {
  switch (state.phase) {
    case 'idle':
      if (event.type === 'PRESS') {
        if (config.inspection) {
          return { ...state, phase: 'inspecting', inspectionStartedAt: event.now, lastResult: null }
        }
        return { ...state, phase: 'holding', lastResult: null }
      }
      return state

    case 'inspecting':
      if (event.type === 'PRESS') return { ...state, phase: 'holding' }
      return state // RELEASE/others ignored; countdown handled by the hook

    case 'holding':
      if (event.type === 'HOLD_ELAPSED') return { ...state, phase: 'ready' }
      if (event.type === 'RELEASE') {
        // released before armed -> cancel
        return state.inspectionStartedAt !== null
          ? { ...state, phase: 'inspecting' }
          : { ...initialTimerState() }
      }
      return state

    case 'ready':
      if (event.type === 'RELEASE') {
        return { ...state, phase: 'running', solveStartedAt: event.now }
      }
      return state

    case 'running':
      if (event.type === 'STOP') {
        const elapsedMs = event.now - (state.solveStartedAt ?? event.now)
        const penalty = inspectionPenalty(state.inspectionStartedAt, state.solveStartedAt ?? event.now)
        return {
          phase: 'idle',
          inspectionStartedAt: null,
          solveStartedAt: null,
          lastResult: { elapsedMs, penalty },
        }
      }
      return state
  }
}
