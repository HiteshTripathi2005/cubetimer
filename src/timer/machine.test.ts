import { describe, it, expect } from 'vitest'
import { initialTimerState, reduce, type TimerConfig } from './machine'

const noInspect: TimerConfig = { inspection: false, holdToStartMs: 300 }
const withInspect: TimerConfig = { inspection: true, holdToStartMs: 300 }

describe('timer machine (no inspection)', () => {
  it('press -> hold elapsed -> ready -> release starts running', () => {
    let st = initialTimerState()
    st = reduce(st, { type: 'PRESS', now: 0 }, noInspect)
    expect(st.phase).toBe('holding')
    st = reduce(st, { type: 'HOLD_ELAPSED', now: 300 }, noInspect)
    expect(st.phase).toBe('ready')
    st = reduce(st, { type: 'RELEASE', now: 350 }, noInspect)
    expect(st.phase).toBe('running')
    expect(st.solveStartedAt).toBe(350)
  })

  it('releasing before ready cancels back to idle', () => {
    let st = initialTimerState()
    st = reduce(st, { type: 'PRESS', now: 0 }, noInspect)
    st = reduce(st, { type: 'RELEASE', now: 100 }, noInspect) // before HOLD_ELAPSED
    expect(st.phase).toBe('idle')
    expect(st.lastResult).toBeNull()
  })

  it('STOP records elapsed time with no penalty', () => {
    let st = initialTimerState()
    st = reduce(st, { type: 'PRESS', now: 0 }, noInspect)
    st = reduce(st, { type: 'HOLD_ELAPSED', now: 300 }, noInspect)
    st = reduce(st, { type: 'RELEASE', now: 300 }, noInspect)
    st = reduce(st, { type: 'STOP', now: 12300 }, noInspect)
    expect(st.phase).toBe('idle')
    expect(st.lastResult).toEqual({ elapsedMs: 12000, penalty: 'none' })
  })
})

describe('timer machine (inspection)', () => {
  it('first press starts inspection; hold+release starts solve', () => {
    let st = initialTimerState()
    st = reduce(st, { type: 'PRESS', now: 0 }, withInspect)
    expect(st.phase).toBe('inspecting')
    st = reduce(st, { type: 'RELEASE', now: 50 }, withInspect) // ignored
    expect(st.phase).toBe('inspecting')
    st = reduce(st, { type: 'PRESS', now: 5000 }, withInspect)
    expect(st.phase).toBe('holding')
    st = reduce(st, { type: 'HOLD_ELAPSED', now: 5300 }, withInspect)
    st = reduce(st, { type: 'RELEASE', now: 5300 }, withInspect)
    expect(st.phase).toBe('running')
  })

  it('+2 when inspection exceeds 15s at solve start', () => {
    let st = initialTimerState()
    st = reduce(st, { type: 'PRESS', now: 0 }, withInspect)
    st = reduce(st, { type: 'PRESS', now: 15500 }, withInspect)
    st = reduce(st, { type: 'HOLD_ELAPSED', now: 15800 }, withInspect)
    st = reduce(st, { type: 'RELEASE', now: 15800 }, withInspect)
    st = reduce(st, { type: 'STOP', now: 25800 }, withInspect)
    expect(st.lastResult).toEqual({ elapsedMs: 10000, penalty: 'plus2' })
  })

  it('DNF when inspection exceeds 17s at solve start', () => {
    let st = initialTimerState()
    st = reduce(st, { type: 'PRESS', now: 0 }, withInspect)
    st = reduce(st, { type: 'PRESS', now: 17500 }, withInspect)
    st = reduce(st, { type: 'HOLD_ELAPSED', now: 17800 }, withInspect)
    st = reduce(st, { type: 'RELEASE', now: 17800 }, withInspect)
    st = reduce(st, { type: 'STOP', now: 27800 }, withInspect)
    expect(st.lastResult).toEqual({ elapsedMs: 10000, penalty: 'dnf' })
  })

  it('AUTO_START at 15s starts the solve with no penalty', () => {
    let st = initialTimerState()
    st = reduce(st, { type: 'PRESS', now: 0 }, withInspect)
    st = reduce(st, { type: 'AUTO_START', now: 15000 }, withInspect)
    expect(st.phase).toBe('running')
    expect(st.solveStartedAt).toBe(15000)
    expect(st.inspectionStartedAt).toBeNull()
    st = reduce(st, { type: 'STOP', now: 25000 }, withInspect)
    expect(st.lastResult).toEqual({ elapsedMs: 10000, penalty: 'none' })
  })

  it('AUTO_START fires while holding/ready, not just inspecting', () => {
    let st = initialTimerState()
    st = reduce(st, { type: 'PRESS', now: 0 }, withInspect)
    st = reduce(st, { type: 'PRESS', now: 5000 }, withInspect) // second press → holding
    expect(st.phase).toBe('holding')
    st = reduce(st, { type: 'AUTO_START', now: 15000 }, withInspect)
    expect(st.phase).toBe('running')
    expect(st.solveStartedAt).toBe(15000)
    st = reduce(st, { type: 'STOP', now: 25000 }, withInspect)
    expect(st.lastResult).toEqual({ elapsedMs: 10000, penalty: 'none' })
  })

  it('none penalty when inspection is under 15s', () => {
    let st = initialTimerState()
    st = reduce(st, { type: 'PRESS', now: 0 }, withInspect)
    st = reduce(st, { type: 'PRESS', now: 5000 }, withInspect)
    st = reduce(st, { type: 'HOLD_ELAPSED', now: 5300 }, withInspect)
    st = reduce(st, { type: 'RELEASE', now: 5300 }, withInspect)
    st = reduce(st, { type: 'STOP', now: 15300 }, withInspect)
    expect(st.lastResult).toEqual({ elapsedMs: 10000, penalty: 'none' })
  })

  it('none penalty at boundary of exactly 15000ms inspection (strict greater-than)', () => {
    let st = initialTimerState()
    st = reduce(st, { type: 'PRESS', now: 0 }, withInspect)
    st = reduce(st, { type: 'PRESS', now: 14700 }, withInspect)
    st = reduce(st, { type: 'HOLD_ELAPSED', now: 15000 }, withInspect)
    st = reduce(st, { type: 'RELEASE', now: 15000 }, withInspect)
    st = reduce(st, { type: 'STOP', now: 25000 }, withInspect)
    expect(st.lastResult).toEqual({ elapsedMs: 10000, penalty: 'none' })
  })

  it('plus2 penalty at boundary of exactly 17000ms inspection (strict greater-than)', () => {
    let st = initialTimerState()
    st = reduce(st, { type: 'PRESS', now: 0 }, withInspect)
    st = reduce(st, { type: 'PRESS', now: 16700 }, withInspect)
    st = reduce(st, { type: 'HOLD_ELAPSED', now: 17000 }, withInspect)
    st = reduce(st, { type: 'RELEASE', now: 17000 }, withInspect)
    st = reduce(st, { type: 'STOP', now: 27000 }, withInspect)
    expect(st.lastResult).toEqual({ elapsedMs: 10000, penalty: 'plus2' })
  })
})
