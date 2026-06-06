import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { useStore } from './useStore'
import { replaceAll } from '../storage/db'
import { SETTINGS_KEY } from '../storage/settings'

beforeEach(async () => {
  localStorage.clear()
  await replaceAll([], [])
  // reset store to a clean slate between tests
  useStore.setState({ ready: false, sessions: [], solves: [], scramble: '' })
})

describe('store init', () => {
  it('creates a default session on first run', async () => {
    await useStore.getState().init()
    const st = useStore.getState()
    expect(st.ready).toBe(true)
    expect(st.sessions.length).toBe(1)
    expect(st.settings.activeSessionId).toBe(st.sessions[0].id)
    expect(localStorage.getItem(SETTINGS_KEY)).not.toBeNull()
    expect(st.scramble.length).toBeGreaterThan(0)
  })
})

describe('addSolve / setPenalty / deleteSolve', () => {
  it('appends a solve, persists it, and generates a new scramble', async () => {
    await useStore.getState().init()
    const before = useStore.getState().scramble
    await useStore.getState().addSolve(12000, 'none')
    const st = useStore.getState()
    expect(st.solves.length).toBe(1)
    expect(st.solves[0].timeMs).toBe(12000)
    expect(st.scramble).not.toBe(before)
  })

  it('updates a penalty', async () => {
    await useStore.getState().init()
    await useStore.getState().addSolve(12000, 'none')
    const id = useStore.getState().solves[0].id
    await useStore.getState().setPenalty(id, 'plus2')
    expect(useStore.getState().solves[0].penalty).toBe('plus2')
  })

  it('deletes a solve', async () => {
    await useStore.getState().init()
    await useStore.getState().addSolve(12000, 'none')
    const id = useStore.getState().solves[0].id
    await useStore.getState().deleteSolve(id)
    expect(useStore.getState().solves.length).toBe(0)
  })
})
