# Solver — Phase 2: Solver + Playback — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Do Phase 1 first** (`2026-06-07-solver-phase1-engine-input.md`).

**Goal:** Validate the painted cube, solve it with cubejs's two-phase solver (loaded via a no-eval virtual module), and play the solution back on the cube with play/pause, step ±, a move list with a counter, and speed control.

**Architecture:** A Vite plugin exposes `virtual:cubejs-solver` — it runs cubejs's `solve.js` with `this` bound to the cube-only `Cube` so the solver attaches without the browser ESM `this` crash (no `new Function`/eval). `solver/solve.ts` lazily inits the solver and returns a move list, verifying the solution actually solves the input. The `useSolverStore` gains solve + playback state; the displayed cube is the validated input with `solution[0..playbackIndex]` applied (snap-per-move). `MoveList`/`PlaybackControls` are TDD'd DOM components; a `usePlayback` hook auto-advances during Play.

**Tech Stack:** (Phase 1's) + cubejs solver via `virtual:cubejs-solver`.

**Conventions:** same as Phase 1 (verbatimModuleSyntax, no enums, noUnusedLocals, strict react-hooks, vitest globals, green test/lint/build after every task).

**Playback model:** v1 plays back by **snapping the cube to each successive state** at a controlled cadence (the displayed facelets are `faceletsAfter(input, solution, index)`). This is fully derivable/testable. Smooth per-layer turn animation is a documented future enhancement (it needs cubie-based rendering rather than the current sticker rendering).

---

## File Structure (Phase 2)

```
src/
  solver/
    validate.ts         # pure: PaintGrid -> {ok, facelets} | {ok:false, message}
    validate.test.ts
    solve.ts            # solve(facelets): string[]  (virtual:cubejs-solver, lazy init, verifies)
    solve.test.ts
    store.ts            # (extend Phase 1 store) solve + playback state/actions
    store.test.ts       # (extend)
  cube/
    playback.ts         # pure: clamp/step helpers + selectDisplayGrid
    playback.test.ts
  ui/
    MoveList.tsx
    MoveList.test.tsx
    PlaybackControls.tsx
    PlaybackControls.test.tsx
    SolverPage.tsx      # (extend) right pane: Solve + status + MoveList + PlaybackControls; usePlayback
  hooks/
    usePlayback.ts      # auto-advance during play (timer)
  cubejs.d.ts           # (extend) declare module 'virtual:cubejs-solver'
vite.config.ts          # (extend) add cubejs-solver virtual-module plugin
```

---

## Task 1: `virtual:cubejs-solver` Vite plugin (no-eval solver loader)

**Files:**
- Modify: `vite.config.ts`
- Modify: `src/cubejs.d.ts`
- Create: `src/solver/solverCube.ts`
- Test: `src/solver/solverCube.test.ts`

The plugin reads `node_modules/cubejs/lib/solve.js` and emits a virtual module that runs it with `this` bound to `{ Cube }` (the cube-only class), so `solve.js`'s `Cube = this.Cube || require('./cube')` augments our Cube with `initSolver()`/`solve()`. This is normal compiled JS (no `new Function`, no `unsafe-eval`). Works in dev, build, and vitest (vitest shares Vite plugins).

- [ ] **Step 1: Add the plugin to `vite.config.ts`**

Inside the `plugins: [...]` array (alongside the existing `patch-scrambow` plugin), add:
```ts
    // cubejs's lib/solve.js is an IIFE: (function(){ ... }).call(this), and its first
    // line `Cube = this.Cube || require('./cube')` throws in the browser because top-level
    // `this` is undefined under ESM. We expose `virtual:cubejs-solver`: it imports the
    // cube-only class, then runs solve.js with `this = { Cube }` so the solver attaches to it.
    // Normal compiled module — no eval / no unsafe-eval.
    {
      name: 'cubejs-solver',
      enforce: 'pre' as const,
      resolveId(id: string) {
        if (id === 'virtual:cubejs-solver') return '\0virtual:cubejs-solver'
        return null
      },
      load(id: string) {
        if (id !== '\0virtual:cubejs-solver') return null
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require('node:fs') as typeof import('node:fs')
        const solveSrc = fs.readFileSync('./node_modules/cubejs/lib/solve.js', 'utf-8')
        return {
          code: `
import Cube from 'cubejs/lib/cube'
;(function () {
${solveSrc}
}).call({ Cube })
export default Cube
`,
          map: null,
        }
      },
    },
```

- [ ] **Step 2: Declare the virtual module in `src/cubejs.d.ts`**

Append to `src/cubejs.d.ts`:
```ts
declare module 'virtual:cubejs-solver' {
  export default class Cube {
    constructor(state?: unknown)
    move(algorithm: string): this
    asString(): string
    solve(maxDepth?: number): string
    static fromString(str: string): Cube
    static random(): Cube
    static initSolver(): void
  }
}
```

- [ ] **Step 3: Write the failing test**

Create `src/solver/solverCube.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { getSolverCube } from './solverCube'

describe('virtual:cubejs-solver', () => {
  it('exposes a Cube with initSolver and solve that augment cube.js', () => {
    const Cube = getSolverCube()
    expect(typeof Cube.initSolver).toBe('function')
    expect(typeof Cube.prototype.solve).toBe('function')
    expect(typeof Cube.fromString).toBe('function')
  })
})
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run src/solver/solverCube.test.ts`
Expected: FAIL — cannot resolve `./solverCube`.

- [ ] **Step 5: Implement `src/solver/solverCube.ts`**

```ts
import Cube from 'virtual:cubejs-solver'

// Single accessor so the rest of the app imports the (augmented) solver Cube
// from one place; keeps the virtual-module import isolated and mockable.
export function getSolverCube(): typeof Cube {
  return Cube
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/solver/solverCube.test.ts`
Expected: PASS (proves the plugin works through the Vite/vitest pipeline).

- [ ] **Step 7: Build to confirm browser bundling**

Run: `npm run build`
Expected: clean (the virtual module compiles into the lazy solver chunk).

- [ ] **Step 8: Commit**

```bash
git add vite.config.ts src/cubejs.d.ts src/solver/solverCube.ts src/solver/solverCube.test.ts
git commit -m "feat: virtual:cubejs-solver plugin (no-eval cubejs solver loader)"
```

---

## Task 2: solver/validate.ts

**Files:**
- Create: `src/solver/validate.ts`
- Test: `src/solver/validate.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/solver/validate.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { validateGrid } from './validate'
import { solvedFacelets } from '../cube/state'

describe('validateGrid', () => {
  it('accepts a complete solved grid and returns facelets', () => {
    const r = validateGrid(solvedFacelets())
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.facelets.length).toBe(54)
  })

  it('rejects an incomplete grid (nulls)', () => {
    const grid = solvedFacelets() as (string | null)[]
    grid[0] = null
    const r = validateGrid(grid as never)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/painted/i)
  })

  it('rejects a wrong color count', () => {
    const grid = [...solvedFacelets()]
    grid[0] = 'R' // now 10 R, 8 U
    const r = validateGrid(grid)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/9/)
  })

  it('rejects duplicate/altered centers', () => {
    const grid = [...solvedFacelets()]
    grid[13] = 'U' // R center -> U (now two U centers)
    const r = validateGrid(grid)
    expect(r.ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/solver/validate.test.ts`
Expected: FAIL — cannot resolve `./validate`.

- [ ] **Step 3: Implement `src/solver/validate.ts`**

```ts
import type { FaceKey } from '../facelets/facelets'

const FACES: FaceKey[] = ['U', 'R', 'F', 'D', 'L', 'B']
const CENTER_INDICES = [4, 13, 22, 31, 40, 49]
const FACE_NAMES: Record<FaceKey, string> = {
  U: 'white', R: 'red', F: 'green', D: 'yellow', L: 'orange', B: 'blue',
}

export type ValidateResult =
  | { ok: true; facelets: FaceKey[] }
  | { ok: false; message: string }

export function validateGrid(grid: (FaceKey | null)[]): ValidateResult {
  if (grid.length !== 54) return { ok: false, message: 'Cube data is the wrong size.' }
  if (grid.some((c) => c === null)) {
    return { ok: false, message: 'Some stickers aren’t painted yet — fill in all 54.' }
  }
  const facelets = grid as FaceKey[]

  // Centers must be the six distinct face colors in their fixed positions.
  for (let i = 0; i < 6; i++) {
    if (facelets[CENTER_INDICES[i]] !== FACES[i]) {
      return { ok: false, message: 'Each face’s center color must stay unique.' }
    }
  }

  // Each color exactly 9.
  const counts: Record<string, number> = {}
  for (const c of facelets) counts[c] = (counts[c] ?? 0) + 1
  for (const face of FACES) {
    const n = counts[face] ?? 0
    if (n !== 9) {
      return { ok: false, message: `You have ${n} ${FACE_NAMES[face]} stickers (need 9).` }
    }
  }

  return { ok: true, facelets }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/solver/validate.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/solver/validate.ts src/solver/validate.test.ts
git commit -m "feat: pre-solve cube validation with friendly messages"
```

---

## Task 3: solver/solve.ts

**Files:**
- Create: `src/solver/solve.ts`
- Test: `src/solver/solve.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/solver/solve.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { solveFacelets, SolverError } from './solve'
import { solvedFacelets, applyMoves } from '../cube/state'

describe('solveFacelets', () => {
  it('returns a move list that actually solves several scrambles', () => {
    const scrambles = ["R U R' U'", "F R U' R' U' R U R' F'", "R U2 R' U' R U' R'"]
    for (const scr of scrambles) {
      const input = applyMoves(solvedFacelets(), scr)
      const solution = solveFacelets(input)
      expect(Array.isArray(solution)).toBe(true)
      expect(solution.length).toBeGreaterThan(0)
      // applying the solution to the input reaches solved
      expect(applyMoves(input, solution.join(' ')).join('')).toBe(solvedFacelets().join(''))
    }
  })

  it('returns an empty list for an already-solved cube', () => {
    expect(solveFacelets(solvedFacelets())).toEqual([])
  })

  it('throws SolverError when the solution does not solve (corrupt input)', () => {
    // A count-valid but unsolvable state is hard to hand-build; assert the guard type exists
    // and that a malformed facelet string throws rather than returning a bad solution.
    expect(() => solveFacelets(['Z' as never, ...solvedFacelets().slice(1)])).toThrow(SolverError)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/solver/solve.test.ts`
Expected: FAIL — cannot resolve `./solve`.

- [ ] **Step 3: Implement `src/solver/solve.ts`**

```ts
import type { FaceKey } from '../facelets/facelets'
import { getSolverCube } from './solverCube'
import { solvedFacelets, applyMoves } from '../cube/state'

export class SolverError extends Error {}

let initialized = false

// Builds the move/prune tables once (~few hundred ms). Idempotent.
export function initSolver(): void {
  if (initialized) return
  getSolverCube().initSolver()
  initialized = true
}

export function solveFacelets(facelets: FaceKey[]): string[] {
  const str = facelets.join('')
  if (str === solvedFacelets().join('')) return []
  initSolver()
  const Cube = getSolverCube()
  let raw: string
  try {
    raw = Cube.fromString(str).solve()
  } catch (e) {
    throw new SolverError(e instanceof Error ? e.message : 'Could not solve this cube.')
  }
  const solution = raw.trim().length ? raw.trim().split(/\s+/) : []
  // Safety net: verify the solution actually solves the input.
  if (applyMoves(facelets, solution.join(' ')).join('') !== solvedFacelets().join('')) {
    throw new SolverError('This cube state can’t be solved — double-check the colors.')
  }
  return solution
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/solver/solve.test.ts`
Expected: PASS. (The corrupt-input case throws at `fromString`/`solve` or the verify guard.)

- [ ] **Step 5: Commit**

```bash
git add src/solver/solve.ts src/solver/solve.test.ts
git commit -m "feat: solveFacelets (lazy-init cubejs two-phase + verify) "
```

---

## Task 4: cube/playback.ts (pure playback helpers)

**Files:**
- Create: `src/cube/playback.ts`
- Test: `src/cube/playback.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/cube/playback.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { clampIndex, selectDisplayGrid } from './playback'
import { solvedFacelets, applyMoves } from '../cube/state'

describe('playback helpers', () => {
  it('clampIndex bounds to [0, total]', () => {
    expect(clampIndex(-1, 5)).toBe(0)
    expect(clampIndex(3, 5)).toBe(3)
    expect(clampIndex(9, 5)).toBe(5)
  })

  it('selectDisplayGrid returns the editable grid when no solution', () => {
    const grid = solvedFacelets()
    expect(selectDisplayGrid({ grid, inputFacelets: null, solution: null, playbackIndex: 0 })).toBe(grid)
  })

  it('selectDisplayGrid returns input + first n solution moves when solving', () => {
    const input = applyMoves(solvedFacelets(), "R U R' U'")
    const solution = ['U', 'R', "U'", "R'"]
    const out = selectDisplayGrid({ grid: input, inputFacelets: input, solution, playbackIndex: 2 })
    expect(out.join('')).toBe(applyMoves(input, 'U R').join(''))
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/cube/playback.test.ts`
Expected: FAIL — cannot resolve `./playback`.

- [ ] **Step 3: Implement `src/cube/playback.ts`**

```ts
import type { FaceKey } from '../facelets/facelets'
import { faceletsAfter } from './state'

export function clampIndex(index: number, total: number): number {
  return Math.max(0, Math.min(index, total))
}

export interface DisplayInput {
  grid: (FaceKey | null)[]
  inputFacelets: FaceKey[] | null
  solution: string[] | null
  playbackIndex: number
}

// When a solution exists, show the input with the first `playbackIndex` moves applied;
// otherwise show the editable grid.
export function selectDisplayGrid(s: DisplayInput): (FaceKey | null)[] {
  if (s.solution && s.inputFacelets) {
    return faceletsAfter(s.inputFacelets, s.solution, s.playbackIndex)
  }
  return s.grid
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/cube/playback.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cube/playback.ts src/cube/playback.test.ts
git commit -m "feat: pure playback helpers (clampIndex, selectDisplayGrid)"
```

---

## Task 5: Extend useSolverStore with solve + playback

**Files:**
- Modify: `src/solver/store.ts`
- Modify: `src/solver/store.test.ts`

- [ ] **Step 1: Add the failing tests**

Append to `src/solver/store.test.ts`:
```ts
import { applyMoves } from '../cube/state'

describe('useSolverStore — solve + playback', () => {
  beforeEach(() => {
    const s = useSolverStore.getState()
    s.resetToSolved()
    s.clearSolution()
  })

  it('solveCurrent on a scrambled grid produces a verified solution', async () => {
    const s = useSolverStore.getState()
    useSolverStore.setState({ grid: applyMoves(useSolverStore.getState().grid, "R U R' U'") })
    await s.solveCurrent()
    const st = useSolverStore.getState()
    expect(st.status).toBe('solved')
    expect(st.solution && st.solution.length).toBeGreaterThan(0)
    expect(st.playbackIndex).toBe(0)
  })

  it('solveCurrent on an invalid grid sets an error and no solution', async () => {
    useSolverStore.getState().clear() // nulls present
    await useSolverStore.getState().solveCurrent()
    const st = useSolverStore.getState()
    expect(st.status).toBe('error')
    expect(st.error).toMatch(/painted/i)
    expect(st.solution).toBeNull()
  })

  it('stepForward/stepBack clamp within the solution', async () => {
    const s = useSolverStore.getState()
    useSolverStore.setState({ grid: applyMoves(useSolverStore.getState().grid, "R U R' U'") })
    await s.solveCurrent()
    const len = useSolverStore.getState().solution!.length
    s.stepBack()
    expect(useSolverStore.getState().playbackIndex).toBe(0)
    for (let i = 0; i < len + 3; i++) s.stepForward()
    expect(useSolverStore.getState().playbackIndex).toBe(len)
  })

  it('editing the grid clears any solution', async () => {
    const s = useSolverStore.getState()
    useSolverStore.setState({ grid: applyMoves(useSolverStore.getState().grid, 'R') })
    await s.solveCurrent()
    expect(useSolverStore.getState().solution).not.toBeNull()
    s.resetToSolved()
    expect(useSolverStore.getState().solution).toBeNull()
    expect(useSolverStore.getState().status).toBe('idle')
  })
})
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `npx vitest run src/solver/store.test.ts`
Expected: FAIL — `solveCurrent`/`clearSolution`/playback actions don't exist yet.

- [ ] **Step 3: Extend `src/solver/store.ts`**

Add solver/playback state and actions. The full updated store:
```ts
import { create } from 'zustand'
import type { FaceKey } from '../facelets/facelets'
import { CENTER_INDICES } from '../cube/geometry'
import { solvedFacelets } from '../cube/state'
import { faceletsFromScramble } from '../facelets/facelets'
import { ScrambowSource } from '../scramble/scrambowSource'
import { validateGrid } from './validate'
import { solveFacelets, SolverError } from './solve'
import { clampIndex } from '../cube/playback'

type PaintGrid = (FaceKey | null)[]
type SolveStatus = 'idle' | 'solving' | 'solved' | 'error'

const scrambleSource = new ScrambowSource()
const CENTERS = CENTER_INDICES as readonly number[]

function blankGrid(): PaintGrid {
  const solved = solvedFacelets()
  return solved.map((c, i) => (CENTERS.includes(i) ? c : null))
}

interface SolverStoreState {
  grid: PaintGrid
  activeColor: FaceKey
  // solve + playback
  inputFacelets: FaceKey[] | null
  solution: string[] | null
  playbackIndex: number
  isPlaying: boolean
  speedMs: number
  status: SolveStatus
  error: string | null
  // grid actions
  resetToSolved: () => void
  clear: () => void
  scramble: () => void
  setActiveColor: (color: FaceKey) => void
  paintSticker: (index: number) => void
  // solve + playback actions
  clearSolution: () => void
  solveCurrent: () => Promise<void>
  play: () => void
  pause: () => void
  stepForward: () => void
  stepBack: () => void
  setPlaybackIndex: (i: number) => void
  setSpeed: (ms: number) => void
}

const clearedSolve = {
  inputFacelets: null,
  solution: null,
  playbackIndex: 0,
  isPlaying: false,
  status: 'idle' as SolveStatus,
  error: null,
}

export const useSolverStore = create<SolverStoreState>((set, get) => ({
  grid: solvedFacelets(),
  activeColor: 'U',
  ...clearedSolve,
  speedMs: 600,

  resetToSolved: () => set({ grid: solvedFacelets(), ...clearedSolve }),
  clear: () => set({ grid: blankGrid(), ...clearedSolve }),
  scramble: () => set({ grid: faceletsFromScramble(scrambleSource.next()), ...clearedSolve }),
  setActiveColor: (color) => set({ activeColor: color }),
  paintSticker: (index) => {
    if (CENTERS.includes(index)) return
    const grid = [...get().grid]
    grid[index] = get().activeColor
    set({ grid, ...clearedSolve })
  },

  clearSolution: () => set({ ...clearedSolve }),

  solveCurrent: async () => {
    const result = validateGrid(get().grid)
    if (!result.ok) {
      set({ status: 'error', error: result.message, solution: null, inputFacelets: null })
      return
    }
    set({ status: 'solving', error: null })
    // Yield so the 'solving' state can paint before the (first-time) table build blocks.
    await new Promise((r) => setTimeout(r, 0))
    try {
      const solution = solveFacelets(result.facelets)
      set({
        solution,
        inputFacelets: result.facelets,
        playbackIndex: 0,
        isPlaying: false,
        status: 'solved',
        error: null,
      })
    } catch (e) {
      const message = e instanceof SolverError ? e.message : 'Could not solve this cube.'
      set({ status: 'error', error: message, solution: null, inputFacelets: null })
    }
  },

  play: () => { if (get().solution) set({ isPlaying: true }) },
  pause: () => set({ isPlaying: false }),
  stepForward: () => {
    const { solution, playbackIndex } = get()
    if (!solution) return
    set({ playbackIndex: clampIndex(playbackIndex + 1, solution.length), isPlaying: false })
  },
  stepBack: () => {
    const { solution, playbackIndex } = get()
    if (!solution) return
    set({ playbackIndex: clampIndex(playbackIndex - 1, solution.length), isPlaying: false })
  },
  setPlaybackIndex: (i) => {
    const { solution } = get()
    if (!solution) return
    set({ playbackIndex: clampIndex(i, solution.length) })
  },
  setSpeed: (ms) => set({ speedMs: ms }),
}))
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/solver/store.test.ts`
Expected: PASS (Phase 1 + Phase 2 store tests).

- [ ] **Step 5: Commit**

```bash
git add src/solver/store.ts src/solver/store.test.ts
git commit -m "feat: solver store solve + playback (solveCurrent, step/play, clear-on-edit)"
```

---

## Task 6: MoveList + PlaybackControls

**Files:**
- Create: `src/ui/MoveList.tsx`, `src/ui/PlaybackControls.tsx`
- Test: `src/ui/MoveList.test.tsx`, `src/ui/PlaybackControls.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/ui/MoveList.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MoveList } from './MoveList'

describe('MoveList', () => {
  it('shows the moves and a counter, highlighting the current move', () => {
    render(<MoveList solution={['R', 'U', "R'", "U'"]} playbackIndex={2} />)
    expect(screen.getByText('7 / 4'.replace('7', '2'))).toBeInTheDocument() // "2 / 4"
    // the move at index playbackIndex (the next to apply) is marked current
    expect(screen.getByTestId('move-2')).toHaveattribute?.('data-current', 'true')
  })
})
```
(If `toHaveattribute` typo-guards trip you, use `expect(screen.getByTestId('move-2').getAttribute('data-current')).toBe('true')`.)

Create `src/ui/PlaybackControls.test.tsx`:
```tsx
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
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/ui/MoveList.test.tsx src/ui/PlaybackControls.test.tsx`
Expected: FAIL — modules missing.

- [ ] **Step 3: Implement `src/ui/MoveList.tsx`**

```tsx
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
```

- [ ] **Step 4: Implement `src/ui/PlaybackControls.tsx`**

```tsx
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
          type="range" min={150} max={1200} step={50}
          value={1350 - speedMs}
          onChange={(e) => onSpeed(1350 - Number(e.target.value))}
        />
      </label>
    </div>
  )
}
```
(The slider is inverted so right = faster; `onSpeed` receives ms. The test sends `value='300'` → `onSpeed(1350-300=1050)`; adjust the test's expected value to `1050`, OR simplify the slider to pass ms directly and expect `300`. **Choose the direct form:** make `value={speedMs}` and `onChange={e => onSpeed(Number(e.target.value))}`, min=150 max=1200; then the test's `expect(onSpeed).toHaveBeenCalledWith(300)` holds. Use the direct form.)

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/ui/MoveList.test.tsx src/ui/PlaybackControls.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/ui/MoveList.tsx src/ui/PlaybackControls.tsx src/ui/MoveList.test.tsx src/ui/PlaybackControls.test.tsx
git commit -m "feat: MoveList and PlaybackControls components"
```

---

## Task 7: usePlayback hook + wire the SolverPage right pane

**Files:**
- Create: `src/hooks/usePlayback.ts`
- Modify: `src/ui/SolverPage.tsx`
- Modify: `src/ui/SolverPage.test.tsx`

- [ ] **Step 1: Implement `src/hooks/usePlayback.ts`**

Auto-advances the playback index while `isPlaying`, stopping at the end. Strict-hooks-clean (effect syncs to external timer, cleans up).
```ts
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
```
(Note: `setPlaybackIndex` does not pause, so playback keeps advancing; `play()`/`pause()` toggle `isPlaying`. `stepForward/stepBack` intentionally pause. This avoids the timer fighting manual stepping.)

- [ ] **Step 2: Update `src/ui/SolverPage.test.tsx` for the right pane**

Append:
```tsx
import { waitFor } from '@testing-library/react'
import { applyMoves } from '../cube/state'

describe('SolverPage (solve)', () => {
  it('solving shows the move list and playback controls', async () => {
    useSolverStore.getState().resetToSolved()
    useSolverStore.setState({ grid: applyMoves(useSolverStore.getState().grid, "R U R' U'") })
    render(<SolverPage />)
    fireEvent.click(screen.getByRole('button', { name: /^solve$/i }))
    await waitFor(() => expect(screen.getByLabelText('Play')).toBeInTheDocument())
    expect(screen.getByLabelText('Step forward')).toBeInTheDocument()
  })

  it('shows a validation error for an incomplete cube', async () => {
    useSolverStore.getState().clear()
    render(<SolverPage />)
    fireEvent.click(screen.getByRole('button', { name: /^solve$/i }))
    await waitFor(() => expect(screen.getByText(/painted/i)).toBeInTheDocument())
  })
})
```

- [ ] **Step 3: Update `src/ui/SolverPage.tsx`**

Show the validated/playback state on the cube via `selectDisplayGrid`, and fill the right pane.
```tsx
import { useSolverStore } from '../solver/store'
import { Cube3D } from '../cube/Cube3D'
import { NetEditor } from './NetEditor'
import { ColorPalette } from './ColorPalette'
import { MoveList } from './MoveList'
import { PlaybackControls } from './PlaybackControls'
import { selectDisplayGrid } from '../cube/playback'
import { usePlayback } from '../hooks/usePlayback'

export function SolverPage() {
  usePlayback()
  const s = useSolverStore()
  const display = selectDisplayGrid({
    grid: s.grid, inputFacelets: s.inputFacelets, solution: s.solution, playbackIndex: s.playbackIndex,
  })
  const painting = s.solution === null

  return (
    <div className="h-full mx-auto max-w-6xl px-4 py-4 grid gap-6 md:grid-cols-[1.3fr_1fr]">
      <section className="flex flex-col gap-4 min-h-0">
        <Cube3D grid={display} onPaint={painting ? s.paintSticker : () => {}} />
        {painting && <>
          <ColorPalette active={s.activeColor} onSelect={s.setActiveColor} />
          <NetEditor grid={s.grid} onPaint={s.paintSticker} />
          <div className="flex gap-2">
            <button type="button" onClick={s.resetToSolved} className="rounded-md px-3 py-1.5 text-sm border border-zinc-300 dark:border-zinc-700">Reset</button>
            <button type="button" onClick={s.clear} className="rounded-md px-3 py-1.5 text-sm border border-zinc-300 dark:border-zinc-700">Clear</button>
            <button type="button" onClick={s.scramble} className="rounded-md px-3 py-1.5 text-sm border border-zinc-300 dark:border-zinc-700">Scramble</button>
          </div>
        </>}
        {!painting && (
          <button type="button" onClick={s.clearSolution} className="self-start rounded-md px-3 py-1.5 text-sm border border-zinc-300 dark:border-zinc-700">Edit cube</button>
        )}
      </section>

      <aside className="rounded-xl border border-zinc-100 dark:border-zinc-800 p-4 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => void s.solveCurrent()}
          disabled={s.status === 'solving'}
          className="self-start rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {s.status === 'solving' ? 'Solving…' : 'Solve'}
        </button>
        {s.status === 'error' && <p className="text-sm text-red-500">{s.error}</p>}
        {s.solution && <>
          <MoveList solution={s.solution} playbackIndex={s.playbackIndex} />
          <PlaybackControls
            isPlaying={s.isPlaying} speedMs={s.speedMs}
            onPlay={s.play} onPause={s.pause}
            onStepForward={s.stepForward} onStepBack={s.stepBack} onSpeed={s.setSpeed}
          />
        </>}
        {!s.solution && s.status !== 'error' && <p className="text-zinc-400 text-sm">Paint your cube, then press Solve.</p>}
      </aside>
    </div>
  )
}

export default SolverPage
```
Note: `const s = useSolverStore()` subscribes to the whole store — acceptable here for simplicity since the SolverPage is the consumer. (If lint/perf flags it, switch to per-field selectors.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/ui/SolverPage.test.tsx`
Expected: PASS (input + solve specs).

- [ ] **Step 5: Full test + lint + build**

Run: `npm run test && npm run lint && npm run build`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/usePlayback.ts src/ui/SolverPage.tsx src/ui/SolverPage.test.tsx
git commit -m "feat: wire solver page (solve + move list + playback auto-advance)"
```

---

## Task 8: Phase 2 verification (incl. browser smoke)

**Files:** none

- [ ] **Step 1: Full automated gate**

Run: `npm run typecheck && npm run lint && npm run test && npm run build`
Expected: all clean/green.

- [ ] **Step 2: Browser smoke (end-to-end solve)**

`npm run dev`, open `/solver`. Verify:
1. **Scramble**, then **Solve** → a move list (e.g. `… 0 / 18`) and playback controls appear; the first solve shows "Solving…" briefly (table init).
2. **Play** advances through the moves and the cube reaches solved at the end; **Pause** stops; **Step ±** move one at a time; **Speed** changes cadence.
3. Paint an **invalid** cube (e.g. Clear then leave blanks, or make 10 of one color) → Solve shows a clear error; no crash.
4. **Edit cube** returns to painting; editing clears the solution.
5. `/timer` still fully works; refreshing on `/solver` loads the solver (lazy chunk) without the cubejs `this` crash.

- [ ] **Step 3: Commit any smoke-test fixes**

```bash
git add -A
git commit -m "fix: phase 2 browser-smoke corrections"
```
(Only if needed.)

---

## Self-Review notes (author)

- **Spec coverage (Phase 2):** validation with friendly messages (T2), cubejs two-phase solver via no-eval virtual module (T1, T3), solve flow + statuses + errors (T5, T7), playback play/pause/step/speed (T5, T6, T7), move list + counter + current highlight (T6), displayed cube = input+solution[0..index] (T4, T7), unsolvable/invalid handled (T2, T3, T5), `/solver` lazy + no browser crash (T1 build + T8 smoke).
- **Worker decision:** v1 runs the solver on the main thread (lazy `initSolver`, gated by a 'solving' yield) per the spec's documented fallback — reliable and avoids Vite-worker + cubejs interop complexity. A worker is a future optimization.
- **Animation decision:** v1 playback snaps the cube per move at a controlled cadence (derivable/testable). Smooth per-layer turn animation is a future enhancement requiring cubie-based rendering.
- **Type consistency:** `FaceKey`, `PaintGrid`, `ValidateResult`, `SolveStatus`, `SolverError`; store actions `solveCurrent/clearSolution/play/pause/stepForward/stepBack/setPlaybackIndex/setSpeed` consistent across store, hook, and SolverPage; `selectDisplayGrid`/`clampIndex` shared from `cube/playback.ts`.
- **Inline corrections to honor during implementation:** use the *direct* speed slider form in `PlaybackControls` (T6 Step 4) so the test's `onSpeed(300)` holds; fix `MoveList` test's attribute assertion to `getAttribute('data-current')`.
