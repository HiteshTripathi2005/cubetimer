import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PlaybackControls } from './PlaybackControls'

describe('PlaybackControls', () => {
  it('fires play/pause/step/speed callbacks', () => {
    const onPlay = vi.fn(), onPause = vi.fn(), onStepF = vi.fn(), onStepB = vi.fn(), onSpeed = vi.fn()
    render(
      <PlaybackControls
        isPlaying={false} speedMs={600}
        onPlay={onPlay} onPause={onPause} onStepForward={onStepF} onStepBack={onStepB} onSpeed={onSpeed}
      />,
    )
    fireEvent.click(screen.getByLabelText('Play'))
    expect(onPlay).toHaveBeenCalled()
    fireEvent.click(screen.getByLabelText('Step forward'))
    expect(onStepF).toHaveBeenCalled()
    fireEvent.click(screen.getByLabelText('Step back'))
    expect(onStepB).toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Speed'), { target: { value: '300' } })
    expect(onSpeed).toHaveBeenCalledWith(300)
  })
})
