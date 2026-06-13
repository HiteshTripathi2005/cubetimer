import { useEffect, useRef, useState } from 'react'

export interface DropdownOption {
  value: string
  label: string
}

interface Props {
  value: string
  options: DropdownOption[]
  onChange: (value: string) => void
  ariaLabel: string
  className?: string
}

// Custom select: fully theme-controlled so options are always readable, unlike
// native <select> popups whose colors the OS/WebView render inconsistently.
export function Dropdown({ value, options, onChange, ariaLabel, className }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-transparent px-2 py-1 text-sm font-medium text-zinc-800 dark:text-zinc-100 ${className ?? ''}`}
      >
        <span className="truncate">{current?.label ?? value}</span>
        <span aria-hidden className="text-xs opacity-60">▾</span>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 z-50 mt-1 max-h-64 min-w-full overflow-auto rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-1 shadow-lg"
        >
          {options.map((o) => (
            <li key={o.value} role="option" aria-selected={o.value === value}>
              <button
                type="button"
                onClick={() => { onChange(o.value); setOpen(false) }}
                className={`block w-full whitespace-nowrap px-3 py-1.5 text-left text-sm ${
                  o.value === value
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                }`}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
