import type { PuzzleEvent, Session } from '../types'

export const DEFAULT_EVENT: PuzzleEvent = '333'

// Picker order + display labels. Ids are the scramble types scrambow accepts.
export const EVENTS: { id: PuzzleEvent; label: string }[] = [
  { id: '222', label: '2×2' },
  { id: '333', label: '3×3' },
  { id: '444', label: '4×4' },
  { id: '555', label: '5×5' },
  { id: '666', label: '6×6' },
  { id: '777', label: '7×7' },
  { id: 'pyram', label: 'Pyraminx' },
  { id: 'skewb', label: 'Skewb' },
  { id: 'minx', label: 'Megaminx' },
  { id: 'sq1', label: 'Square-1' },
  { id: 'clock', label: 'Clock' },
]

export function eventLabel(event: PuzzleEvent): string {
  return EVENTS.find((e) => e.id === event)?.label ?? event
}

/** A session's event, defaulting legacy sessions (no event) to 3×3. */
export function eventOf(session: Session | undefined): PuzzleEvent {
  return session?.event ?? DEFAULT_EVENT
}
