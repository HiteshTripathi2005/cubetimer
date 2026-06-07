import { useState } from 'react'
import type { ExportFile } from '../types'
import type { ExportOptions } from '../transfer/transfer'
import { parseImport } from '../transfer/transfer'

interface Props {
  onExport: (opts: ExportOptions) => void
  onImport: (file: ExportFile, mode: 'merge' | 'replace') => void
  onClose: () => void
}

const SCOPE_TO_OPTS: Record<'settings' | 'all', ExportOptions> = {
  settings: { includeSettings: true, sessionIds: null },
  all: { includeSettings: true, sessionIds: 'all' },
}

export function ImportExportDialog({ onExport, onImport, onClose }: Props) {
  const [scope, setScope] = useState<'settings' | 'all'>('all')
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File, mode: 'merge' | 'replace') => {
    try {
      const text = await file.text()
      onImport(parseImport(text), mode)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-[min(28rem,92vw)] rounded-xl bg-white dark:bg-zinc-900 p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-3">Export / Import</h2>

        <fieldset className="mb-4">
          <legend className="text-sm text-zinc-500 mb-2">What to export</legend>
          <label className="flex items-center gap-2 py-1">
            <input type="radio" name="scope" checked={scope === 'settings'} onChange={() => setScope('settings')} />
            <span>Settings only</span>
          </label>
          <label className="flex items-center gap-2 py-1">
            <input type="radio" name="scope" checked={scope === 'all'} onChange={() => setScope('all')} />
            <span>Settings + all solves</span>
          </label>
          <button type="button" onClick={() => onExport(SCOPE_TO_OPTS[scope])}
            className="mt-2 rounded-md bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-500">
            Download file
          </button>
        </fieldset>

        <fieldset className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
          <legend className="text-sm text-zinc-500 mb-2">Import a file</legend>
          <div className="flex gap-2">
            <label className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 cursor-pointer">
              Merge
              <input type="file" accept="application/json" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f, 'merge') }} />
            </label>
            <label className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 cursor-pointer">
              Replace
              <input type="file" accept="application/json" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f, 'replace') }} />
            </label>
          </div>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        </fieldset>

        <div className="mt-4 text-right">
          <button type="button" onClick={onClose} className="text-sm text-zinc-500 hover:text-zinc-900">Close</button>
        </div>
      </div>
    </div>
  )
}
