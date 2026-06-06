interface Props {
  scramble: string
  onNewScramble: () => void
}

export function ScrambleBar({ scramble, onNewScramble }: Props) {
  return (
    <div className="flex items-start gap-3">
      <p className="flex-1 text-center text-lg sm:text-xl font-medium tracking-wide text-zinc-700 dark:text-zinc-200">
        {scramble}
      </p>
      <button
        type="button"
        onClick={onNewScramble}
        className="shrink-0 rounded-md px-3 py-1 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        aria-label="New scramble"
      >
        ↻
      </button>
    </div>
  )
}
