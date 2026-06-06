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

interface StoreState {
  ready: boolean
  settings: Settings
  sessions: Session[]
  solves: Solve[]
  scramble: string

  init: () => Promise<void>
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

export const useStore = create<StoreState>((set, get) => ({
  ready: false,
  settings: defaultSettings('placeholder'),
  sessions: [],
  solves: [],
  scramble: '',

  init: async () => {
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
    set({ ready: true, settings, sessions, solves, scramble: scrambleSource.next() })
  },

  newScramble: () => set({ scramble: scrambleSource.next() }),

  addSolve: async (timeMs, penalty) => {
    const { settings, solves } = get()
    const solve: Solve = {
      id: uid(), sessionId: settings.activeSessionId, timeMs, penalty,
      scramble: get().scramble, createdAt: Date.now(),
    }
    await putSolve(solve)
    set({ solves: [...solves, solve], scramble: scrambleSource.next() })
  },

  setPenalty: async (id, penalty) => {
    const solve = get().solves.find((s) => s.id === id)
    if (!solve) return
    const updated = { ...solve, penalty }
    await putSolve(updated)
    set({ solves: get().solves.map((s) => (s.id === id ? updated : s)) })
  },

  setComment: async (id, comment) => {
    const solve = get().solves.find((s) => s.id === id)
    if (!solve) return
    const updated = { ...solve, comment }
    await putSolve(updated)
    set({ solves: get().solves.map((s) => (s.id === id ? updated : s)) })
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
    if (file.sessions && file.solves) {
      if (mode === 'replace') await replaceAll(file.sessions, file.solves)
      else await bulkPut(file.sessions, file.solves)
    }
    const sessions = await getAllSessions()
    let settings = get().settings
    if (!sessions.some((s) => s.id === settings.activeSessionId) && sessions.length) {
      settings = { ...settings, activeSessionId: sessions[0].id }
      saveSettings(settings)
    }
    const solves = sessions.length ? await getSolvesBySession(settings.activeSessionId) : []
    set({ sessions, settings, solves })
  },
}))
