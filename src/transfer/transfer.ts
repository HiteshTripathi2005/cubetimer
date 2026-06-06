import { EXPORT_VERSION, type ExportFile, type Session, type Settings, type Solve } from '../types'

export interface ExportOptions {
  includeSettings: boolean
  /** null = no solve data; 'all' = every session; string[] = those session ids */
  sessionIds: 'all' | string[] | null
}

export function buildExport(
  opts: ExportOptions,
  settings: Settings,
  sessions: Session[],
  solves: Solve[],
  now = 0,
): ExportFile {
  const file: ExportFile = { version: EXPORT_VERSION, exportedAt: now }
  if (opts.includeSettings) file.settings = settings
  if (opts.sessionIds !== null) {
    const ids = opts.sessionIds === 'all' ? sessions.map((s) => s.id) : opts.sessionIds
    const idSet = new Set(ids)
    file.sessions = sessions.filter((s) => idSet.has(s.id))
    file.solves = solves.filter((s) => idSet.has(s.sessionId))
  }
  return file
}

export function downloadExport(file: ExportFile, filename: string): void {
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url) }, 0)
}

function migrate(file: ExportFile): ExportFile {
  // Only version 1 exists today; future migrations branch here.
  return file
}

export function parseImport(text: string): ExportFile {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('File is not valid JSON.')
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) throw new Error('Unexpected file contents.')
  const obj = data as Record<string, unknown>
  if (typeof obj.version !== 'number') throw new Error('Missing version field.')
  if (obj.version > EXPORT_VERSION) throw new Error('File is from a newer version of CubeTimer.')
  if (typeof obj.exportedAt !== 'number') throw new Error('Missing or invalid exportedAt field.')
  return migrate(obj as unknown as ExportFile)
}
