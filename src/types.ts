export type Penalty = 'none' | 'plus2' | 'dnf'

export interface Solve {
  id: string
  sessionId: string
  timeMs: number          // raw recorded time, excluding penalty
  penalty: Penalty
  scramble: string
  createdAt: number       // epoch ms
  comment?: string
}

export interface Session {
  id: string
  name: string
  createdAt: number
}

export type ThemeMode = 'light' | 'dark' | 'system'

export interface Profile {
  name: string
  avatar: string | null  // data URL of a small image, or null
  info: string           // free-form note the user can fill in
}

export interface Settings {
  theme: ThemeMode
  inspection: boolean
  inspectionAudioCues: boolean
  holdToStartMs: number
  distractionFree: boolean
  decimalPlaces: 2 | 3
  activeSessionId: string
  profile: Profile
}

export interface ExportFile {
  version: number
  exportedAt: number
  settings?: Settings
  sessions?: Session[]
  solves?: Solve[]
}

export const EXPORT_VERSION = 1
