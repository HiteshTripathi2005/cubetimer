import type { Settings } from '../types'

export const SETTINGS_KEY = 'cubetimer.settings.v1'

export function defaultSettings(activeSessionId: string): Settings {
  return {
    theme: 'system',
    inspection: false,
    inspectionAudioCues: true,
    holdToStartMs: 300,
    distractionFree: false,
    decimalPlaces: 2,
    activeSessionId,
    profile: { name: '', avatar: null, info: '' },
  }
}

export function loadSettings(): Settings | null {
  const raw = localStorage.getItem(SETTINGS_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<Settings>
    if (typeof parsed.activeSessionId !== 'string') return null
    return { ...defaultSettings(parsed.activeSessionId), ...parsed } as Settings
  } catch {
    return null
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
