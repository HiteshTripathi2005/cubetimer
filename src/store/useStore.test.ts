import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { useStore, __resetInitForTests } from './useStore'
import { replaceAll } from '../storage/db'
import { SETTINGS_KEY } from '../storage/settings'

beforeEach(async () => {
  localStorage.clear()
  await replaceAll([], [])
  // reset store to a clean slate between tests
  useStore.setState({ ready: false, sessions: [], solves: [], scramble: '' })
  // Fix 3: reset the module-level init guard so each test can call init() cleanly
  __resetInitForTests()
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

  it('is idempotent — double init does not duplicate the default session', async () => {
    await useStore.getState().init()
    // Second call must be blocked by the module guard (initStarted is still true)
    await useStore.getState().init()
    const st = useStore.getState()
    expect(st.sessions.length).toBe(1)
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

describe('importData', () => {
  it('replace mode: replaces all data and falls back active session correctly', async () => {
    await useStore.getState().init()
    // Seed a solve in the original session
    await useStore.getState().addSolve(9000, 'none')
    expect(useStore.getState().solves.length).toBe(1)

    // Import a fresh set of sessions+solves in replace mode
    await useStore.getState().importData(
      {
        version: 1,
        exportedAt: 0,
        sessions: [{ id: 'imp', name: 'Imported', createdAt: 1 }],
        solves: [{ id: 's1', sessionId: 'imp', timeMs: 5000, penalty: 'none', scramble: '', createdAt: 1 }],
      },
      'replace',
    )

    const st = useStore.getState()
    // Only the imported session should exist
    expect(st.sessions.length).toBe(1)
    expect(st.sessions[0].id).toBe('imp')
    // Active session should have been corrected to the imported one
    expect(st.settings.activeSessionId).toBe('imp')
    // Solves for the active session should be the imported solve
    expect(st.solves.length).toBe(1)
    expect(st.solves[0].id).toBe('s1')
  })
})
