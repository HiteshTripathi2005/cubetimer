import { describe, it, expect } from 'vitest'
import { buildExport, parseImport } from './transfer'
import { EXPORT_VERSION, type Session, type Solve, type Settings } from '../types'

const settings: Settings = {
  theme: 'system', inspection: false, inspectionAudioCues: true,
  holdToStartMs: 300, distractionFree: false, decimalPlaces: 2, activeSessionId: 's1',
  profile: { name: '', avatar: null, info: '' },
}
const sessions: Session[] = [
  { id: 's1', name: 'Main', createdAt: 1 },
  { id: 's2', name: 'OH', createdAt: 2 },
]
const solves: Solve[] = [
  { id: 'a', sessionId: 's1', timeMs: 1000, penalty: 'none', scramble: 'R', createdAt: 1 },
  { id: 'b', sessionId: 's2', timeMs: 2000, penalty: 'none', scramble: 'U', createdAt: 2 },
]

describe('buildExport', () => {
  it('settings only', () => {
    const f = buildExport({ includeSettings: true, sessionIds: null }, settings, sessions, solves)
    expect(f.version).toBe(EXPORT_VERSION)
    expect(f.settings).toBeDefined()
    expect(f.sessions).toBeUndefined()
    expect(f.solves).toBeUndefined()
  })

  it('settings + all solves', () => {
    const f = buildExport({ includeSettings: true, sessionIds: 'all' }, settings, sessions, solves)
    expect(f.sessions?.length).toBe(2)
    expect(f.solves?.length).toBe(2)
  })

  it('specific sessions only includes their solves', () => {
    const f = buildExport({ includeSettings: false, sessionIds: ['s1'] }, settings, sessions, solves)
    expect(f.settings).toBeUndefined()
    expect(f.sessions?.map((s) => s.id)).toEqual(['s1'])
    expect(f.solves?.map((s) => s.id)).toEqual(['a'])
  })
})

describe('parseImport', () => {
  it('round-trips a built export', () => {
    const f = buildExport({ includeSettings: true, sessionIds: 'all' }, settings, sessions, solves)
    const parsed = parseImport(JSON.stringify(f))
    expect(parsed).toEqual(f)
  })

  it('rejects invalid json', () => {
    expect(() => parseImport('{nope')).toThrow()
  })

  it('rejects missing/invalid version', () => {
    expect(() => parseImport(JSON.stringify({ foo: 1 }))).toThrow()
  })

  it('rejects a newer-than-supported version', () => {
    expect(() => parseImport(JSON.stringify({ version: 999, exportedAt: 0 }))).toThrow()
  })

  it('rejects an array (not a plain object)', () => {
    expect(() => parseImport('[]')).toThrow()
  })

  it('rejects object with version but missing exportedAt', () => {
    expect(() => parseImport(JSON.stringify({ version: 1 }))).toThrow()
  })
})
