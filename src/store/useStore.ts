import { create } from 'zustand'
import type { ExportFile, Penalty, Session, Settings, Solve } from '../types'
import { uid } from '../lib/uid'
import { defaultSettings, loadSettings, saveSettings } from '../storage/settings'
import {
  bulkPut, deleteSession as dbDeleteSession, deleteSolve as dbDeleteSolve,
  getAllSessions, getSolvesBySession, putSession, putSolve, replaceAll,
} from '../storage/db'
import { ScrambowSource } from '../scramble/scrambowSource'
import type { ScrambleSource } from '../scramble/source'

const scrambleSource: ScrambleSource = new ScrambowSource()

// Fix 2: safe scramble wrapper — one retry, then sentinel fallback.
const SCRAMBLE_FALLBACK = '— scramble unavailable —'
function safeScramble(): string {
  try {
    return scrambleSource.next()
  } catch {
    try {
      return scrambleSource.next()
    } catch {
      return SCRAMBLE_FALLBACK
    }
  }
}

// Module-level guard to ensure init runs only once per app lifecycle.
// Exported so tests can reset it between runs.
let initStarted = false
export function __resetInitForTests(): void {
  initStarted = false
}

interface StoreState {
  ready: boolean
  settings: Settings
  sessions: Session[]
  solves: Solve[]
  scramble: string
  /** True while a solve is in progress (inspection → running) — drives focus mode. */
  solving: boolean

  init: () => Promise<void>
  setSolving: (v: boolean) => void
  newScramble: () => void
  addSolve: (timeMs: number, penalty: Penalty) => Promise<void>
  setPenalty: (id: string, penalty: Penalty) => Promise<void>
  setComment: (id: string, comment: string) => Promise<void>
  deleteSolve: (id: string) => Promise<void>
  createSession: (name: string) => Promise<void>
  renameSession: (id: string, name: string) => Promise<void>
  deleteSession: (id: string) => Promise<void>
  switchSession: (id: string) => Promise<void>
  updateSettings: (patch: Partial<Settings>) => void
  importData: (file: ExportFile, mode: 'merge' | 'replace') => Promise<void>
}

// Private helper: update a solve by id with a partial patch, persist, and reflect in state.
async function updateSolveFields(
  get: () => StoreState,
  set: (partial: Partial<StoreState>) => void,
  id: string,
  patch: Partial<Solve>,
): Promise<void> {
  const solve = get().solves.find((s) => s.id === id)
  if (!solve) return
  const updated = { ...solve, ...patch }
  await putSolve(updated)
  set({ solves: get().solves.map((s) => (s.id === id ? updated : s)) })
}

export const useStore = create<StoreState>((set, get) => ({
  ready: false,
  settings: defaultSettings('placeholder'),
  sessions: [],
  solves: [],
  scramble: '',
  solving: false,

  setSolving: (v) => set({ solving: v }),

  init: async () => {
    // Fix 3: idempotent init — module-level guard prevents double-run in StrictMode.
    if (initStarted) return
    initStarted = true

    try {
      let sessions = await getAllSessions()
      if (sessions.length === 0) {
        const session: Session = { id: uid(), name: 'Main', createdAt: Date.now() }
        await putSession(session)
        sessions = [session]
      }
      let settings = loadSettings()
      if (!settings || !sessions.some((s) => s.id === settings!.activeSessionId)) {
        settings = defaultSettings(sessions[0].id)
        saveSettings(settings)
      }
      const solves = await getSolvesBySession(settings.activeSessionId)
      set({ ready: true, settings, sessions, solves, scramble: safeScramble() })
    } catch {
      // Fix 1: DB failure fallback — never leave ready=false / hang on loading screen.
      const session: Session = { id: uid(), name: 'Main', createdAt: Date.now() }
      const settings = defaultSettings(session.id)
      set({ ready: true, settings, sessions: [session], solves: [], scramble: safeScramble() })
    }
  },

  newScramble: () => set({ scramble: safeScramble() }),

  addSolve: async (timeMs, penalty) => {
    const { settings } = get()
    const solve: Solve = {
      id: uid(), sessionId: settings.activeSessionId, timeMs, penalty,
      scramble: get().scramble, createdAt: Date.now(),
    }
    await putSolve(solve)
    // Fix 4: read fresh solves after await to avoid concurrency loss.
    set({ solves: [...get().solves, solve], scramble: safeScramble() })
  },

  // Fix 5: delegate to shared private helper.
  setPenalty: async (id, penalty) => {
    await updateSolveFields(get, set, id, { penalty })
  },

  setComment: async (id, comment) => {
    await updateSolveFields(get, set, id, { comment })
  },

  deleteSolve: async (id) => {
    await dbDeleteSolve(id)
    set({ solves: get().solves.filter((s) => s.id !== id) })
  },

  createSession: async (name) => {
    const session: Session = { id: uid(), name: name.trim() || 'Session', createdAt: Date.now() }
    await putSession(session)
    set({ sessions: [...get().sessions, session] })
    await get().switchSession(session.id)
  },

  renameSession: async (id, name) => {
    const session = get().sessions.find((s) => s.id === id)
    if (!session) return
    const updated = { ...session, name: name.trim() || session.name }
    await putSession(updated)
    set({ sessions: get().sessions.map((s) => (s.id === id ? updated : s)) })
  },

  deleteSession: async (id) => {
    if (get().sessions.length <= 1) return // keep at least one
    await dbDeleteSession(id)
    const sessions = get().sessions.filter((s) => s.id !== id)
    set({ sessions })
    if (get().settings.activeSessionId === id) await get().switchSession(sessions[0].id)
  },

  switchSession: async (id) => {
    const settings = { ...get().settings, activeSessionId: id }
    saveSettings(settings)
    const solves = await getSolvesBySession(id)
    set({ settings, solves })
  },

  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch }
    saveSettings(settings)
    set({ settings })
  },

  importData: async (file, mode) => {
    if (file.settings) {
      saveSettings(file.settings)
      set({ settings: file.settings })
    }

    // Fix 1: handle sessions/solves independently — a valid ExportFile may have one without the other.
    if (file.sessions !== undefined || file.solves !== undefined) {
      const sessions = file.sessions ?? []
      const solves = file.solves ?? []
      if (mode === 'replace') {
        await replaceAll(sessions, solves)
      } else {
        await bulkPut(sessions, solves)
      }
    }

    let sessions = await getAllSessions()

    // Fix 2: if DB is now empty (e.g. replace with empty sessions), create a default session.
    if (sessions.length === 0) {
      const session: Session = { id: uid(), name: 'Main', createdAt: Date.now() }
      await putSession(session)
      sessions = [session]
    }

    let settings = get().settings
    if (!sessions.some((s) => s.id === settings.activeSessionId)) {
      settings = { ...settings, activeSessionId: sessions[0].id }
      saveSettings(settings)
    }
    const solves = await getSolvesBySession(settings.activeSessionId)
    set({ sessions, settings, solves })
  },
}))
