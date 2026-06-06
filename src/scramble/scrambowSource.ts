import { Scrambow } from 'scrambow'
import type { ScrambleSource } from './source'

export class ScrambowSource implements ScrambleSource {
  private readonly scrambow = new Scrambow().setType('333')

  next(): string {
    const result = this.scrambow.get(1)
    return result[0].scramble_string.trim()
  }
}
