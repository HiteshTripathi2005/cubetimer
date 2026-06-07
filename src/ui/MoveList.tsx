interface Props {
  solution: string[]
  playbackIndex: number
}

export function MoveList({ solution, playbackIndex }: Props) {
  return (
    <div>
      <div className="text-sm text-zinc-500 mb-1">{playbackIndex} / {solution.length}</div>
      <div className="flex flex-wrap gap-1 font-mono text-sm">
        {solution.map((m, i) => (
          <span
            key={i}
            data-testid={`move-${i}`}
            data-current={i === playbackIndex ? 'true' : 'false'}
            className={`px-1.5 py-0.5 rounded ${
              i < playbackIndex ? 'text-zinc-400'
              : i === playbackIndex ? 'bg-indigo-600 text-white'
              : 'text-zinc-700 dark:text-zinc-200'
            }`}
          >
            {m}
          </span>
        ))}
      </div>
    </div>
  )
}
