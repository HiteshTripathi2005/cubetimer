import { Scrambow } from 'scrambow'
import type { PuzzleEvent } from '../types'
import type { ScrambleSource } from './source'
import { DEFAULT_EVENT } from './events'

export class ScrambowSource implements ScrambleSource {
  // One configured Scrambow per puzzle, created on first use.
  private readonly byEvent = new Map<PuzzleEvent, Scrambow>()

  private generator(event: PuzzleEvent): Scrambow {
    let gen = this.byEvent.get(event)
    if (!gen) {
      gen = new Scrambow().setType(event)
      this.byEvent.set(event, gen)
    }
    return gen
  }

  next(event: PuzzleEvent = DEFAULT_EVENT): string {
    const result = this.generator(event).get(1)
    return result[0].scramble_string.trim()
  }
}
