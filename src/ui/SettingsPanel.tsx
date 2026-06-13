import type { Settings } from '../types'
import { Dropdown } from './Dropdown'

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
      <div className="flex items-center justify-between gap-3">
        <span>Decimals</span>
        <Dropdown
          ariaLabel="Decimals"
          value={String(settings.decimalPlaces)}
          options={[{ value: '2', label: '2' }, { value: '3', label: '3' }]}
          onChange={(v) => onChange({ decimalPlaces: Number(v) as 2 | 3 })}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <span>Theme</span>
        <Dropdown
          ariaLabel="Theme"
          value={settings.theme}
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
          onChange={(v) => onChange({ theme: v as Settings['theme'] })}
        />
      </div>
      <button type="button" onClick={onOpenTransfer}
        className="mt-2 rounded-md bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-500">
        Export / Import data…
      </button>
    </div>
  )
}
