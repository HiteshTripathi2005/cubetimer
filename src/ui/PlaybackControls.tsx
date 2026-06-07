interface Props {
  isPlaying: boolean
  speedMs: number
  onPlay: () => void
  onPause: () => void
  onStepForward: () => void
  onStepBack: () => void
  onSpeed: (ms: number) => void
}

export function PlaybackControls({ isPlaying, speedMs, onPlay, onPause, onStepForward, onStepBack, onSpeed }: Props) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label="Step back" onClick={onStepBack} className="px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800">⏮</button>
      {isPlaying
        ? <button type="button" aria-label="Pause" onClick={onPause} className="px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800">⏸</button>
        : <button type="button" aria-label="Play" onClick={onPlay} className="px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800">▶</button>}
      <button type="button" aria-label="Step forward" onClick={onStepForward} className="px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800">⏭</button>
      <label className="flex items-center gap-1 text-xs text-zinc-500 ml-2">
        Speed
        <input
          aria-label="Speed"
          type="range"
          min={150}
          max={1200}
          step={50}
          value={speedMs}
          onChange={(e) => onSpeed(Number(e.target.value))}
        />
      </label>
    </div>
  )
}
