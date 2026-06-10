import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMovePlayback } from './useMovePlayback'

const MOVES = ['R', 'U', "R'"]

describe('useMovePlayback', () => {
  it('starts at 0 with the first move queued as label', () => {
    const { result } = renderHook(() => useMovePlayback(MOVES))
    expect(result.current.index).toBe(0)
    expect(result.current.animateMove).toBeNull()
    expect(result.current.currentLabel).toBe('R')
    expect(result.current.canPrev).toBe(false)
    expect(result.current.canNext).toBe(true)
  })

  it('next animates the move and commits the index when finished', () => {
    const { result } = renderHook(() => useMovePlayback(MOVES))
    act(() => result.current.next())
    expect(result.current.animateMove).toBe('R')
    expect(result.current.index).toBe(0) // not committed yet
    act(() => result.current.onMoveAnimated())
    expect(result.current.index).toBe(1)
    expect(result.current.animateMove).toBeNull()
  })

  it('prev animates the inverse of the previous move', () => {
    const { result } = renderHook(() => useMovePlayback(MOVES))
    act(() => result.current.next())
    act(() => result.current.onMoveAnimated())
    act(() => result.current.prev())
    expect(result.current.animateMove).toBe("R'")
    act(() => result.current.onMoveAnimated())
    expect(result.current.index).toBe(0)
  })

  it('play chains moves and pauses at the end', () => {
    const { result } = renderHook(() => useMovePlayback(MOVES))
    act(() => result.current.play())
    expect(result.current.isPlaying).toBe(true)
    act(() => result.current.onMoveAnimated()) // R done → U starts
    expect(result.current.animateMove).toBe('U')
    act(() => result.current.onMoveAnimated())
    expect(result.current.animateMove).toBe("R'")
    act(() => result.current.onMoveAnimated())
    expect(result.current.index).toBe(3)
    expect(result.current.isPlaying).toBe(false)
    expect(result.current.canNext).toBe(false)
  })

  it('restart returns to the start', () => {
    const { result } = renderHook(() => useMovePlayback(MOVES))
    act(() => result.current.next())
    act(() => result.current.onMoveAnimated())
    act(() => result.current.restart())
    expect(result.current.index).toBe(0)
    expect(result.current.animateMove).toBeNull()
  })
})
