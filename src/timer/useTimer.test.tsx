import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { useTimer } from './useTimer'

function Harness({ onSolve }: { onSolve: (ms: number, p: string) => void }) {
  const { phase, display } = useTimer({
    config: { inspection: false, holdToStartMs: 300 },
    onSolve: (ms, p) => onSolve(ms, p),
  })
  return (
    <div>
      <span data-testid="phase">{phase}</span>
      <span data-testid="display">{display}</span>
    </div>
  )
}

describe('useTimer', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('runs a full press/hold/release/stop cycle and reports a solve', () => {
    const onSolve = vi.fn()
    render(<Harness onSolve={onSolve} />)

    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' })) })
    expect(screen.getByTestId('phase').textContent).toBe('holding')

    act(() => { vi.advanceTimersByTime(300) })
    expect(screen.getByTestId('phase').textContent).toBe('ready')

    act(() => { window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' })) })
    expect(screen.getByTestId('phase').textContent).toBe('running')

    act(() => { vi.advanceTimersByTime(1234) })
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' })) })

    expect(onSolve).toHaveBeenCalledTimes(1)
    const [ms, penalty] = onSolve.mock.calls[0]
    expect(ms).toBeGreaterThanOrEqual(1234)
    expect(penalty).toBe('none')
    expect(screen.getByTestId('phase').textContent).toBe('idle')
  })
})
