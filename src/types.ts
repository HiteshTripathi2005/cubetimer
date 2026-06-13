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

// WCA-style puzzle events Turnix can time (scrambles via scrambow).
export type PuzzleEvent =
  | '222' | '333' | '444' | '555' | '666' | '777'
  | 'pyram' | 'skewb' | 'minx' | 'sq1' | 'clock'

export interface Session {
  id: string
  name: string
  createdAt: number
  /** Puzzle this session times. Absent on legacy sessions → treated as 3×3. */
  event?: PuzzleEvent
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
