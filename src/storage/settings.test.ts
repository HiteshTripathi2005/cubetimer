import { describe, it, expect, beforeEach } from 'vitest'
import { defaultSettings, loadSettings, saveSettings, SETTINGS_KEY } from './settings'

describe('settings storage', () => {
  beforeEach(() => localStorage.clear())

  it('defaultSettings uses the given session id and sane defaults', () => {
    const s = defaultSettings('sess-1')
    expect(s.activeSessionId).toBe('sess-1')
    expect(s.inspection).toBe(true)
    expect(s.holdToStartMs).toBe(300)
    expect(s.decimalPlaces).toBe(2)
  })

  it('returns null when nothing stored', () => {
    expect(loadSettings()).toBeNull()
  })

  it('round-trips through save/load', () => {
    const s = defaultSettings('sess-1')
    saveSettings({ ...s, inspection: true })
    expect(loadSettings()?.inspection).toBe(true)
  })

  it('returns null on corrupt data', () => {
    localStorage.setItem(SETTINGS_KEY, '{not json')
    expect(loadSettings()).toBeNull()
  })
})
