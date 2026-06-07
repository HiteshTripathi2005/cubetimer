import { useEffect } from 'react'
import { useSolverStore } from '../solver/store'

export function usePlayback(): void {
  const isPlaying = useSolverStore((s) => s.isPlaying)
  const speedMs = useSolverStore((s) => s.speedMs)

  useEffect(() => {
    if (!isPlaying) return
    const id = setInterval(() => {
      const { solution, playbackIndex, setPlaybackIndex, pause } = useSolverStore.getState()
      if (!solution) { pause(); return }
      if (playbackIndex >= solution.length) { pause(); return }
      setPlaybackIndex(playbackIndex + 1)
    }, speedMs)
    return () => clearInterval(id)
  }, [isPlaying, speedMs])
}
