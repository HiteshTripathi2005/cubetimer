import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ImportExportDialog } from './ImportExportDialog'

describe('ImportExportDialog', () => {
  it('calls onExport with the chosen scope', () => {
    const onExport = vi.fn()
    render(<ImportExportDialog onExport={onExport} onImport={vi.fn()} onClose={vi.fn()} />)
    fireEvent.click(screen.getByText(/settings \+ all solves/i))
    fireEvent.click(screen.getByRole('button', { name: /download/i }))
    expect(onExport).toHaveBeenCalledWith({ includeSettings: true, sessionIds: 'all' })
  })
})
