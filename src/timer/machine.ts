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
  // Inspection countdown reached 0 — start the solve automatically.
  | { type: 'AUTO_START'; now: number }

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
      // Full 15s inspection elapsed → start the solve, no penalty. Fires from
      // inspecting OR while the user is holding to arm (see below).
      if (event.type === 'AUTO_START') {
        return { ...state, phase: 'running', solveStartedAt: event.now, inspectionStartedAt: null }
      }
      return state // RELEASE/others ignored; countdown handled by the hook

    case 'holding':
      if (event.type === 'HOLD_ELAPSED') return { ...state, phase: 'ready' }
      if (event.type === 'AUTO_START') {
        return { ...state, phase: 'running', solveStartedAt: event.now, inspectionStartedAt: null }
      }
      if (event.type === 'RELEASE') {
        // released before armed -> cancel
        return state.inspectionStartedAt !== null
          ? { ...state, phase: 'inspecting' }
          : { ...initialTimerState() }
      }
      return state

    case 'ready':
      if (event.type === 'AUTO_START') {
        return { ...state, phase: 'running', solveStartedAt: event.now, inspectionStartedAt: null }
      }
      if (event.type === 'RELEASE') {
        return { ...state, phase: 'running', solveStartedAt: event.now }
      }
      return state

    case 'running':
      if (event.type === 'STOP') {
        if (state.solveStartedAt === null) return state
        const solveStartedAt = state.solveStartedAt
        const elapsedMs = event.now - solveStartedAt
        const penalty = inspectionPenalty(state.inspectionStartedAt, solveStartedAt)
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
