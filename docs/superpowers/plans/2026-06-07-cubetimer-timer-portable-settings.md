# CubeTimer (Timer + Portable Settings) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a no-login, no-ads, client-side 3×3 speedcubing timer/tracker with WCA-correct stats, sessions, progress graphs, a 2D scramble preview, and file-based export/import.

**Architecture:** Pure logic modules (`stats`, `timer/machine`, `scramble`, `facelets`, `transfer`) wrapped by a Zustand store that persists settings to `localStorage` and sessions/solves to IndexedDB. React components (layout option B) read/dispatch through the store. Tests use Vitest + Testing Library; logic modules are built strictly test-first.

**Tech Stack:** React 19, TypeScript, Tailwind v4, Vite, Zustand, scrambow, cubejs, idb, Vitest, @testing-library/react, fake-indexeddb.

**Conventions for this codebase (important):**
- `tsconfig.app.json` has `verbatimModuleSyntax: true` → use `import type { … }` for type-only imports.
- `erasableSyntaxOnly: true` → **no `enum`/`namespace`**; use string-literal union types and `const` objects.
- `noUnusedLocals` / `noUnusedParameters` are on → no unused identifiers.
- Test files import test globals explicitly (`import { describe, it, expect } from 'vitest'`) and are excluded from the production `tsc` build.
- All times are milliseconds (`number`). Penalty values: `'none' | 'plus2' | 'dnf'`.

---

## File Structure

```
src/
  types.ts                      # shared domain types + constants
  lib/
    uid.ts                      # crypto.randomUUID wrapper
  stats/
    averages.ts                 # effectiveTime, best, worst, mean, average, bestAverage, formatTime
    averages.test.ts
  facelets/
    facelets.ts                 # scramble string -> 54-char facelet array (cubejs)
    facelets.test.ts
  scramble/
    source.ts                   # ScrambleSource interface
    scrambowSource.ts           # scrambow-backed implementation
    scrambowSource.test.ts
  timer/
    machine.ts                  # pure timer state machine (reducer)
    machine.test.ts
    useTimer.ts                 # React hook: keyboard/touch + timers + display
    useTimer.test.tsx
  storage/
    settings.ts                 # localStorage settings load/save/default
    settings.test.ts
    db.ts                       # IndexedDB (idb) sessions + solves
    db.test.ts
  transfer/
    transfer.ts                 # buildExport, downloadExport, parseImport, migrate
    transfer.test.ts
  store/
    useStore.ts                 # Zustand store wiring persistence + actions
    useStore.test.ts
  ui/
    TimerDisplay.tsx
    ScrambleBar.tsx
    StatsCard.tsx
    SolveList.tsx
    ScramblePreview.tsx
    GraphsPanel.tsx
    SessionBar.tsx
    SettingsPanel.tsx
    ImportExportDialog.tsx
    App.tsx                     # layout shell (option B), wires store + useTimer
  cubejs.d.ts                   # minimal module declaration for cubejs
  main.tsx                      # (modified) renders ui/App
  index.css                     # (modified) tailwind + base theme
  test/
    setup.ts                    # jest-dom + fake-indexeddb
vitest.config.ts                # vitest config (jsdom)
```

---

## Task 1: Tooling, dependencies, and template cleanup

**Files:**
- Modify: `package.json` (deps + scripts)
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Modify: `tsconfig.app.json` (exclude tests from prod build)
- Create: `src/lib/uid.ts`
- Create: `src/lib/uid.test.ts`
- Delete (cleanup): `src/App.css`, `src/assets/*` template images (leave `src/assets/` empty or remove), default `src/App.tsx` body (replaced in Task 16)

- [ ] **Step 1: Install dependencies**

Run:
```bash
npm install scrambow cubejs zustand idb
npm install -D vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom fake-indexeddb
```
Expected: installs succeed; `package.json` lists the new packages.

- [ ] **Step 2: Add test scripts to `package.json`**

In the `"scripts"` block, add:
```json
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -b"
```
Keep existing `dev`, `build`, `lint`, `preview`.

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    restoreMocks: true,
  },
})
```

- [ ] **Step 4: Create `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
```

- [ ] **Step 5: Exclude tests from the production build**

In `tsconfig.app.json`, add an `exclude` array at the top level (sibling of `compilerOptions` and `include`):
```json
  "exclude": ["src/**/*.test.ts", "src/**/*.test.tsx", "src/test", "vitest.config.ts"]
```

- [ ] **Step 6: Write the failing test for `uid`**

Create `src/lib/uid.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { uid } from './uid'

describe('uid', () => {
  it('returns a unique string each call', () => {
    const a = uid()
    const b = uid()
    expect(typeof a).toBe('string')
    expect(a.length).toBeGreaterThan(0)
    expect(a).not.toBe(b)
  })
})
```

- [ ] **Step 7: Run the test to verify it fails**

Run: `npx vitest run src/lib/uid.test.ts`
Expected: FAIL — cannot resolve `./uid`.

- [ ] **Step 8: Implement `src/lib/uid.ts`**

```ts
export function uid(): string {
  return crypto.randomUUID()
}
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `npx vitest run src/lib/uid.test.ts`
Expected: PASS.

- [ ] **Step 10: Remove template assets/styles**

Delete `src/App.css` and the template images under `src/assets/` (`react.svg`, `vite.svg`, `hero.png` if present). Replace `src/index.css` contents with:
```css
@import "tailwindcss";

:root { color-scheme: light dark; }
html, body, #root { height: 100%; margin: 0; }
body { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }
```
(Leave `src/App.tsx` for now; it is fully replaced in Task 16. If it imports `./App.css` or assets, that import will break the build — temporarily replace `src/App.tsx` with `export default function App(){ return null }` so the project compiles between tasks.)

- [ ] **Step 11: Verify the project still builds and tests run**

Run: `npm run test` then `npm run build`
Expected: the single uid test passes; build succeeds with the placeholder `App`.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "chore: add test tooling, deps, and uid helper; clean template"
```
(If no git repo exists yet, run `git init` first, then this commit.)

---

## Task 2: Domain types

**Files:**
- Create: `src/types.ts`

No test (declarations only).

- [ ] **Step 1: Create `src/types.ts`**

```ts
export type Penalty = 'none' | 'plus2' | 'dnf'

export interface Solve {
  id: string
  sessionId: string
  timeMs: number          // raw recorded time, excluding penalty
  penalty: Penalty
  scramble: string
  createdAt: number       // epoch ms
  comment?: string
}

export interface Session {
  id: string
  name: string
  createdAt: number
}

export type ThemeMode = 'light' | 'dark' | 'system'

export interface Settings {
  theme: ThemeMode
  inspection: boolean
  inspectionAudioCues: boolean
  holdToStartMs: number
  distractionFree: boolean
  decimalPlaces: 2 | 3
  activeSessionId: string
}

export interface ExportFile {
  version: number
  exportedAt: number
  settings?: Settings
  sessions?: Session[]
  solves?: Solve[]
}

export const EXPORT_VERSION = 1
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add domain types"
```

---

## Task 3: Stats engine (averages + formatting)

**Files:**
- Create: `src/stats/averages.ts`
- Test: `src/stats/averages.test.ts`

WCA rules implemented: effective time = `timeMs` (+2000 for `plus2`); DNF excluded from best/worst/mean. Average over the last N solves trims `ceil(N*0.05)` best and worst (ao5→1, ao12→1, ao100→5); if `dnfCount > trim` the average is `'DNF'`. `bestAverage` is the best numeric rolling window.

- [ ] **Step 1: Write the failing tests**

Create `src/stats/averages.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import type { Solve } from '../types'
import {
  effectiveTime, best, worst, mean, average, bestAverage, formatTime,
} from './averages'

function s(timeMs: number, penalty: Solve['penalty'] = 'none'): Solve {
  return { id: 'x', sessionId: 'a', timeMs, penalty, scramble: '', createdAt: 0 }
}

describe('effectiveTime', () => {
  it('returns raw time for none', () => expect(effectiveTime(s(1000))).toBe(1000))
  it('adds 2000 for plus2', () => expect(effectiveTime(s(1000, 'plus2'))).toBe(3000))
  it('returns null for dnf', () => expect(effectiveTime(s(1000, 'dnf'))).toBeNull())
})

describe('best / worst / mean', () => {
  const list = [s(1000), s(3000), s(2000, 'plus2'), s(9999, 'dnf')] // effective: 1000, 3000, 4000, -
  it('best ignores dnf', () => expect(best(list)).toBe(1000))
  it('worst ignores dnf', () => expect(worst(list)).toBe(4000))
  it('mean ignores dnf', () => expect(mean(list)).toBe((1000 + 3000 + 4000) / 3))
  it('returns null on empty / all-dnf', () => {
    expect(best([])).toBeNull()
    expect(mean([s(1, 'dnf')])).toBeNull()
  })
})

describe('average (ao5)', () => {
  it('returns null with fewer than 5 solves', () => {
    expect(average([s(1), s(2), s(3), s(4)], 5)).toBeNull()
  })
  it('drops one best and one worst, means the middle 3', () => {
    // times 1,2,3,4,5 -> drop 1 and 5 -> mean(2,3,4)=3
    const list = [s(1), s(2), s(3), s(4), s(5)]
    expect(average(list, 5)).toBe(3)
  })
  it('uses only the most recent 5', () => {
    const list = [s(100), s(1), s(2), s(3), s(4), s(5)] // last 5: 1..5
    expect(average(list, 5)).toBe(3)
  })
  it('counts a single dnf as the dropped worst', () => {
    const list = [s(2), s(3), s(4), s(10), s(99, 'dnf')] // drop dnf(worst) + 2(best) -> mean(3,4,10)
    expect(average(list, 5)).toBe((3 + 4 + 10) / 3)
  })
  it('is DNF when two or more dnf in the window', () => {
    const list = [s(2), s(3), s(4, 'dnf'), s(10), s(99, 'dnf')]
    expect(average(list, 5)).toBe('DNF')
  })
})

describe('average (ao12 trims 1, ao100 trims 5)', () => {
  it('ao12 means the middle 10', () => {
    const times = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    const list = times.map((t) => s(t))
    // drop 1 and 12 -> mean(2..11) = 6.5
    expect(average(list, 12)).toBe(6.5)
  })
  it('ao100 tolerates up to 5 dnf, DNF at 6', () => {
    const list = Array.from({ length: 100 }, (_, i) => s(i + 1))
    for (let i = 0; i < 5; i++) list[i] = s(9999, 'dnf')
    expect(typeof average(list, 100)).toBe('number')
    list[5] = s(9999, 'dnf')
    expect(average(list, 100)).toBe('DNF')
  })
})

describe('bestAverage', () => {
  it('returns the best rolling ao5', () => {
    // windows of 5 over 1..6: [1..5]->3, [2..6]->4 ; best = 3
    const list = [1, 2, 3, 4, 5, 6].map((t) => s(t))
    expect(bestAverage(list, 5)).toBe(3)
  })
  it('returns null with too few solves', () => {
    expect(bestAverage([s(1)], 5)).toBeNull()
  })
})

describe('formatTime', () => {
  it('formats sub-minute to 2 decimals', () => expect(formatTime(12480, 2)).toBe('12.48'))
  it('formats sub-minute to 3 decimals', () => expect(formatTime(12480, 3)).toBe('12.480'))
  it('formats minutes', () => expect(formatTime(62340, 2)).toBe('1:02.34'))
  it('formats DNF and null', () => {
    expect(formatTime('DNF', 2)).toBe('DNF')
    expect(formatTime(null, 2)).toBe('—')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/stats/averages.test.ts`
Expected: FAIL — cannot resolve `./averages`.

- [ ] **Step 3: Implement `src/stats/averages.ts`**

```ts
import type { Solve } from '../types'

export type AverageResult = number | 'DNF' | null

export function effectiveTime(solve: Solve): number | null {
  if (solve.penalty === 'dnf') return null
  return solve.penalty === 'plus2' ? solve.timeMs + 2000 : solve.timeMs
}

function validTimes(solves: Solve[]): number[] {
  const out: number[] = []
  for (const s of solves) {
    const t = effectiveTime(s)
    if (t !== null) out.push(t)
  }
  return out
}

export function best(solves: Solve[]): number | null {
  const t = validTimes(solves)
  return t.length ? Math.min(...t) : null
}

export function worst(solves: Solve[]): number | null {
  const t = validTimes(solves)
  return t.length ? Math.max(...t) : null
}

export function mean(solves: Solve[]): number | null {
  const t = validTimes(solves)
  return t.length ? t.reduce((a, b) => a + b, 0) / t.length : null
}

export function average(solves: Solve[], n: number): AverageResult {
  if (solves.length < n) return null
  const window = solves.slice(-n)
  const trim = Math.ceil(n * 0.05)
  const dnfCount = window.filter((s) => s.penalty === 'dnf').length
  if (dnfCount > trim) return 'DNF'
  const times = window.map((s) =>
    s.penalty === 'dnf' ? Infinity : s.penalty === 'plus2' ? s.timeMs + 2000 : s.timeMs,
  )
  const sorted = [...times].sort((a, b) => a - b)
  const kept = sorted.slice(trim, n - trim)
  return kept.reduce((a, b) => a + b, 0) / kept.length
}

export function bestAverage(solves: Solve[], n: number): AverageResult {
  if (solves.length < n) return null
  let bestVal: number | null = null
  for (let i = 0; i + n <= solves.length; i++) {
    const a = average(solves.slice(i, i + n), n)
    if (typeof a === 'number') bestVal = bestVal === null ? a : Math.min(bestVal, a)
  }
  return bestVal !== null ? bestVal : 'DNF'
}

export function formatTime(value: AverageResult, decimals: 2 | 3): string {
  if (value === null) return '—'
  if (value === 'DNF') return 'DNF'
  const totalSeconds = value / 1000
  if (totalSeconds < 60) return totalSeconds.toFixed(decimals)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds - minutes * 60
  const secStr = seconds.toFixed(decimals).padStart(decimals + 3, '0')
  return `${minutes}:${secStr}`
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/stats/averages.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/stats
git commit -m "feat: WCA-correct stats engine and time formatting"
```

---

## Task 4: Facelets (scramble → preview state) via cubejs

**Files:**
- Create: `src/cubejs.d.ts`
- Create: `src/facelets/facelets.ts`
- Test: `src/facelets/facelets.test.ts`

`cubejs` ships no types. `asString()` returns a 54-char string in face order U,R,F,D,L,B where each char ∈ `{U,R,F,D,L,B}` naming the face whose color that sticker shows. We map those letters to color keys and return an array of 54.

- [ ] **Step 1: Create the cubejs type declaration `src/cubejs.d.ts`**

```ts
declare module 'cubejs' {
  export default class Cube {
    constructor()
    move(algorithm: string): this
    asString(): string
  }
}
```

- [ ] **Step 2: Write the failing tests**

Create `src/facelets/facelets.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { faceletsFromScramble, FACE_COLORS } from './facelets'

describe('faceletsFromScramble', () => {
  it('returns 54 stickers', () => {
    expect(faceletsFromScramble('').length).toBe(54)
  })
  it('solved cube has uniform faces in U,R,F,D,L,B order', () => {
    const f = faceletsFromScramble('')
    const expected = ['U', 'R', 'F', 'D', 'L', 'B']
    for (let face = 0; face < 6; face++) {
      for (let i = 0; i < 9; i++) {
        expect(f[face * 9 + i]).toBe(expected[face])
      }
    }
  })
  it('a non-trivial scramble changes the state', () => {
    const solved = faceletsFromScramble('')
    const scrambled = faceletsFromScramble("R U R' U'")
    expect(scrambled.join('')).not.toBe(solved.join(''))
  })
  it('exposes a color for each face key', () => {
    for (const key of ['U', 'R', 'F', 'D', 'L', 'B'] as const) {
      expect(typeof FACE_COLORS[key]).toBe('string')
    }
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/facelets/facelets.test.ts`
Expected: FAIL — cannot resolve `./facelets`.

- [ ] **Step 4: Implement `src/facelets/facelets.ts`**

```ts
import Cube from 'cubejs'

export type FaceKey = 'U' | 'R' | 'F' | 'D' | 'L' | 'B'

// Standard color scheme.
export const FACE_COLORS: Record<FaceKey, string> = {
  U: '#ffffff', // white
  R: '#ec0000', // red
  F: '#00a000', // green
  D: '#ffd500', // yellow
  L: '#ff8c00', // orange
  B: '#0051ba', // blue
}

// Returns 54 face keys in cubejs order: U(0-8) R(9-17) F(18-26) D(27-35) L(36-44) B(45-53)
export function faceletsFromScramble(scramble: string): FaceKey[] {
  const cube = new Cube()
  if (scramble.trim().length > 0) cube.move(scramble)
  return cube.asString().split('') as FaceKey[]
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/facelets/facelets.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/facelets src/cubejs.d.ts
git commit -m "feat: compute preview facelets from scramble via cubejs"
```

---

## Task 5: Scramble source

**Files:**
- Create: `src/scramble/source.ts`
- Create: `src/scramble/scrambowSource.ts`
- Test: `src/scramble/scrambowSource.test.ts`

`scrambow` API: `new Scrambow().setType('333').get(1)` → array of objects each with `.scramble_string`.

- [ ] **Step 1: Create the interface `src/scramble/source.ts`**

```ts
export interface ScrambleSource {
  /** Returns the next 3x3 scramble as a move string. */
  next(): string
}
```

- [ ] **Step 2: Write the failing test**

Create `src/scramble/scrambowSource.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { ScrambowSource } from './scrambowSource'

describe('ScrambowSource', () => {
  it('produces a non-empty scramble string of cube moves', () => {
    const src = new ScrambowSource()
    const scramble = src.next()
    expect(typeof scramble).toBe('string')
    expect(scramble.trim().length).toBeGreaterThan(0)
    // every token is a face turn, optionally with ' or 2
    for (const tok of scramble.trim().split(/\s+/)) {
      expect(tok).toMatch(/^[URFDLB][2']?$/)
    }
  })
  it('produces different scrambles on successive calls', () => {
    const src = new ScrambowSource()
    expect(src.next()).not.toBe(src.next())
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/scramble/scrambowSource.test.ts`
Expected: FAIL — cannot resolve `./scrambowSource`.

- [ ] **Step 4: Implement `src/scramble/scrambowSource.ts`**

```ts
import { Scrambow } from 'scrambow'
import type { ScrambleSource } from './source'

export class ScrambowSource implements ScrambleSource {
  private readonly scrambow = new Scrambow().setType('333')

  next(): string {
    const result = this.scrambow.get(1)
    return result[0].scramble_string.trim()
  }
}
```
(If `scrambow` lacks bundled types, add `declare module 'scrambow'` to a new `src/scrambow.d.ts` exporting `class Scrambow { setType(t: string): Scrambow; get(n: number): { scramble_string: string }[] }`. Run `npx tsc -b` after Step 4; only add the shim if tsc reports missing types.)

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/scramble/scrambowSource.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/scramble src/scrambow.d.ts 2>/dev/null; git add src/scramble
git commit -m "feat: scrambow-backed WCA scramble source behind interface"
```

---

## Task 6: Timer state machine (pure)

**Files:**
- Create: `src/timer/machine.ts`
- Test: `src/timer/machine.test.ts`

Phases: `idle → (inspecting) → holding → ready → running → idle`. Events carry `now` (ms). The hook (Task 7) fires `HOLD_ELAPSED` after `holdToStartMs`. Inspection penalty is computed at solve start from time since inspection began (>15s → +2, >17s → DNF). On `STOP`, the machine resets to `idle` and exposes `lastResult`.

- [ ] **Step 1: Write the failing tests**

Create `src/timer/machine.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { initialTimerState, reduce, type TimerConfig } from './machine'

const noInspect: TimerConfig = { inspection: false, holdToStartMs: 300 }
const withInspect: TimerConfig = { inspection: true, holdToStartMs: 300 }

describe('timer machine (no inspection)', () => {
  it('press -> hold elapsed -> ready -> release starts running', () => {
    let st = initialTimerState()
    st = reduce(st, { type: 'PRESS', now: 0 }, noInspect)
    expect(st.phase).toBe('holding')
    st = reduce(st, { type: 'HOLD_ELAPSED', now: 300 }, noInspect)
    expect(st.phase).toBe('ready')
    st = reduce(st, { type: 'RELEASE', now: 350 }, noInspect)
    expect(st.phase).toBe('running')
    expect(st.solveStartedAt).toBe(350)
  })

  it('releasing before ready cancels back to idle', () => {
    let st = initialTimerState()
    st = reduce(st, { type: 'PRESS', now: 0 }, noInspect)
    st = reduce(st, { type: 'RELEASE', now: 100 }, noInspect) // before HOLD_ELAPSED
    expect(st.phase).toBe('idle')
    expect(st.lastResult).toBeNull()
  })

  it('STOP records elapsed time with no penalty', () => {
    let st = initialTimerState()
    st = reduce(st, { type: 'PRESS', now: 0 }, noInspect)
    st = reduce(st, { type: 'HOLD_ELAPSED', now: 300 }, noInspect)
    st = reduce(st, { type: 'RELEASE', now: 300 }, noInspect)
    st = reduce(st, { type: 'STOP', now: 12300 }, noInspect)
    expect(st.phase).toBe('idle')
    expect(st.lastResult).toEqual({ elapsedMs: 12000, penalty: 'none' })
  })
})

describe('timer machine (inspection)', () => {
  it('first press starts inspection; hold+release starts solve', () => {
    let st = initialTimerState()
    st = reduce(st, { type: 'PRESS', now: 0 }, withInspect)
    expect(st.phase).toBe('inspecting')
    st = reduce(st, { type: 'RELEASE', now: 50 }, withInspect) // ignored
    expect(st.phase).toBe('inspecting')
    st = reduce(st, { type: 'PRESS', now: 5000 }, withInspect)
    expect(st.phase).toBe('holding')
    st = reduce(st, { type: 'HOLD_ELAPSED', now: 5300 }, withInspect)
    st = reduce(st, { type: 'RELEASE', now: 5300 }, withInspect)
    expect(st.phase).toBe('running')
  })

  it('+2 when inspection exceeds 15s at solve start', () => {
    let st = initialTimerState()
    st = reduce(st, { type: 'PRESS', now: 0 }, withInspect)
    st = reduce(st, { type: 'PRESS', now: 15500 }, withInspect)
    st = reduce(st, { type: 'HOLD_ELAPSED', now: 15800 }, withInspect)
    st = reduce(st, { type: 'RELEASE', now: 15800 }, withInspect)
    st = reduce(st, { type: 'STOP', now: 25800 }, withInspect)
    expect(st.lastResult).toEqual({ elapsedMs: 10000, penalty: 'plus2' })
  })

  it('DNF when inspection exceeds 17s at solve start', () => {
    let st = initialTimerState()
    st = reduce(st, { type: 'PRESS', now: 0 }, withInspect)
    st = reduce(st, { type: 'PRESS', now: 17500 }, withInspect)
    st = reduce(st, { type: 'HOLD_ELAPSED', now: 17800 }, withInspect)
    st = reduce(st, { type: 'RELEASE', now: 17800 }, withInspect)
    st = reduce(st, { type: 'STOP', now: 27800 }, withInspect)
    expect(st.lastResult).toEqual({ elapsedMs: 10000, penalty: 'dnf' })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/timer/machine.test.ts`
Expected: FAIL — cannot resolve `./machine`.

- [ ] **Step 3: Implement `src/timer/machine.ts`**

```ts
import type { Penalty } from '../types'

export type TimerPhase = 'idle' | 'inspecting' | 'holding' | 'ready' | 'running'

export interface TimerConfig {
  inspection: boolean
  holdToStartMs: number
}

export interface TimerResult {
  elapsedMs: number
  penalty: Penalty
}

export interface TimerState {
  phase: TimerPhase
  inspectionStartedAt: number | null
  solveStartedAt: number | null
  lastResult: TimerResult | null
}

export type TimerEvent =
  | { type: 'PRESS'; now: number }
  | { type: 'RELEASE'; now: number }
  | { type: 'HOLD_ELAPSED'; now: number }
  | { type: 'STOP'; now: number }

export function initialTimerState(): TimerState {
  return { phase: 'idle', inspectionStartedAt: null, solveStartedAt: null, lastResult: null }
}

function inspectionPenalty(inspectionStartedAt: number | null, solveStart: number): Penalty {
  if (inspectionStartedAt === null) return 'none'
  const elapsed = solveStart - inspectionStartedAt
  if (elapsed > 17000) return 'dnf'
  if (elapsed > 15000) return 'plus2'
  return 'none'
}

export function reduce(state: TimerState, event: TimerEvent, config: TimerConfig): TimerState {
  switch (state.phase) {
    case 'idle':
      if (event.type === 'PRESS') {
        if (config.inspection) {
          return { ...state, phase: 'inspecting', inspectionStartedAt: event.now, lastResult: null }
        }
        return { ...state, phase: 'holding', lastResult: null }
      }
      return state

    case 'inspecting':
      if (event.type === 'PRESS') return { ...state, phase: 'holding' }
      return state // RELEASE/others ignored; countdown handled by the hook

    case 'holding':
      if (event.type === 'HOLD_ELAPSED') return { ...state, phase: 'ready' }
      if (event.type === 'RELEASE') {
        // released before armed -> cancel
        return state.inspectionStartedAt !== null
          ? { ...state, phase: 'inspecting' }
          : { ...initialTimerState() }
      }
      return state

    case 'ready':
      if (event.type === 'RELEASE') {
        return { ...state, phase: 'running', solveStartedAt: event.now }
      }
      return state

    case 'running':
      if (event.type === 'STOP') {
        const elapsedMs = event.now - (state.solveStartedAt ?? event.now)
        const penalty = inspectionPenalty(state.inspectionStartedAt, state.solveStartedAt ?? event.now)
        return {
          phase: 'idle',
          inspectionStartedAt: null,
          solveStartedAt: null,
          lastResult: { elapsedMs, penalty },
        }
      }
      return state
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/timer/machine.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/timer/machine.ts src/timer/machine.test.ts
git commit -m "feat: pure timer state machine with optional WCA inspection"
```

---

## Task 7: useTimer hook

**Files:**
- Create: `src/timer/useTimer.ts`
- Test: `src/timer/useTimer.test.tsx`

Wires the machine to the keyboard (Space) and touch, runs the hold timer + a display ticker, exposes `phase`, a `display` string, and inspection seconds; calls `onSolve` when a solve completes.

- [ ] **Step 1: Write the failing test**

Create `src/timer/useTimer.test.tsx`:
```tsx
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/timer/useTimer.test.tsx`
Expected: FAIL — cannot resolve `./useTimer`.

- [ ] **Step 3: Implement `src/timer/useTimer.ts`**

```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Penalty } from '../types'
import { formatTime } from '../stats/averages'
import {
  initialTimerState, reduce, type TimerConfig, type TimerEvent, type TimerState,
} from './machine'

interface UseTimerArgs {
  config: TimerConfig
  onSolve: (timeMs: number, penalty: Penalty) => void
  decimals?: 2 | 3
}

interface UseTimerReturn {
  phase: TimerState['phase']
  display: string
  inspectionSeconds: number | null
}

export function useTimer({ config, onSolve, decimals = 2 }: UseTimerArgs): UseTimerReturn {
  const [state, setState] = useState<TimerState>(initialTimerState)
  const [display, setDisplay] = useState('0.00')
  const [inspectionSeconds, setInspectionSeconds] = useState<number | null>(null)

  const stateRef = useRef(state)
  stateRef.current = state
  const configRef = useRef(config)
  configRef.current = config
  const holdTimer = useRef<number | null>(null)
  const raf = useRef<number | null>(null)

  const dispatch = useCallback((event: Omit<TimerEvent, 'now'> & { now?: number }) => {
    const now = event.now ?? performance.now()
    const next = reduce(stateRef.current, { ...event, now } as TimerEvent, configRef.current)
    stateRef.current = next
    setState(next)
    if (next.lastResult) {
      onSolve(next.lastResult.elapsedMs, next.lastResult.penalty)
    }
  }, [onSolve])

  // hold timer: after PRESS while holding, arm after holdToStartMs
  useEffect(() => {
    if (state.phase === 'holding') {
      holdTimer.current = window.setTimeout(
        () => dispatch({ type: 'HOLD_ELAPSED' }),
        configRef.current.holdToStartMs,
      )
      return () => { if (holdTimer.current) window.clearTimeout(holdTimer.current) }
    }
  }, [state.phase, dispatch])

  // running display ticker
  useEffect(() => {
    if (state.phase === 'running' && state.solveStartedAt !== null) {
      const tick = () => {
        const elapsed = performance.now() - (stateRef.current.solveStartedAt ?? 0)
        setDisplay(formatTime(elapsed, decimals))
        raf.current = requestAnimationFrame(tick)
      }
      raf.current = requestAnimationFrame(tick)
      return () => { if (raf.current) cancelAnimationFrame(raf.current) }
    }
  }, [state.phase, state.solveStartedAt, decimals])

  // inspection countdown display
  useEffect(() => {
    if (state.phase === 'inspecting' && state.inspectionStartedAt !== null) {
      const tick = () => {
        const elapsed = (performance.now() - (stateRef.current.inspectionStartedAt ?? 0)) / 1000
        setInspectionSeconds(Math.max(0, Math.ceil(15 - elapsed)))
        raf.current = requestAnimationFrame(tick)
      }
      raf.current = requestAnimationFrame(tick)
      return () => { if (raf.current) cancelAnimationFrame(raf.current) }
    }
    setInspectionSeconds(null)
  }, [state.phase, state.inspectionStartedAt])

  // reset display to last result when returning to idle
  useEffect(() => {
    if (state.phase === 'idle' && state.lastResult) {
      setDisplay(formatTime(state.lastResult.elapsedMs, decimals))
    }
  }, [state.phase, state.lastResult, decimals])

  // keyboard + touch wiring
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      e.preventDefault()
      if (e.repeat) return
      if (stateRef.current.phase === 'running') dispatch({ type: 'STOP' })
      else dispatch({ type: 'PRESS' })
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      e.preventDefault()
      if (stateRef.current.phase === 'holding' || stateRef.current.phase === 'ready') {
        dispatch({ type: 'RELEASE' })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [dispatch])

  return { phase: state.phase, display, inspectionSeconds }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/timer/useTimer.test.tsx`
Expected: PASS. (If the running-display `requestAnimationFrame` does not advance under fake timers, that is fine — the assertion checks `onSolve` elapsed from `performance.now()`, which fake timers advance.)

- [ ] **Step 5: Commit**

```bash
git add src/timer/useTimer.ts src/timer/useTimer.test.tsx
git commit -m "feat: useTimer hook wiring keyboard/touch to the timer machine"
```

---

## Task 8: Settings storage (localStorage)

**Files:**
- Create: `src/storage/settings.ts`
- Test: `src/storage/settings.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/storage/settings.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { defaultSettings, loadSettings, saveSettings, SETTINGS_KEY } from './settings'

describe('settings storage', () => {
  beforeEach(() => localStorage.clear())

  it('defaultSettings uses the given session id and sane defaults', () => {
    const s = defaultSettings('sess-1')
    expect(s.activeSessionId).toBe('sess-1')
    expect(s.inspection).toBe(false)
    expect(s.holdToStartMs).toBe(300)
    expect(s.decimalPlaces).toBe(2)
  })

  it('returns null when nothing stored', () => {
    expect(loadSettings()).toBeNull()
  })

  it('round-trips through save/load', () => {
    const s = defaultSettings('sess-1')
    saveSettings({ ...s, inspection: true })
    expect(loadSettings()?.inspection).toBe(true)
  })

  it('returns null on corrupt data', () => {
    localStorage.setItem(SETTINGS_KEY, '{not json')
    expect(loadSettings()).toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/storage/settings.test.ts`
Expected: FAIL — cannot resolve `./settings`.

- [ ] **Step 3: Implement `src/storage/settings.ts`**

```ts
import type { Settings } from '../types'

export const SETTINGS_KEY = 'cubetimer.settings.v1'

export function defaultSettings(activeSessionId: string): Settings {
  return {
    theme: 'system',
    inspection: false,
    inspectionAudioCues: true,
    holdToStartMs: 300,
    distractionFree: false,
    decimalPlaces: 2,
    activeSessionId,
  }
}

export function loadSettings(): Settings | null {
  const raw = localStorage.getItem(SETTINGS_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<Settings>
    if (typeof parsed.activeSessionId !== 'string') return null
    return { ...defaultSettings(parsed.activeSessionId), ...parsed } as Settings
  } catch {
    return null
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/storage/settings.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/storage/settings.ts src/storage/settings.test.ts
git commit -m "feat: settings persistence in localStorage with defaults + recovery"
```

---

## Task 9: Solves/sessions storage (IndexedDB via idb)

**Files:**
- Create: `src/storage/db.ts`
- Test: `src/storage/db.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/storage/db.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import {
  putSession, getAllSessions, deleteSession,
  putSolve, getSolvesBySession, deleteSolve, replaceAll, getAllSolves,
} from './db'
import type { Session, Solve } from '../types'

const session = (id: string): Session => ({ id, name: id, createdAt: 0 })
const solve = (id: string, sessionId: string, timeMs: number): Solve => ({
  id, sessionId, timeMs, penalty: 'none', scramble: '', createdAt: timeMs,
})

describe('db', () => {
  beforeEach(async () => { await replaceAll([], []) })

  it('stores and lists sessions', async () => {
    await putSession(session('s1'))
    await putSession(session('s2'))
    const all = await getAllSessions()
    expect(all.map((s) => s.id).sort()).toEqual(['s1', 's2'])
  })

  it('stores solves and queries by session, ordered by createdAt', async () => {
    await putSolve(solve('b', 's1', 200))
    await putSolve(solve('a', 's1', 100))
    await putSolve(solve('c', 's2', 50))
    const s1 = await getSolvesBySession('s1')
    expect(s1.map((s) => s.id)).toEqual(['a', 'b'])
  })

  it('deletes a session and its solves', async () => {
    await putSession(session('s1'))
    await putSolve(solve('a', 's1', 100))
    await deleteSession('s1')
    expect(await getAllSessions()).toEqual([])
    expect(await getSolvesBySession('s1')).toEqual([])
  })

  it('deletes a single solve', async () => {
    await putSolve(solve('a', 's1', 100))
    await deleteSolve('a')
    expect(await getSolvesBySession('s1')).toEqual([])
  })

  it('replaceAll wipes and loads', async () => {
    await putSolve(solve('a', 's1', 100))
    await replaceAll([session('s9')], [solve('z', 's9', 1)])
    expect((await getAllSessions()).map((s) => s.id)).toEqual(['s9'])
    expect((await getAllSolves()).map((s) => s.id)).toEqual(['z'])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/storage/db.test.ts`
Expected: FAIL — cannot resolve `./db`.

- [ ] **Step 3: Implement `src/storage/db.ts`**

```ts
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Session, Solve } from '../types'

interface CubeTimerDB extends DBSchema {
  sessions: { key: string; value: Session }
  solves: { key: string; value: Solve; indexes: { bySession: string } }
}

let dbPromise: Promise<IDBPDatabase<CubeTimerDB>> | null = null

function getDB(): Promise<IDBPDatabase<CubeTimerDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CubeTimerDB>('cubetimer', 1, {
      upgrade(db) {
        db.createObjectStore('sessions', { keyPath: 'id' })
        const solves = db.createObjectStore('solves', { keyPath: 'id' })
        solves.createIndex('bySession', 'sessionId')
      },
    })
  }
  return dbPromise
}

export async function putSession(session: Session): Promise<void> {
  await (await getDB()).put('sessions', session)
}

export async function getAllSessions(): Promise<Session[]> {
  return (await getDB()).getAll('sessions')
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['sessions', 'solves'], 'readwrite')
  await tx.objectStore('sessions').delete(id)
  const idx = tx.objectStore('solves').index('bySession')
  let cursor = await idx.openCursor(id)
  while (cursor) {
    await cursor.delete()
    cursor = await cursor.continue()
  }
  await tx.done
}

export async function putSolve(solve: Solve): Promise<void> {
  await (await getDB()).put('solves', solve)
}

export async function getSolvesBySession(sessionId: string): Promise<Solve[]> {
  const all = await (await getDB()).getAllFromIndex('solves', 'bySession', sessionId)
  return all.sort((a, b) => a.createdAt - b.createdAt)
}

export async function getAllSolves(): Promise<Solve[]> {
  return (await getDB()).getAll('solves')
}

export async function deleteSolve(id: string): Promise<void> {
  await (await getDB()).delete('solves', id)
}

export async function replaceAll(sessions: Session[], solves: Solve[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['sessions', 'solves'], 'readwrite')
  await tx.objectStore('sessions').clear()
  await tx.objectStore('solves').clear()
  for (const s of sessions) await tx.objectStore('sessions').put(s)
  for (const s of solves) await tx.objectStore('solves').put(s)
  await tx.done
}

export async function bulkPut(sessions: Session[], solves: Solve[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['sessions', 'solves'], 'readwrite')
  for (const s of sessions) await tx.objectStore('sessions').put(s)
  for (const s of solves) await tx.objectStore('solves').put(s)
  await tx.done
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/storage/db.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/storage/db.ts src/storage/db.test.ts
git commit -m "feat: IndexedDB persistence for sessions and solves"
```

---

## Task 10: Transfer (export/import)

**Files:**
- Create: `src/transfer/transfer.ts`
- Test: `src/transfer/transfer.test.ts`

`buildExport` selects what to include; `parseImport` validates+migrates; `downloadExport` triggers a file download (DOM).

- [ ] **Step 1: Write the failing tests**

Create `src/transfer/transfer.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { buildExport, parseImport } from './transfer'
import { EXPORT_VERSION, type Session, type Solve, type Settings } from '../types'

const settings: Settings = {
  theme: 'system', inspection: false, inspectionAudioCues: true,
  holdToStartMs: 300, distractionFree: false, decimalPlaces: 2, activeSessionId: 's1',
}
const sessions: Session[] = [
  { id: 's1', name: 'Main', createdAt: 1 },
  { id: 's2', name: 'OH', createdAt: 2 },
]
const solves: Solve[] = [
  { id: 'a', sessionId: 's1', timeMs: 1000, penalty: 'none', scramble: 'R', createdAt: 1 },
  { id: 'b', sessionId: 's2', timeMs: 2000, penalty: 'none', scramble: 'U', createdAt: 2 },
]

describe('buildExport', () => {
  it('settings only', () => {
    const f = buildExport({ includeSettings: true, sessionIds: null }, settings, sessions, solves)
    expect(f.version).toBe(EXPORT_VERSION)
    expect(f.settings).toBeDefined()
    expect(f.sessions).toBeUndefined()
    expect(f.solves).toBeUndefined()
  })

  it('settings + all solves', () => {
    const f = buildExport({ includeSettings: true, sessionIds: 'all' }, settings, sessions, solves)
    expect(f.sessions?.length).toBe(2)
    expect(f.solves?.length).toBe(2)
  })

  it('specific sessions only includes their solves', () => {
    const f = buildExport({ includeSettings: false, sessionIds: ['s1'] }, settings, sessions, solves)
    expect(f.settings).toBeUndefined()
    expect(f.sessions?.map((s) => s.id)).toEqual(['s1'])
    expect(f.solves?.map((s) => s.id)).toEqual(['a'])
  })
})

describe('parseImport', () => {
  it('round-trips a built export', () => {
    const f = buildExport({ includeSettings: true, sessionIds: 'all' }, settings, sessions, solves)
    const parsed = parseImport(JSON.stringify(f))
    expect(parsed).toEqual(f)
  })

  it('rejects invalid json', () => {
    expect(() => parseImport('{nope')).toThrow()
  })

  it('rejects missing/invalid version', () => {
    expect(() => parseImport(JSON.stringify({ foo: 1 }))).toThrow()
  })

  it('rejects a newer-than-supported version', () => {
    expect(() => parseImport(JSON.stringify({ version: 999, exportedAt: 0 }))).toThrow()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/transfer/transfer.test.ts`
Expected: FAIL — cannot resolve `./transfer`.

- [ ] **Step 3: Implement `src/transfer/transfer.ts`**

```ts
import { EXPORT_VERSION, type ExportFile, type Session, type Settings, type Solve } from '../types'

export interface ExportOptions {
  includeSettings: boolean
  /** null = no solve data; 'all' = every session; string[] = those session ids */
  sessionIds: 'all' | string[] | null
}

export function buildExport(
  opts: ExportOptions,
  settings: Settings,
  sessions: Session[],
  solves: Solve[],
  now = 0,
): ExportFile {
  const file: ExportFile = { version: EXPORT_VERSION, exportedAt: now }
  if (opts.includeSettings) file.settings = settings
  if (opts.sessionIds !== null) {
    const ids = opts.sessionIds === 'all' ? sessions.map((s) => s.id) : opts.sessionIds
    const idSet = new Set(ids)
    file.sessions = sessions.filter((s) => idSet.has(s.id))
    file.solves = solves.filter((s) => idSet.has(s.sessionId))
  }
  return file
}

export function downloadExport(file: ExportFile, filename: string): void {
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function migrate(file: ExportFile): ExportFile {
  // Only version 1 exists today; future migrations branch here.
  return file
}

export function parseImport(text: string): ExportFile {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('File is not valid JSON.')
  }
  if (typeof data !== 'object' || data === null) throw new Error('Unexpected file contents.')
  const obj = data as Record<string, unknown>
  if (typeof obj.version !== 'number') throw new Error('Missing version field.')
  if (obj.version > EXPORT_VERSION) throw new Error('File is from a newer version of CubeTimer.')
  return migrate(obj as unknown as ExportFile)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/transfer/transfer.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/transfer/transfer.ts src/transfer/transfer.test.ts
git commit -m "feat: file-based export/import with selective scope + validation"
```

---

## Task 11: Zustand store

**Files:**
- Create: `src/store/useStore.ts`
- Test: `src/store/useStore.test.ts`

Holds `settings`, `sessions`, `solves` (active session, chronological), `scramble`, `ready`. All actions persist through Task 8/9/10 modules.

- [ ] **Step 1: Write the failing tests**

Create `src/store/useStore.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { useStore } from './useStore'
import { replaceAll } from '../storage/db'
import { SETTINGS_KEY } from '../storage/settings'

beforeEach(async () => {
  localStorage.clear()
  await replaceAll([], [])
  // reset store to a clean slate between tests
  useStore.setState({ ready: false, sessions: [], solves: [], scramble: '' })
})

describe('store init', () => {
  it('creates a default session on first run', async () => {
    await useStore.getState().init()
    const st = useStore.getState()
    expect(st.ready).toBe(true)
    expect(st.sessions.length).toBe(1)
    expect(st.settings.activeSessionId).toBe(st.sessions[0].id)
    expect(localStorage.getItem(SETTINGS_KEY)).not.toBeNull()
    expect(st.scramble.length).toBeGreaterThan(0)
  })
})

describe('addSolve / setPenalty / deleteSolve', () => {
  it('appends a solve, persists it, and generates a new scramble', async () => {
    await useStore.getState().init()
    const before = useStore.getState().scramble
    await useStore.getState().addSolve(12000, 'none')
    const st = useStore.getState()
    expect(st.solves.length).toBe(1)
    expect(st.solves[0].timeMs).toBe(12000)
    expect(st.scramble).not.toBe(before)
  })

  it('updates a penalty', async () => {
    await useStore.getState().init()
    await useStore.getState().addSolve(12000, 'none')
    const id = useStore.getState().solves[0].id
    await useStore.getState().setPenalty(id, 'plus2')
    expect(useStore.getState().solves[0].penalty).toBe('plus2')
  })

  it('deletes a solve', async () => {
    await useStore.getState().init()
    await useStore.getState().addSolve(12000, 'none')
    const id = useStore.getState().solves[0].id
    await useStore.getState().deleteSolve(id)
    expect(useStore.getState().solves.length).toBe(0)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/store/useStore.test.ts`
Expected: FAIL — cannot resolve `./useStore`.

- [ ] **Step 3: Implement `src/store/useStore.ts`**

```ts
import { create } from 'zustand'
import type { ExportFile, Penalty, Session, Settings, Solve } from '../types'
import { uid } from '../lib/uid'
import { defaultSettings, loadSettings, saveSettings } from '../storage/settings'
import {
  bulkPut, deleteSession as dbDeleteSession, deleteSolve as dbDeleteSolve,
  getAllSessions, getAllSolves, getSolvesBySession, putSession, putSolve, replaceAll,
} from '../storage/db'
import { ScrambowSource } from '../scramble/scrambowSource'
import type { ScrambleSource } from '../scramble/source'

const scrambleSource: ScrambleSource = new ScrambowSource()

interface StoreState {
  ready: boolean
  settings: Settings
  sessions: Session[]
  solves: Solve[]
  scramble: string

  init: () => Promise<void>
  newScramble: () => void
  addSolve: (timeMs: number, penalty: Penalty) => Promise<void>
  setPenalty: (id: string, penalty: Penalty) => Promise<void>
  setComment: (id: string, comment: string) => Promise<void>
  deleteSolve: (id: string) => Promise<void>
  createSession: (name: string) => Promise<void>
  renameSession: (id: string, name: string) => Promise<void>
  deleteSession: (id: string) => Promise<void>
  switchSession: (id: string) => Promise<void>
  updateSettings: (patch: Partial<Settings>) => void
  importData: (file: ExportFile, mode: 'merge' | 'replace') => Promise<void>
}

export const useStore = create<StoreState>((set, get) => ({
  ready: false,
  settings: defaultSettings('placeholder'),
  sessions: [],
  solves: [],
  scramble: '',

  init: async () => {
    let sessions = await getAllSessions()
    if (sessions.length === 0) {
      const session: Session = { id: uid(), name: 'Main', createdAt: Date.now() }
      await putSession(session)
      sessions = [session]
    }
    let settings = loadSettings()
    if (!settings || !sessions.some((s) => s.id === settings!.activeSessionId)) {
      settings = defaultSettings(sessions[0].id)
      saveSettings(settings)
    }
    const solves = await getSolvesBySession(settings.activeSessionId)
    set({ ready: true, settings, sessions, solves, scramble: scrambleSource.next() })
  },

  newScramble: () => set({ scramble: scrambleSource.next() }),

  addSolve: async (timeMs, penalty) => {
    const { settings, solves } = get()
    const solve: Solve = {
      id: uid(), sessionId: settings.activeSessionId, timeMs, penalty,
      scramble: get().scramble, createdAt: Date.now(),
    }
    await putSolve(solve)
    set({ solves: [...solves, solve], scramble: scrambleSource.next() })
  },

  setPenalty: async (id, penalty) => {
    const solve = get().solves.find((s) => s.id === id)
    if (!solve) return
    const updated = { ...solve, penalty }
    await putSolve(updated)
    set({ solves: get().solves.map((s) => (s.id === id ? updated : s)) })
  },

  setComment: async (id, comment) => {
    const solve = get().solves.find((s) => s.id === id)
    if (!solve) return
    const updated = { ...solve, comment }
    await putSolve(updated)
    set({ solves: get().solves.map((s) => (s.id === id ? updated : s)) })
  },

  deleteSolve: async (id) => {
    await dbDeleteSolve(id)
    set({ solves: get().solves.filter((s) => s.id !== id) })
  },

  createSession: async (name) => {
    const session: Session = { id: uid(), name: name.trim() || 'Session', createdAt: Date.now() }
    await putSession(session)
    set({ sessions: [...get().sessions, session] })
    await get().switchSession(session.id)
  },

  renameSession: async (id, name) => {
    const session = get().sessions.find((s) => s.id === id)
    if (!session) return
    const updated = { ...session, name: name.trim() || session.name }
    await putSession(updated)
    set({ sessions: get().sessions.map((s) => (s.id === id ? updated : s)) })
  },

  deleteSession: async (id) => {
    if (get().sessions.length <= 1) return // keep at least one
    await dbDeleteSession(id)
    const sessions = get().sessions.filter((s) => s.id !== id)
    set({ sessions })
    if (get().settings.activeSessionId === id) await get().switchSession(sessions[0].id)
  },

  switchSession: async (id) => {
    const settings = { ...get().settings, activeSessionId: id }
    saveSettings(settings)
    const solves = await getSolvesBySession(id)
    set({ settings, solves })
  },

  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch }
    saveSettings(settings)
    set({ settings })
  },

  importData: async (file, mode) => {
    if (file.settings) {
      saveSettings(file.settings)
      set({ settings: file.settings })
    }
    if (file.sessions && file.solves) {
      if (mode === 'replace') await replaceAll(file.sessions, file.solves)
      else await bulkPut(file.sessions, file.solves)
    }
    const sessions = await getAllSessions()
    let settings = get().settings
    if (!sessions.some((s) => s.id === settings.activeSessionId) && sessions.length) {
      settings = { ...settings, activeSessionId: sessions[0].id }
      saveSettings(settings)
    }
    const solves = sessions.length ? await getSolvesBySession(settings.activeSessionId) : []
    set({ sessions, settings, solves })
  },
}))
```

Note: `getAllSolves` is imported for parity with future use; if `noUnusedLocals` flags it, remove it from the import list. (It is used by `db.test.ts`, not here.) Remove `getAllSolves` from this import to satisfy the linter.

- [ ] **Step 4: Fix the unused import**

In `src/store/useStore.ts`, remove `getAllSolves,` from the `idb` storage import (it is not used in the store).

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/store/useStore.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/store/useStore.ts src/store/useStore.test.ts
git commit -m "feat: zustand store wiring persistence, sessions, solves, scrambles"
```

---

## Task 12: UI — TimerDisplay and ScrambleBar

**Files:**
- Create: `src/ui/TimerDisplay.tsx`
- Create: `src/ui/ScrambleBar.tsx`
- Test: `src/ui/TimerDisplay.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/ui/TimerDisplay.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TimerDisplay } from './TimerDisplay'

describe('TimerDisplay', () => {
  it('shows the display value', () => {
    render(<TimerDisplay phase="idle" display="12.48" inspectionSeconds={null} />)
    expect(screen.getByText('12.48')).toBeInTheDocument()
  })
  it('shows inspection seconds when inspecting', () => {
    render(<TimerDisplay phase="inspecting" display="0.00" inspectionSeconds={8} />)
    expect(screen.getByText('8')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ui/TimerDisplay.test.tsx`
Expected: FAIL — cannot resolve `./TimerDisplay`.

- [ ] **Step 3: Implement `src/ui/TimerDisplay.tsx`**

```tsx
import type { TimerPhase } from '../timer/machine'

interface Props {
  phase: TimerPhase
  display: string
  inspectionSeconds: number | null
}

const phaseColor: Record<TimerPhase, string> = {
  idle: 'text-zinc-900 dark:text-zinc-100',
  inspecting: 'text-amber-500',
  holding: 'text-red-500',
  ready: 'text-green-500',
  running: 'text-zinc-900 dark:text-zinc-100',
}

export function TimerDisplay({ phase, display, inspectionSeconds }: Props) {
  const value = phase === 'inspecting' && inspectionSeconds !== null ? String(inspectionSeconds) : display
  return (
    <div className="flex items-center justify-center select-none">
      <span className={`font-mono font-bold tabular-nums text-7xl sm:text-8xl ${phaseColor[phase]}`}>
        {value}
      </span>
    </div>
  )
}
```

- [ ] **Step 4: Implement `src/ui/ScrambleBar.tsx`**

```tsx
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
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/ui/TimerDisplay.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/ui/TimerDisplay.tsx src/ui/ScrambleBar.tsx src/ui/TimerDisplay.test.tsx
git commit -m "feat: TimerDisplay and ScrambleBar components"
```

---

## Task 13: UI — StatsCard and SolveList

**Files:**
- Create: `src/ui/StatsCard.tsx`
- Create: `src/ui/SolveList.tsx`
- Test: `src/ui/StatsCard.test.tsx`
- Test: `src/ui/SolveList.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/ui/StatsCard.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatsCard } from './StatsCard'
import type { Solve } from '../types'

const solves: Solve[] = [1000, 2000, 3000, 4000, 5000].map((t, i) => ({
  id: String(i), sessionId: 's', timeMs: t, penalty: 'none', scramble: '', createdAt: i,
}))

describe('StatsCard', () => {
  it('renders best and ao5 labels with values', () => {
    render(<StatsCard solves={solves} decimals={2} />)
    expect(screen.getByText('best')).toBeInTheDocument()
    expect(screen.getByText('ao5')).toBeInTheDocument()
    expect(screen.getByText('1.00')).toBeInTheDocument() // best
    expect(screen.getByText('3.00')).toBeInTheDocument() // current ao5
  })
})
```

Create `src/ui/SolveList.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SolveList } from './SolveList'
import type { Solve } from '../types'

const solves: Solve[] = [
  { id: 'a', sessionId: 's', timeMs: 12000, penalty: 'none', scramble: 'R', createdAt: 1 },
  { id: 'b', sessionId: 's', timeMs: 13000, penalty: 'plus2', scramble: 'U', createdAt: 2 },
]

describe('SolveList', () => {
  it('lists solves newest-first with penalty markers', () => {
    render(<SolveList solves={solves} decimals={2} onSetPenalty={vi.fn()} onDelete={vi.fn()} />)
    const rows = screen.getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('15.00+') // 13.00 + 2 = 15.00, plus2 marker
    expect(rows[1]).toHaveTextContent('12.00')
  })

  it('fires delete', () => {
    const onDelete = vi.fn()
    render(<SolveList solves={solves} decimals={2} onSetPenalty={vi.fn()} onDelete={onDelete} />)
    fireEvent.click(screen.getAllByLabelText('Delete solve')[0])
    expect(onDelete).toHaveBeenCalledWith('b')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/ui/StatsCard.test.tsx src/ui/SolveList.test.tsx`
Expected: FAIL — cannot resolve modules.

- [ ] **Step 3: Implement `src/ui/StatsCard.tsx`**

```tsx
import type { Solve } from '../types'
import { average, best, bestAverage, formatTime, mean, worst } from '../stats/averages'

interface Props {
  solves: Solve[]
  decimals: 2 | 3
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 px-3 py-2 text-center">
      <div className="text-[10px] uppercase tracking-wide text-zinc-400">{label}</div>
      <div className="font-mono tabular-nums text-zinc-800 dark:text-zinc-100">{value}</div>
    </div>
  )
}

export function StatsCard({ solves, decimals }: Props) {
  const f = (v: number | 'DNF' | null) => formatTime(v, decimals)
  return (
    <div className="grid grid-cols-3 gap-2">
      <Stat label="solves" value={String(solves.length)} />
      <Stat label="best" value={f(best(solves))} />
      <Stat label="worst" value={f(worst(solves))} />
      <Stat label="mean" value={f(mean(solves))} />
      <Stat label="ao5" value={f(average(solves, 5))} />
      <Stat label="ao12" value={f(average(solves, 12))} />
      <Stat label="best ao5" value={f(bestAverage(solves, 5))} />
      <Stat label="best ao12" value={f(bestAverage(solves, 12))} />
      <Stat label="ao100" value={f(average(solves, 100))} />
    </div>
  )
}
```

- [ ] **Step 4: Implement `src/ui/SolveList.tsx`**

```tsx
import type { Penalty, Solve } from '../types'
import { effectiveTime, formatTime } from '../stats/averages'

interface Props {
  solves: Solve[]
  decimals: 2 | 3
  onSetPenalty: (id: string, penalty: Penalty) => void
  onDelete: (id: string) => void
}

function label(solve: Solve, decimals: 2 | 3): string {
  if (solve.penalty === 'dnf') return 'DNF'
  const t = effectiveTime(solve)
  const base = formatTime(t, decimals)
  return solve.penalty === 'plus2' ? `${base}+` : base
}

export function SolveList({ solves, decimals, onSetPenalty, onDelete }: Props) {
  const ordered = [...solves].reverse() // newest first
  return (
    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 overflow-y-auto">
      {ordered.map((solve, i) => (
        <li key={solve.id} className="flex items-center gap-2 px-2 py-1.5 text-sm">
          <span className="w-6 text-right text-zinc-400">{ordered.length - i}</span>
          <span className="flex-1 font-mono tabular-nums">{label(solve, decimals)}</span>
          <button type="button" className="px-1 text-xs text-zinc-500 hover:text-zinc-900"
            onClick={() => onSetPenalty(solve.id, solve.penalty === 'plus2' ? 'none' : 'plus2')}
            aria-label="Toggle +2">+2</button>
          <button type="button" className="px-1 text-xs text-zinc-500 hover:text-zinc-900"
            onClick={() => onSetPenalty(solve.id, solve.penalty === 'dnf' ? 'none' : 'dnf')}
            aria-label="Toggle DNF">DNF</button>
          <button type="button" className="px-1 text-xs text-red-400 hover:text-red-600"
            onClick={() => onDelete(solve.id)} aria-label="Delete solve">✕</button>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/ui/StatsCard.test.tsx src/ui/SolveList.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/ui/StatsCard.tsx src/ui/SolveList.tsx src/ui/StatsCard.test.tsx src/ui/SolveList.test.tsx
git commit -m "feat: StatsCard and SolveList components"
```

---

## Task 14: UI — ScramblePreview and GraphsPanel

**Files:**
- Create: `src/ui/ScramblePreview.tsx`
- Create: `src/ui/GraphsPanel.tsx`
- Test: `src/ui/ScramblePreview.test.tsx`
- Test: `src/ui/GraphsPanel.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/ui/ScramblePreview.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ScramblePreview } from './ScramblePreview'

describe('ScramblePreview', () => {
  it('renders 54 sticker rects', () => {
    const { container } = render(<ScramblePreview scramble="R U R' U'" />)
    expect(container.querySelectorAll('rect').length).toBe(54)
  })
})
```

Create `src/ui/GraphsPanel.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GraphsPanel } from './GraphsPanel'
import type { Solve } from '../types'

describe('GraphsPanel', () => {
  it('shows an empty hint with too few solves', () => {
    render(<GraphsPanel solves={[]} />)
    expect(screen.getByText(/not enough solves/i)).toBeInTheDocument()
  })
  it('renders a polyline when there are solves', () => {
    const solves: Solve[] = [1000, 2000, 1500].map((t, i) => ({
      id: String(i), sessionId: 's', timeMs: t, penalty: 'none', scramble: '', createdAt: i,
    }))
    const { container } = render(<GraphsPanel solves={solves} />)
    expect(container.querySelector('polyline')).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/ui/ScramblePreview.test.tsx src/ui/GraphsPanel.test.tsx`
Expected: FAIL — cannot resolve modules.

- [ ] **Step 3: Implement `src/ui/ScramblePreview.tsx`**

The 54 facelets are laid out as an unfolded cross: U on top, then L F R B in the middle band, D at the bottom. Indices follow cubejs order U(0-8) R(9-17) F(18-26) D(27-35) L(36-44) B(45-53).

```tsx
import { faceletsFromScramble, FACE_COLORS, type FaceKey } from '../facelets/facelets'

// grid origin (in sticker units) for each face in the unfolded layout
const FACE_ORIGIN: Record<'U' | 'R' | 'F' | 'D' | 'L' | 'B', { col: number; row: number }> = {
  U: { col: 3, row: 0 },
  L: { col: 0, row: 3 },
  F: { col: 3, row: 3 },
  R: { col: 6, row: 3 },
  B: { col: 9, row: 3 },
  D: { col: 3, row: 6 },
}
// face index range start in the 54-array
const FACE_START: Record<'U' | 'R' | 'F' | 'D' | 'L' | 'B', number> = {
  U: 0, R: 9, F: 18, D: 27, L: 36, B: 45,
}

interface Props { scramble: string }

export function ScramblePreview({ scramble }: Props) {
  const facelets = faceletsFromScramble(scramble)
  const size = 14
  const gap = 2
  const cell = size + gap
  const rects: React.ReactNode[] = []
  ;(Object.keys(FACE_ORIGIN) as Array<keyof typeof FACE_ORIGIN>).forEach((face) => {
    const origin = FACE_ORIGIN[face]
    const start = FACE_START[face]
    for (let i = 0; i < 9; i++) {
      const r = Math.floor(i / 3)
      const c = i % 3
      const key = facelets[start + i] as FaceKey
      rects.push(
        <rect key={`${face}-${i}`}
          x={(origin.col + c) * cell} y={(origin.row + r) * cell}
          width={size} height={size} rx={2}
          fill={FACE_COLORS[key]} stroke="#27272a" strokeWidth={0.5} />,
      )
    }
  })
  const width = 12 * cell
  const height = 9 * cell
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Scramble preview">
      {rects}
    </svg>
  )
}
```

- [ ] **Step 4: Implement `src/ui/GraphsPanel.tsx`**

```tsx
import type { Solve } from '../types'
import { effectiveTime } from '../stats/averages'

interface Props { solves: Solve[] }

export function GraphsPanel({ solves }: Props) {
  const points = solves
    .map((s) => effectiveTime(s))
    .filter((t): t is number => t !== null)

  if (points.length < 2) {
    return <p className="text-sm text-zinc-400 p-3">Not enough solves to graph yet.</p>
  }

  const w = 300
  const h = 120
  const max = Math.max(...points)
  const min = Math.min(...points)
  const span = max - min || 1
  const coords = points.map((t, i) => {
    const x = (i / (points.length - 1)) * w
    const y = h - ((t - min) / span) * h
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" role="img" aria-label="Solve times">
      <polyline points={coords.join(' ')} fill="none" stroke="#6366f1" strokeWidth={2} />
    </svg>
  )
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/ui/ScramblePreview.test.tsx src/ui/GraphsPanel.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/ui/ScramblePreview.tsx src/ui/GraphsPanel.tsx src/ui/ScramblePreview.test.tsx src/ui/GraphsPanel.test.tsx
git commit -m "feat: 2D scramble preview and progress graph"
```

---

## Task 15: UI — SessionBar, SettingsPanel, ImportExportDialog

**Files:**
- Create: `src/ui/SessionBar.tsx`
- Create: `src/ui/SettingsPanel.tsx`
- Create: `src/ui/ImportExportDialog.tsx`
- Test: `src/ui/SessionBar.test.tsx`
- Test: `src/ui/ImportExportDialog.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/ui/SessionBar.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SessionBar } from './SessionBar'
import type { Session } from '../types'

const sessions: Session[] = [
  { id: 's1', name: 'Main', createdAt: 1 },
  { id: 's2', name: 'OH', createdAt: 2 },
]

describe('SessionBar', () => {
  it('switches session on select change', () => {
    const onSwitch = vi.fn()
    render(<SessionBar sessions={sessions} activeId="s1" onSwitch={onSwitch}
      onCreate={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Active session'), { target: { value: 's2' } })
    expect(onSwitch).toHaveBeenCalledWith('s2')
  })
})
```

Create `src/ui/ImportExportDialog.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ImportExportDialog } from './ImportExportDialog'

describe('ImportExportDialog', () => {
  it('calls onExport with the chosen scope', () => {
    const onExport = vi.fn()
    render(<ImportExportDialog onExport={onExport} onImport={vi.fn()} onClose={vi.fn()} />)
    fireEvent.click(screen.getByText(/settings \+ all solves/i))
    fireEvent.click(screen.getByRole('button', { name: /download/i }))
    expect(onExport).toHaveBeenCalledWith({ includeSettings: true, sessionIds: 'all' })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/ui/SessionBar.test.tsx src/ui/ImportExportDialog.test.tsx`
Expected: FAIL — cannot resolve modules.

- [ ] **Step 3: Implement `src/ui/SessionBar.tsx`**

```tsx
import type { Session } from '../types'

interface Props {
  sessions: Session[]
  activeId: string
  onSwitch: (id: string) => void
  onCreate: (name: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}

export function SessionBar({ sessions, activeId, onSwitch, onCreate, onRename, onDelete }: Props) {
  const active = sessions.find((s) => s.id === activeId)
  return (
    <div className="flex items-center gap-2 text-sm">
      <label className="sr-only" htmlFor="session-select">Active session</label>
      <select id="session-select" aria-label="Active session" value={activeId}
        onChange={(e) => onSwitch(e.target.value)}
        className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-transparent px-2 py-1">
        {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <button type="button" aria-label="New session" className="px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
        onClick={() => { const name = prompt('Session name?'); if (name) onCreate(name) }}>＋</button>
      <button type="button" aria-label="Rename session" className="px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
        onClick={() => { if (active) { const name = prompt('Rename session', active.name); if (name) onRename(active.id, name) } }}>✎</button>
      <button type="button" aria-label="Delete session" className="px-2 py-1 rounded text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        onClick={() => { if (active && confirm(`Delete session "${active.name}" and its solves?`)) onDelete(active.id) }}>🗑</button>
    </div>
  )
}
```

- [ ] **Step 4: Implement `src/ui/SettingsPanel.tsx`**

```tsx
import type { Settings } from '../types'

interface Props {
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
  onOpenTransfer: () => void
}

export function SettingsPanel({ settings, onChange, onOpenTransfer }: Props) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <label className="flex items-center justify-between gap-3">
        <span>Inspection (15s)</span>
        <input type="checkbox" checked={settings.inspection}
          onChange={(e) => onChange({ inspection: e.target.checked })} />
      </label>
      <label className="flex items-center justify-between gap-3">
        <span>Inspection audio cues</span>
        <input type="checkbox" checked={settings.inspectionAudioCues}
          onChange={(e) => onChange({ inspectionAudioCues: e.target.checked })} />
      </label>
      <label className="flex items-center justify-between gap-3">
        <span>Distraction-free</span>
        <input type="checkbox" checked={settings.distractionFree}
          onChange={(e) => onChange({ distractionFree: e.target.checked })} />
      </label>
      <label className="flex items-center justify-between gap-3">
        <span>Decimals</span>
        <select value={settings.decimalPlaces}
          onChange={(e) => onChange({ decimalPlaces: Number(e.target.value) as 2 | 3 })}
          className="rounded border border-zinc-200 dark:border-zinc-700 bg-transparent px-2 py-1">
          <option value={2}>2</option>
          <option value={3}>3</option>
        </select>
      </label>
      <label className="flex items-center justify-between gap-3">
        <span>Theme</span>
        <select value={settings.theme}
          onChange={(e) => onChange({ theme: e.target.value as Settings['theme'] })}
          className="rounded border border-zinc-200 dark:border-zinc-700 bg-transparent px-2 py-1">
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
      <button type="button" onClick={onOpenTransfer}
        className="mt-2 rounded-md bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-500">
        Export / Import data…
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Implement `src/ui/ImportExportDialog.tsx`**

```tsx
import { useState } from 'react'
import type { ExportFile } from '../types'
import type { ExportOptions } from '../transfer/transfer'
import { parseImport } from '../transfer/transfer'

type Scope = 'settings' | 'all' | null

interface Props {
  onExport: (opts: ExportOptions) => void
  onImport: (file: ExportFile, mode: 'merge' | 'replace') => void
  onClose: () => void
}

const SCOPE_TO_OPTS: Record<'settings' | 'all', ExportOptions> = {
  settings: { includeSettings: true, sessionIds: null },
  all: { includeSettings: true, sessionIds: 'all' },
}

export function ImportExportDialog({ onExport, onImport, onClose }: Props) {
  const [scope, setScope] = useState<'settings' | 'all'>('all')
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File, mode: 'merge' | 'replace') => {
    try {
      const text = await file.text()
      onImport(parseImport(text), mode)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-[min(28rem,92vw)] rounded-xl bg-white dark:bg-zinc-900 p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-3">Export / Import</h2>

        <fieldset className="mb-4">
          <legend className="text-sm text-zinc-500 mb-2">What to export</legend>
          <label className="flex items-center gap-2 py-1">
            <input type="radio" name="scope" checked={scope === 'settings'} onChange={() => setScope('settings')} />
            <span>Settings only</span>
          </label>
          <label className="flex items-center gap-2 py-1">
            <input type="radio" name="scope" checked={scope === 'all'} onChange={() => setScope('all')} />
            <span>Settings + all solves</span>
          </label>
          <button type="button" onClick={() => onExport(SCOPE_TO_OPTS[scope])}
            className="mt-2 rounded-md bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-500">
            Download file
          </button>
        </fieldset>

        <fieldset className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
          <legend className="text-sm text-zinc-500 mb-2">Import a file</legend>
          <div className="flex gap-2">
            <label className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 cursor-pointer">
              Merge
              <input type="file" accept="application/json" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f, 'merge') }} />
            </label>
            <label className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 cursor-pointer">
              Replace
              <input type="file" accept="application/json" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f, 'replace') }} />
            </label>
          </div>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        </fieldset>

        <div className="mt-4 text-right">
          <button type="button" onClick={onClose} className="text-sm text-zinc-500 hover:text-zinc-900">Close</button>
        </div>
      </div>
    </div>
  )
}
```
(The dialog's `scope` state never holds `null`; the `Scope` type alias is removed — keep only `'settings' | 'all'`. If `noUnusedLocals` flags `Scope`, delete that type line.)

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/ui/SessionBar.test.tsx src/ui/ImportExportDialog.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/ui/SessionBar.tsx src/ui/SettingsPanel.tsx src/ui/ImportExportDialog.tsx src/ui/SessionBar.test.tsx src/ui/ImportExportDialog.test.tsx
git commit -m "feat: session bar, settings panel, and import/export dialog"
```

---

## Task 16: App layout assembly (option B) + wiring

**Files:**
- Create/replace: `src/ui/App.tsx`
- Modify: `src/main.tsx` (import from `./ui/App`)
- Delete: old `src/App.tsx` (placeholder from Task 1)
- Test: `src/ui/App.test.tsx`

Layout B: left column = ScrambleBar + TimerDisplay; right column = SessionBar + StatsCard + SolveList + ScramblePreview + Graphs, collapsible via distraction-free. A settings button toggles the SettingsPanel; SettingsPanel opens the ImportExportDialog.

- [ ] **Step 1: Write the failing test**

Create `src/ui/App.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { render, screen, waitFor } from '@testing-library/react'
import { App } from './App'
import { useStore } from '../store/useStore'
import { replaceAll } from '../storage/db'

beforeEach(async () => {
  localStorage.clear()
  await replaceAll([], [])
  useStore.setState({ ready: false, sessions: [], solves: [], scramble: '' })
})

describe('App', () => {
  it('initializes and shows the timer once ready', async () => {
    render(<App />)
    await waitFor(() => expect(screen.getByLabelText('Active session')).toBeInTheDocument())
    // a scramble is shown and the timer display exists
    expect(screen.getByText('0.00')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ui/App.test.tsx`
Expected: FAIL — cannot resolve `./App`.

- [ ] **Step 3: Delete the placeholder and implement `src/ui/App.tsx`**

Delete `src/App.tsx` (the Task 1 placeholder). Create `src/ui/App.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { useTimer } from '../timer/useTimer'
import { downloadExport, buildExport, type ExportOptions } from '../transfer/transfer'
import { ScrambleBar } from './ScrambleBar'
import { TimerDisplay } from './TimerDisplay'
import { StatsCard } from './StatsCard'
import { SolveList } from './SolveList'
import { ScramblePreview } from './ScramblePreview'
import { GraphsPanel } from './GraphsPanel'
import { SessionBar } from './SessionBar'
import { SettingsPanel } from './SettingsPanel'
import { ImportExportDialog } from './ImportExportDialog'
import { getAllSessions, getAllSolves } from '../storage/db'

export function App() {
  const s = useStore()
  const [showSettings, setShowSettings] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)

  useEffect(() => { void s.init() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const { phase, display, inspectionSeconds } = useTimer({
    config: { inspection: s.settings.inspection, holdToStartMs: s.settings.holdToStartMs },
    onSolve: (ms, penalty) => { void s.addSolve(ms, penalty) },
    decimals: s.settings.decimalPlaces,
  })

  if (!s.ready) {
    return <div className="h-full grid place-items-center text-zinc-400">Loading…</div>
  }

  const handleExport = async (opts: ExportOptions) => {
    const sessions = await getAllSessions()
    const solves = await getAllSolves()
    const file = buildExport(opts, s.settings, sessions, solves, Date.now())
    const date = new Date().toISOString().slice(0, 10)
    downloadExport(file, `cubetimer-export-${date}.json`)
  }

  return (
    <div className="h-full mx-auto max-w-6xl px-4 py-4 flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="font-semibold text-zinc-700 dark:text-zinc-200">CubeTimer</h1>
        <div className="flex items-center gap-2">
          <SessionBar
            sessions={s.sessions} activeId={s.settings.activeSessionId}
            onSwitch={(id) => void s.switchSession(id)}
            onCreate={(name) => void s.createSession(name)}
            onRename={(id, name) => void s.renameSession(id, name)}
            onDelete={(id) => void s.deleteSession(id)}
          />
          <button type="button" aria-label="Settings" onClick={() => setShowSettings((v) => !v)}
            className="px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800">⚙</button>
        </div>
      </header>

      <div className="flex-1 grid gap-6 md:grid-cols-[1.6fr_1fr]">
        {/* Left: scramble + timer */}
        <section className="flex flex-col">
          <ScrambleBar scramble={s.scramble} onNewScramble={() => s.newScramble()} />
          <div className="flex-1 grid place-items-center">
            <TimerDisplay phase={phase} display={display} inspectionSeconds={inspectionSeconds} />
          </div>
        </section>

        {/* Right: stats / list / preview / graphs (hidden in distraction-free) */}
        {!s.settings.distractionFree && (
          <aside className="flex flex-col gap-4 min-h-0">
            <StatsCard solves={s.solves} decimals={s.settings.decimalPlaces} />
            <div className="flex-1 min-h-0 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <SolveList
                solves={s.solves} decimals={s.settings.decimalPlaces}
                onSetPenalty={(id, p) => void s.setPenalty(id, p)}
                onDelete={(id) => void s.deleteSolve(id)}
              />
            </div>
            <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 p-2">
              <ScramblePreview scramble={s.scramble} />
            </div>
            <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 p-2">
              <GraphsPanel solves={s.solves} />
            </div>
          </aside>
        )}
      </div>

      {showSettings && (
        <div className="fixed right-4 top-16 z-40 w-72 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-lg">
          <SettingsPanel
            settings={s.settings}
            onChange={(patch) => s.updateSettings(patch)}
            onOpenTransfer={() => { setShowSettings(false); setShowTransfer(true) }}
          />
        </div>
      )}

      {showTransfer && (
        <ImportExportDialog
          onExport={(opts) => void handleExport(opts)}
          onImport={(file, mode) => void s.importData(file, mode)}
          onClose={() => setShowTransfer(false)}
        />
      )}
    </div>
  )
}

export default App
```

- [ ] **Step 4: Update `src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './ui/App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/ui/App.test.tsx`
Expected: PASS. (StrictMode double-invokes effects in dev; `init()` is idempotent because it reuses an existing session, so this is safe.)

- [ ] **Step 6: Commit**

```bash
git add src/ui/App.tsx src/ui/App.test.tsx src/main.tsx
git rm src/App.tsx
git commit -m "feat: assemble timer app layout (option B) and wire the store"
```

---

## Task 17: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: all tests across `lib`, `stats`, `facelets`, `scramble`, `timer`, `storage`, `transfer`, `store`, and `ui` pass.

- [ ] **Step 2: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: no type errors; lint clean. Fix any `noUnusedLocals`/`import type` issues surfaced (notably the `getAllSolves` store import and the `Scope` alias noted in Tasks 11 and 15).

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: build succeeds; test files are excluded via `tsconfig.app.json`.

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`, open the served URL. Verify: a scramble shows; hold Space → red, after 300ms → green, release → timer runs, press → stops and a solve appears; toggling +2/DNF updates stats; create/switch sessions; open Export/Import, download a file, re-import it (merge and replace); toggle distraction-free hides the right column.

- [ ] **Step 5: Commit any verification fixes**

```bash
git add -A
git commit -m "chore: verification fixes (typecheck/lint/build)"
```

---

## Self-Review notes (author)

- **Spec coverage:** core timing + scrambles (T5–T7, T12, T16), 2D preview (T4, T14), stats ao5/ao12/ao100 (T3, T13), sessions + solve list with +2/DNF/comment/delete (T9, T11, T13, T15), graphs (T14), inspection optional default-off (T6, T7, T15), file export/import with user-chosen scope + merge/replace (T10, T11, T15), persistence settings→localStorage / solves→IndexedDB (T8, T9), layout B + distraction-free (T16), no-login/no-ads (everything client-side). All mapped.
- **Comment field:** `setComment` exists in the store (T11); a comment-editing UI affordance is intentionally minimal in v1 (penalty/delete are the surfaced quick actions). If desired, a comment input can be added to `SolveList` later — not blocking.
- **Type consistency:** `Penalty`, `Solve`, `Session`, `Settings`, `ExportFile`, `ExportOptions`, `TimerConfig`, `TimerState`, `FaceKey` used consistently across tasks; function names (`average`, `bestAverage`, `effectiveTime`, `formatTime`, `faceletsFromScramble`, `buildExport`, `parseImport`, `replaceAll`, `bulkPut`) match between definition and use.
- **Known lint nits flagged inline:** remove `getAllSolves` from the store import (T11 Step 4) and drop the unused `Scope` alias (T15 Step 5).
