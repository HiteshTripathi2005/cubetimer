import type { Settings } from '../types'

interface Props {
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
  onOpenTransfer: () => void
}

export function SettingsPanel({ settings, onChange, onOpenTransfer }: Props) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <label className="flex items-center justify-between gap-3">
        <span>Inspection (15s)</span>
        <input type="checkbox" checked={settings.inspection}
          onChange={(e) => onChange({ inspection: e.target.checked })} />
      </label>
      <label className="flex items-center justify-between gap-3">
        <span>Inspection audio cues</span>
        <input type="checkbox" checked={settings.inspectionAudioCues}
          onChange={(e) => onChange({ inspectionAudioCues: e.target.checked })} />
      </label>
      <label className="flex items-center justify-between gap-3">
        <span>Distraction-free</span>
        <input type="checkbox" checked={settings.distractionFree}
          onChange={(e) => onChange({ distractionFree: e.target.checked })} />
      </label>
      <label className="flex items-center justify-between gap-3">
        <span>Decimals</span>
        <select value={settings.decimalPlaces}
          onChange={(e) => onChange({ decimalPlaces: Number(e.target.value) as 2 | 3 })}
          className="rounded border border-zinc-200 dark:border-zinc-700 bg-transparent px-2 py-1">
          <option value={2}>2</option>
          <option value={3}>3</option>
        </select>
      </label>
      <label className="flex items-center justify-between gap-3">
        <span>Theme</span>
        <select value={settings.theme}
          onChange={(e) => onChange({ theme: e.target.value as Settings['theme'] })}
          className="rounded border border-zinc-200 dark:border-zinc-700 bg-transparent px-2 py-1">
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
      <button type="button" onClick={onOpenTransfer}
        className="mt-2 rounded-md bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-500">
        Export / Import data…
      </button>
    </div>
  )
}
