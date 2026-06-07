# Solver — Phase 1: Routing + 3D Engine + Color Input — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add react-router with a NavBar, extract the existing Timer into `/timer`, and build a working `/solver` page where you can paint a 3×3 cube (synced 2D net + interactive 3D cube) — no solving yet.

**Architecture:** A layout shell (`App`) hosts theme + NavBar + `<Routes>`. The Timer UI moves verbatim into `TimerPage`. A lazy-loaded `SolverPage` holds a Zustand `useSolverStore` (a `PaintGrid` of 54 stickers, centers fixed). Pure logic (`cube/state.ts`, `cube/geometry.ts`) is TDD'd; the R3F `Cube3D` view is browser-verified. The 2D `NetEditor` and 3D cube both read/write the same `grid`.

**Tech Stack:** React 19, TypeScript, Tailwind v4, Vite, Zustand, react-router-dom, three, @react-three/fiber, @react-three/drei, cubejs (cube-only submodule).

**Conventions (carried from the timer codebase):**
- `verbatimModuleSyntax` → `import type` for type-only imports.
- `erasableSyntaxOnly` → no enums; string-literal unions + `const` objects.
- `noUnusedLocals`/`noUnusedParameters` are on.
- STRICT react-hooks lint (`react-hooks/refs`, `react-hooks/set-state-in-effect`): sync refs in a no-dep effect; derive in render rather than setState-in-effect.
- Tests import globals explicitly from `vitest`; `src/test/setup.ts` already registers jest-dom + fake-indexeddb + `afterEach(cleanup)`.
- Test files are excluded from the production `tsc` build (tsconfig.app `exclude`).
- After EVERY task: `npm run test`, `npm run lint`, `npm run build` must all be green.

**Facelet numbering (cubejs order):** `U(0-8) R(9-17) F(18-26) D(27-35) L(36-44) B(45-53)`; within a face, reading order is:
```
0 1 2
3 4 5
6 7 8
```
Center sticker indices (fixed colors): U=4→'U', R=13→'R', F=22→'F', D=31→'D', L=40→'L', B=49→'B'.

---

## File Structure (Phase 1)

```
src/
  cube/
    state.ts            # pure: solved facelets, applyMoves, faceletsAfter (cubejs/lib/cube)
    state.test.ts
    geometry.ts         # pure: 54-sticker 3D transform table + net layout helpers
    geometry.test.ts
    Cube3D.tsx          # R3F: render stickers from grid, OrbitControls, click→paint (browser-verified)
  solver/
    store.ts            # zustand useSolverStore: grid + activeColor + paint/reset/clear/scramble
    store.test.ts
  ui/
    NavBar.tsx          # Timer | Solver nav links
    TimerPage.tsx       # the current App timer body, moved here
    SolverPage.tsx      # layout B; left = Cube3D+NetEditor+ColorPalette+helpers; right = Solve placeholder
    NetEditor.tsx       # 2D net painting bound to grid
    ColorPalette.tsx    # 6 colors → activeColor
    App.tsx             # (rewritten) shell: theme effect + NavBar + Routes
    App.test.tsx        # (rewritten) routing test
    TimerPage.test.tsx  # the old App.test assertions
    NetEditor.test.tsx
    ColorPalette.test.tsx
    SolverPage.test.tsx
  cubejs.d.ts           # (extend) add static fromString + random to cube-only decl
  main.tsx              # (modify) wrap in <BrowserRouter>
```

---

## Task 1: Dependencies

**Files:** `package.json`

- [ ] **Step 1: Install runtime deps**

Run:
```bash
npm install react-router-dom three @react-three/fiber @react-three/drei
```
Expected: installs succeed. (`@react-three/fiber` v9+ supports React 19 — if npm reports a peer conflict with React 19, re-run with `npm install @react-three/fiber@^9 @react-three/drei@^10` to get the React-19-compatible majors.)

- [ ] **Step 2: Verify the project still builds and tests pass**

Run: `npm run test && npm run build`
Expected: existing 81 tests pass; build clean (no new imports used yet).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add react-router-dom + three/r3f/drei deps"
```

---

## Task 2: cube/state.ts (pure logical cube state)

**Files:**
- Modify: `src/cubejs.d.ts`
- Create: `src/cube/state.ts`
- Test: `src/cube/state.test.ts`

- [ ] **Step 1: Extend the cubejs type declaration**

Replace `src/cubejs.d.ts` with:
```ts
// We import the cube-only submodule (cubejs/lib/cube) rather than the package
// root, to avoid lib/solve.js (the two-phase solver) whose top-level `this.Cube`
// read throws under the browser's ESM module scope.
declare module 'cubejs/lib/cube' {
  export default class Cube {
    constructor(state?: unknown)
    move(algorithm: string): this
    asString(): string
    static fromString(str: string): Cube
    static random(): Cube
    randomize(): this
  }
}
```

- [ ] **Step 2: Write the failing test**

Create `src/cube/state.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { solvedFacelets, applyMoves, faceletsAfter } from './state'

describe('cube/state', () => {
  it('solved state is 54 stickers, each face uniform in U,R,F,D,L,B order', () => {
    const f = solvedFacelets()
    expect(f.length).toBe(54)
    const expected = ['U', 'R', 'F', 'D', 'L', 'B']
    for (let face = 0; face < 6; face++) {
      for (let i = 0; i < 9; i++) expect(f[face * 9 + i]).toBe(expected[face])
    }
  })

  it('applyMoves changes state and is invertible', () => {
    const solved = solvedFacelets()
    const moved = applyMoves(solved, 'R')
    expect(moved.join('')).not.toBe(solved.join(''))
    expect(applyMoves(moved, "R'").join('')).toBe(solved.join(''))
  })

  it('applyMoves with empty string is a no-op', () => {
    const solved = solvedFacelets()
    expect(applyMoves(solved, '   ').join('')).toBe(solved.join(''))
  })

  it('faceletsAfter applies the first n moves of a solution', () => {
    const input = applyMoves(solvedFacelets(), "R U R' U'")
    const solution = ['U', 'R', "U'", 'L']
    expect(faceletsAfter(input, solution, 0).join('')).toBe(input.join(''))
    expect(faceletsAfter(input, solution, 2).join('')).toBe(applyMoves(input, 'U R').join(''))
    expect(faceletsAfter(input, solution, 99).join('')).toBe(applyMoves(input, "U R U' L").join(''))
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/cube/state.test.ts`
Expected: FAIL — cannot resolve `./state`.

- [ ] **Step 4: Implement `src/cube/state.ts`**

```ts
import Cube from 'cubejs/lib/cube'
import type { FaceKey } from '../facelets/facelets'

export function solvedFacelets(): FaceKey[] {
  return new Cube().asString().split('') as FaceKey[]
}

export function applyMoves(facelets: FaceKey[], moves: string): FaceKey[] {
  const cube = Cube.fromString(facelets.join(''))
  if (moves.trim().length > 0) cube.move(moves)
  return cube.asString().split('') as FaceKey[]
}

export function faceletsAfter(input: FaceKey[], solution: string[], n: number): FaceKey[] {
  const count = Math.max(0, Math.min(n, solution.length))
  return applyMoves(input, solution.slice(0, count).join(' '))
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/cube/state.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/cube/state.ts src/cube/state.test.ts src/cubejs.d.ts
git commit -m "feat: pure cube state model (solved/applyMoves/faceletsAfter) via cubejs"
```

---

## Task 3: cube/geometry.ts (sticker layout — pure)

**Files:**
- Create: `src/cube/geometry.ts`
- Test: `src/cube/geometry.test.ts`

This module owns BOTH the 2D net layout (reused by `NetEditor`) and the 3D sticker placement table (used by `Cube3D`). Keeping both here guarantees the 2D and 3D views map to the same facelet indices.

- [ ] **Step 1: Write the failing test**

Create `src/cube/geometry.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { NET_CELLS, STICKERS, CENTER_INDICES, faceOfIndex } from './geometry'

describe('cube/geometry — net layout', () => {
  it('NET_CELLS has 54 entries with unique facelet indices 0..53', () => {
    expect(NET_CELLS.length).toBe(54)
    const idx = NET_CELLS.map((c) => c.index).sort((a, b) => a - b)
    expect(idx).toEqual(Array.from({ length: 54 }, (_, i) => i))
  })
  it('net places U above the L F R B band and D below, in a cross', () => {
    const u = NET_CELLS.find((c) => c.index === 4)! // U center
    const f = NET_CELLS.find((c) => c.index === 22)! // F center
    const d = NET_CELLS.find((c) => c.index === 31)! // D center
    expect(u.row).toBeLessThan(f.row)
    expect(d.row).toBeGreaterThan(f.row)
  })
})

describe('cube/geometry — 3D stickers', () => {
  it('STICKERS has 54 entries, unique indices, unit-ish positions', () => {
    expect(STICKERS.length).toBe(54)
    expect(new Set(STICKERS.map((s) => s.index)).size).toBe(54)
    for (const s of STICKERS) {
      expect(s.position).toHaveLength(3)
      expect(s.normal).toHaveLength(3)
    }
  })
  it('each face has exactly 9 stickers sharing one outward normal', () => {
    const byNormal = new Map<string, number>()
    for (const s of STICKERS) {
      const k = s.normal.join(',')
      byNormal.set(k, (byNormal.get(k) ?? 0) + 1)
    }
    expect([...byNormal.values()].sort()).toEqual([9, 9, 9, 9, 9, 9])
  })
  it('center indices map to their face', () => {
    expect(CENTER_INDICES).toEqual([4, 13, 22, 31, 40, 49])
    expect(faceOfIndex(0)).toBe('U')
    expect(faceOfIndex(13)).toBe('R')
    expect(faceOfIndex(53)).toBe('B')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/cube/geometry.test.ts`
Expected: FAIL — cannot resolve `./geometry`.

- [ ] **Step 3: Implement `src/cube/geometry.ts`**

```ts
import type { FaceKey } from '../facelets/facelets'

export const CENTER_INDICES = [4, 13, 22, 31, 40, 49] as const

const FACES: FaceKey[] = ['U', 'R', 'F', 'D', 'L', 'B']

export function faceOfIndex(index: number): FaceKey {
  return FACES[Math.floor(index / 9)]
}

// ---- 2D net layout (cross): U on top, L F R B middle band, D bottom ----
// Column/row are in 3x3-face units; each face occupies a 3x3 block.
const NET_FACE_ORIGIN: Record<FaceKey, { col: number; row: number }> = {
  U: { col: 3, row: 0 },
  L: { col: 0, row: 3 },
  F: { col: 3, row: 3 },
  R: { col: 6, row: 3 },
  B: { col: 9, row: 3 },
  D: { col: 3, row: 6 },
}

export interface NetCell { index: number; row: number; col: number; face: FaceKey }

export const NET_CELLS: NetCell[] = FACES.flatMap((face, faceIdx) => {
  const origin = NET_FACE_ORIGIN[face]
  return Array.from({ length: 9 }, (_, i) => ({
    index: faceIdx * 9 + i,
    face,
    row: origin.row + Math.floor(i / 3),
    col: origin.col + (i % 3),
  }))
})

// ---- 3D sticker placement ----
// Cube spans [-1.5, 1.5]; stickers sit just outside each face at ±1.5.
// For each face we define: outward normal, and the in-plane (right, down)
// basis used to lay out the 3x3 reading order (matching the net above so the
// 2D and 3D views share facelet indices).
type Vec3 = [number, number, number]
interface FaceBasis { normal: Vec3; right: Vec3; down: Vec3 }

const FACE_BASIS: Record<FaceKey, FaceBasis> = {
  // Up: looking down (-Y view), reading rows go back→front (z: -1→+1), cols left→right (x: -1→+1)
  U: { normal: [0, 1, 0], right: [1, 0, 0], down: [0, 0, 1] },
  // Right: looking along -X, cols front→back (z:+1→-1), rows top→bottom (y:+1→-1)
  R: { normal: [1, 0, 0], right: [0, 0, -1], down: [0, -1, 0] },
  // Front: looking along -Z, cols left→right (x:-1→+1), rows top→bottom (y:+1→-1)
  F: { normal: [0, 0, 1], right: [1, 0, 0], down: [0, -1, 0] },
  // Down: looking up (+Y), rows front→back (z:+1→-1), cols left→right (x:-1→+1)
  D: { normal: [0, -1, 0], right: [1, 0, 0], down: [0, 0, -1] },
  // Left: looking along +X, cols back→front (z:-1→+1), rows top→bottom (y:+1→-1)
  L: { normal: [-1, 0, 0], right: [0, 0, 1], down: [0, -1, 0] },
  // Back: looking along +Z, cols right→left (x:+1→-1), rows top→bottom (y:+1→-1)
  B: { normal: [0, 0, -1], right: [-1, 0, 0], down: [0, -1, 0] },
}

export interface Sticker { index: number; face: FaceKey; position: Vec3; normal: Vec3 }

const GAP = 1 // grid step in cube units (cubie size)
const SURFACE = 1.5 // half-extent

function add(a: Vec3, b: Vec3, k: number): Vec3 {
  return [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k]
}

export const STICKERS: Sticker[] = FACES.flatMap((face, faceIdx) => {
  const b = FACE_BASIS[face]
  const center: Vec3 = [b.normal[0] * SURFACE, b.normal[1] * SURFACE, b.normal[2] * SURFACE]
  return Array.from({ length: 9 }, (_, i) => {
    const r = Math.floor(i / 3) - 1 // -1,0,1
    const c = (i % 3) - 1
    let pos = add(center, b.right, c * GAP)
    pos = add(pos, b.down, r * GAP)
    return { index: faceIdx * 9 + i, face, position: pos, normal: b.normal }
  })
})
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/cube/geometry.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cube/geometry.ts src/cube/geometry.test.ts
git commit -m "feat: shared 2D-net + 3D-sticker geometry (same facelet indices)"
```

> NOTE for the implementer: the 3D `FACE_BASIS` orientations are derived to match the net so painting is consistent. Their absolute orientation correctness is verified in the browser smoke test at Task 9 (paint a known pattern; confirm it reads back correctly) — adjust a face's `right`/`down` only if the browser check shows a mirrored/rotated face.

---

## Task 4: useSolverStore (grid + paint actions)

**Files:**
- Create: `src/solver/store.ts`
- Test: `src/solver/store.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/solver/store.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useSolverStore } from './store'
import { CENTER_INDICES } from '../cube/geometry'

beforeEach(() => useSolverStore.getState().resetToSolved())

describe('useSolverStore', () => {
  it('resetToSolved fills all 54 stickers, centers correct', () => {
    const { grid } = useSolverStore.getState()
    expect(grid.length).toBe(54)
    expect(grid.every((g) => g !== null)).toBe(true)
    expect(grid[4]).toBe('U')
    expect(grid[13]).toBe('R')
  })

  it('clear blanks non-centers but keeps centers', () => {
    useSolverStore.getState().clear()
    const { grid } = useSolverStore.getState()
    for (let i = 0; i < 54; i++) {
      if ((CENTER_INDICES as readonly number[]).includes(i)) expect(grid[i]).not.toBeNull()
      else expect(grid[i]).toBeNull()
    }
  })

  it('setActiveColor + paintSticker paints a non-center sticker', () => {
    useSolverStore.getState().clear()
    useSolverStore.getState().setActiveColor('R')
    useSolverStore.getState().paintSticker(0)
    expect(useSolverStore.getState().grid[0]).toBe('R')
  })

  it('paintSticker ignores center stickers', () => {
    useSolverStore.getState().setActiveColor('R')
    useSolverStore.getState().paintSticker(4) // U center
    expect(useSolverStore.getState().grid[4]).toBe('U')
  })

  it('scramble produces a full grid different from solved', () => {
    useSolverStore.getState().scramble()
    const { grid } = useSolverStore.getState()
    expect(grid.every((g) => g !== null)).toBe(true)
    expect(grid.join('')).not.toBe('UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/solver/store.test.ts`
Expected: FAIL — cannot resolve `./store`.

- [ ] **Step 3: Implement `src/solver/store.ts`**

```ts
import { create } from 'zustand'
import type { FaceKey } from '../facelets/facelets'
import { CENTER_INDICES } from '../cube/geometry'
import { solvedFacelets } from '../cube/state'
import { faceletsFromScramble } from '../facelets/facelets'
import { ScrambowSource } from '../scramble/scrambowSource'

type PaintGrid = (FaceKey | null)[]

const scrambleSource = new ScrambowSource()
const CENTERS = CENTER_INDICES as readonly number[]

function blankGrid(): PaintGrid {
  const solved = solvedFacelets()
  return solved.map((c, i) => (CENTERS.includes(i) ? c : null))
}

interface SolverStoreState {
  grid: PaintGrid
  activeColor: FaceKey
  resetToSolved: () => void
  clear: () => void
  scramble: () => void
  setActiveColor: (color: FaceKey) => void
  paintSticker: (index: number) => void
}

export const useSolverStore = create<SolverStoreState>((set, get) => ({
  grid: solvedFacelets(),
  activeColor: 'U',
  resetToSolved: () => set({ grid: solvedFacelets() }),
  clear: () => set({ grid: blankGrid() }),
  scramble: () => set({ grid: faceletsFromScramble(scrambleSource.next()) }),
  setActiveColor: (color) => set({ activeColor: color }),
  paintSticker: (index) => {
    if (CENTERS.includes(index)) return
    const grid = [...get().grid]
    grid[index] = get().activeColor
    set({ grid })
  },
}))
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/solver/store.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/solver/store.ts src/solver/store.test.ts
git commit -m "feat: solver store with paint grid (reset/clear/scramble/paint)"
```

---

## Task 5: Routing shell — NavBar, TimerPage extraction, App rewrite

**Files:**
- Modify: `src/main.tsx`
- Create: `src/ui/NavBar.tsx`
- Create: `src/ui/TimerPage.tsx` (move current `App` body here)
- Rewrite: `src/ui/App.tsx` (shell)
- Create: `src/ui/SolverPage.tsx` (minimal placeholder for now)
- Rewrite: `src/ui/App.test.tsx` (routing)
- Create: `src/ui/TimerPage.test.tsx` (the old App.test assertions)

- [ ] **Step 1: Move the current App body into `TimerPage`**

Copy the ENTIRE current contents of `src/ui/App.tsx` into a new `src/ui/TimerPage.tsx`, renaming the component `App`→`TimerPage` and changing its export to a named `export function TimerPage()`. Keep all timer logic (the `init` effect via `const init = useStore((st) => st.init)`, `useTimer`, `pointerHandlers`, layout B, dialogs). REMOVE the theme effect from here (it moves to the shell `App` in Step 3) and remove the default export.

- [ ] **Step 2: Create `src/ui/NavBar.tsx`**

```tsx
import { NavLink } from 'react-router-dom'

const link = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1 rounded-md text-sm font-medium ${
    isActive
      ? 'bg-indigo-600 text-white'
      : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
  }`

export function NavBar() {
  return (
    <nav className="flex items-center gap-2 px-4 py-2 border-b border-zinc-100 dark:border-zinc-800">
      <span className="font-semibold text-zinc-700 dark:text-zinc-200 mr-2">CubeTimer</span>
      <NavLink to="/timer" className={link}>Timer</NavLink>
      <NavLink to="/solver" className={link}>Solver</NavLink>
    </nav>
  )
}
```

- [ ] **Step 3: Create the minimal `src/ui/SolverPage.tsx` placeholder**

```tsx
export function SolverPage() {
  return (
    <div className="p-6 text-zinc-500">Solver — coming together…</div>
  )
}

export default SolverPage
```

- [ ] **Step 4: Rewrite `src/ui/App.tsx` as the shell**

```tsx
import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { NavBar } from './NavBar'
import { TimerPage } from './TimerPage'

const SolverPage = lazy(() => import('./SolverPage'))

export function App() {
  const theme = useStore((s) => s.settings.theme)

  // Apply theme to <html> (light/dark/system) — shell-level so it covers all routes.
  useEffect(() => {
    const root = document.documentElement
    const apply = (dark: boolean) => root.classList.toggle('dark', dark)
    if (theme === 'dark') { apply(true); return }
    if (theme === 'light') { apply(false); return }
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) { apply(false); return }
    apply(mq.matches)
    const onChange = (e: MediaQueryListEvent) => apply(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  return (
    <div className="h-full flex flex-col">
      <NavBar />
      <div className="flex-1 min-h-0">
        <Routes>
          <Route path="/timer" element={<TimerPage />} />
          <Route
            path="/solver"
            element={
              <Suspense fallback={<div className="h-full grid place-items-center text-zinc-400">Loading solver…</div>}>
                <SolverPage />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/timer" replace />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
```

Note: `App` no longer reads the full store via `useStore()`; it selects only `settings.theme`. The theme effect previously in App/TimerPage now lives ONLY here. Ensure `TimerPage` no longer has a theme effect (Step 1).

- [ ] **Step 5: Update `src/main.tsx` to add the router**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './ui/App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

- [ ] **Step 6: Rewrite `src/ui/App.test.tsx` (routing)**

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { App } from './App'
import { useStore } from '../store/useStore'
import { replaceAll } from '../storage/db'
import { __resetInitForTests } from '../store/useStore'

beforeEach(async () => {
  localStorage.clear()
  await replaceAll([], [])
  __resetInitForTests()
  useStore.setState({ ready: false, sessions: [], solves: [], scramble: '' })
})

describe('App routing', () => {
  it('shows the timer on /timer', async () => {
    render(<MemoryRouter initialEntries={['/timer']}><App /></MemoryRouter>)
    await waitFor(() => expect(screen.getByLabelText('Active session')).toBeInTheDocument())
  })

  it('redirects / to /timer', async () => {
    render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>)
    await waitFor(() => expect(screen.getByLabelText('Active session')).toBeInTheDocument())
  })

  it('shows the NavBar with both links', () => {
    render(<MemoryRouter initialEntries={['/timer']}><App /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Timer' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Solver' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 7: Create `src/ui/TimerPage.test.tsx` (the old App test)**

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TimerPage } from './TimerPage'
import { useStore, __resetInitForTests } from '../store/useStore'
import { replaceAll } from '../storage/db'

beforeEach(async () => {
  localStorage.clear()
  await replaceAll([], [])
  __resetInitForTests()
  useStore.setState({ ready: false, sessions: [], solves: [], scramble: '' })
})

describe('TimerPage', () => {
  it('initializes and shows the timer once ready', async () => {
    render(<MemoryRouter><TimerPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByLabelText('Active session')).toBeInTheDocument())
    expect(screen.getByText('0.00')).toBeInTheDocument()
  })
})
```
(If `TimerPage` uses `NavLink`/router-free components only, `MemoryRouter` wrapping is still safe. If it doesn't use any router hooks, the wrapper is harmless.)

- [ ] **Step 8: Run tests, lint, build**

Run: `npm run test && npm run lint && npm run build`
Expected: all green. The timer still works under `/timer`; routing tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/main.tsx src/ui/NavBar.tsx src/ui/TimerPage.tsx src/ui/App.tsx src/ui/SolverPage.tsx src/ui/App.test.tsx src/ui/TimerPage.test.tsx
git commit -m "feat: react-router shell with NavBar; extract TimerPage; lazy SolverPage"
```

---

## Task 6: ColorPalette + NetEditor

**Files:**
- Create: `src/ui/ColorPalette.tsx`
- Create: `src/ui/NetEditor.tsx`
- Test: `src/ui/ColorPalette.test.tsx`
- Test: `src/ui/NetEditor.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/ui/ColorPalette.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ColorPalette } from './ColorPalette'

describe('ColorPalette', () => {
  it('renders 6 color buttons and reports selection', () => {
    const onSelect = vi.fn()
    render(<ColorPalette active="U" onSelect={onSelect} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBe(6)
    fireEvent.click(screen.getByLabelText('Paint color R'))
    expect(onSelect).toHaveBeenCalledWith('R')
  })
})
```

Create `src/ui/NetEditor.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NetEditor } from './NetEditor'
import { solvedFacelets } from '../cube/state'

describe('NetEditor', () => {
  it('renders 54 sticker cells and reports clicks by facelet index', () => {
    const onPaint = vi.fn()
    render(<NetEditor grid={solvedFacelets()} onPaint={onPaint} />)
    expect(screen.getAllByRole('button').length).toBe(54)
    fireEvent.click(screen.getByLabelText('sticker 0'))
    expect(onPaint).toHaveBeenCalledWith(0)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/ui/ColorPalette.test.tsx src/ui/NetEditor.test.tsx`
Expected: FAIL — modules missing.

- [ ] **Step 3: Implement `src/ui/ColorPalette.tsx`**

```tsx
import type { FaceKey } from '../facelets/facelets'
import { FACE_COLORS } from '../facelets/facelets'

const ORDER: FaceKey[] = ['U', 'R', 'F', 'D', 'L', 'B']

interface Props {
  active: FaceKey
  onSelect: (color: FaceKey) => void
}

export function ColorPalette({ active, onSelect }: Props) {
  return (
    <div className="flex gap-2">
      {ORDER.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Paint color ${c}`}
          onClick={() => onSelect(c)}
          className={`w-8 h-8 rounded-md border-2 ${active === c ? 'border-zinc-900 dark:border-white' : 'border-transparent'}`}
          style={{ backgroundColor: FACE_COLORS[c] }}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Implement `src/ui/NetEditor.tsx`**

```tsx
import type { FaceKey } from '../facelets/facelets'
import { FACE_COLORS } from '../facelets/facelets'
import { NET_CELLS, CENTER_INDICES } from '../cube/geometry'

const CENTERS = CENTER_INDICES as readonly number[]
const COLS = 12
const ROWS = 9

interface Props {
  grid: (FaceKey | null)[]
  onPaint: (index: number) => void
}

export function NetEditor({ grid, onPaint }: Props) {
  return (
    <div
      className="grid gap-0.5 w-full max-w-xs"
      style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)`, aspectRatio: `${COLS} / ${ROWS}` }}
    >
      {NET_CELLS.map((cell) => {
        const color = grid[cell.index]
        const isCenter = CENTERS.includes(cell.index)
        return (
          <button
            key={cell.index}
            type="button"
            aria-label={`sticker ${cell.index}`}
            disabled={isCenter}
            onClick={() => onPaint(cell.index)}
            style={{
              gridColumn: cell.col + 1,
              gridRow: cell.row + 1,
              backgroundColor: color ? FACE_COLORS[color] : '#d4d4d8',
            }}
            className="rounded-[2px] border border-zinc-800/20 aspect-square"
          />
        )
      })}
    </div>
  )
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/ui/ColorPalette.test.tsx src/ui/NetEditor.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/ui/ColorPalette.tsx src/ui/NetEditor.tsx src/ui/ColorPalette.test.tsx src/ui/NetEditor.test.tsx
git commit -m "feat: ColorPalette and 2D NetEditor painting components"
```

---

## Task 7: Cube3D (R3F) — browser-verified

**Files:**
- Create: `src/cube/Cube3D.tsx`

R3F components are not unit-tested in jsdom (no WebGL); the testable logic lives in `geometry.ts`/`state.ts`. This task is verified by the browser smoke test in Task 9.

- [ ] **Step 1: Implement `src/cube/Cube3D.tsx`**

```tsx
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { FaceKey } from '../facelets/facelets'
import { FACE_COLORS } from '../facelets/facelets'
import { STICKERS } from './geometry'

const UNPAINTED = '#3f3f46'

interface Props {
  grid: (FaceKey | null)[]
  onPaint: (index: number) => void
}

export function Cube3D({ grid, onPaint }: Props) {
  return (
    <div className="w-full aspect-square max-w-md mx-auto">
      <Canvas camera={{ position: [4, 4, 5], fov: 40 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 8, 6]} intensity={0.7} />
        {/* black cube body */}
        <mesh>
          <boxGeometry args={[3, 3, 3]} />
          <meshStandardMaterial color="#18181b" />
        </mesh>
        {/* stickers */}
        {STICKERS.map((s) => {
          const color = grid[s.index]
          return (
            <mesh
              key={s.index}
              position={s.position}
              onClick={(e) => { e.stopPropagation(); onPaint(s.index) }}
              onPointerOver={(e) => e.stopPropagation()}
            >
              {/* orient the plane to face outward along its normal */}
              <planeGeometry args={[0.86, 0.86]} />
              <meshStandardMaterial
                color={color ? FACE_COLORS[color] : UNPAINTED}
                polygonOffset
                polygonOffsetFactor={-1}
              />
              <StickerOrienter normal={s.normal} />
            </mesh>
          )
        })}
        <OrbitControls enablePan={false} minDistance={5} maxDistance={12} />
      </Canvas>
    </div>
  )
}

// Rotates the parent mesh so its +Z (plane normal) aligns with the sticker's outward normal.
function StickerOrienter({ normal }: { normal: [number, number, number] }) {
  // Plane default normal is +Z. Compute Euler to point +Z at `normal`.
  const [x, y, z] = normal
  // Map axis-aligned normals to rotations (sufficient for the 6 faces).
  let rotation: [number, number, number] = [0, 0, 0]
  if (z === 1) rotation = [0, 0, 0]
  else if (z === -1) rotation = [0, Math.PI, 0]
  else if (x === 1) rotation = [0, Math.PI / 2, 0]
  else if (x === -1) rotation = [0, -Math.PI / 2, 0]
  else if (y === 1) rotation = [-Math.PI / 2, 0, 0]
  else if (y === -1) rotation = [Math.PI / 2, 0, 0]
  // Apply rotation to the parent via a ref-less primitive: use a group wrapper instead.
  return <group rotation={rotation} />
}
```

> IMPLEMENTER NOTE: `StickerOrienter` as written cannot rotate its parent mesh. Restructure so each sticker is a `<group position={s.position} rotation={orient(s.normal)}>` wrapping a `<mesh onClick=…><planeGeometry/><meshStandardMaterial/></mesh>` at local origin. Extract `orient(normal): [number,number,number]` (the switch above) to module scope and unit-test it in `geometry.test.ts` if you move it to `geometry.ts`. Keep the click handler on the inner mesh. This is the small structural fix to make orientation work.

- [ ] **Step 2: Build to confirm it type-checks and bundles**

Run: `npm run lint && npm run build`
Expected: clean. (No unit test — verified in the browser at Task 9.)

- [ ] **Step 3: Commit**

```bash
git add src/cube/Cube3D.tsx
git commit -m "feat: R3F 3D cube (stickers from grid, orbit, click-to-paint)"
```

---

## Task 8: SolverPage (Phase 1 — input only)

**Files:**
- Rewrite: `src/ui/SolverPage.tsx`
- Test: `src/ui/SolverPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/ui/SolverPage.test.tsx`:
```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SolverPage } from './SolverPage'
import { useSolverStore } from '../solver/store'

// jsdom has no WebGL; stub Cube3D so the page renders without a real canvas.
vi.mock('../cube/Cube3D', () => ({ Cube3D: () => null }))

beforeEach(() => useSolverStore.getState().resetToSolved())

describe('SolverPage (input)', () => {
  it('renders palette, net, and helper buttons', () => {
    render(<SolverPage />)
    expect(screen.getByLabelText('Paint color R')).toBeInTheDocument()
    expect(screen.getAllByLabelText(/^sticker /).length).toBe(54)
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /scramble/i })).toBeInTheDocument()
  })

  it('painting via the net updates the store', () => {
    useSolverStore.getState().clear()
    useSolverStore.getState().setActiveColor('R')
    render(<SolverPage />)
    fireEvent.click(screen.getByLabelText('sticker 0'))
    expect(useSolverStore.getState().grid[0]).toBe('R')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ui/SolverPage.test.tsx`
Expected: FAIL (current placeholder has none of these).

- [ ] **Step 3: Rewrite `src/ui/SolverPage.tsx`**

```tsx
import { useSolverStore } from '../solver/store'
import { Cube3D } from '../cube/Cube3D'
import { NetEditor } from '../ui/NetEditor'
import { ColorPalette } from '../ui/ColorPalette'

export function SolverPage() {
  const grid = useSolverStore((s) => s.grid)
  const activeColor = useSolverStore((s) => s.activeColor)
  const { paintSticker, setActiveColor, resetToSolved, clear, scramble } = useSolverStore.getState()

  return (
    <div className="h-full mx-auto max-w-6xl px-4 py-4 grid gap-6 md:grid-cols-[1.3fr_1fr]">
      {/* Left: input */}
      <section className="flex flex-col gap-4 min-h-0">
        <Cube3D grid={grid} onPaint={paintSticker} />
        <ColorPalette active={activeColor} onSelect={setActiveColor} />
        <NetEditor grid={grid} onPaint={paintSticker} />
        <div className="flex gap-2">
          <button type="button" onClick={resetToSolved} className="rounded-md px-3 py-1.5 text-sm border border-zinc-300 dark:border-zinc-700">Reset</button>
          <button type="button" onClick={clear} className="rounded-md px-3 py-1.5 text-sm border border-zinc-300 dark:border-zinc-700">Clear</button>
          <button type="button" onClick={scramble} className="rounded-md px-3 py-1.5 text-sm border border-zinc-300 dark:border-zinc-700">Scramble</button>
        </div>
      </section>

      {/* Right: solution (Phase 2 fills this in) */}
      <aside className="rounded-xl border border-zinc-100 dark:border-zinc-800 p-4 text-zinc-400">
        Paint your cube, then solving lands here.
      </aside>
    </div>
  )
}

export default SolverPage
```

Note: using `useSolverStore.getState()` for the (stable) action functions avoids extra subscriptions; `grid`/`activeColor` are subscribed via selectors so the UI re-renders on changes.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/ui/SolverPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run full test + lint + build**

Run: `npm run test && npm run lint && npm run build`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/ui/SolverPage.tsx src/ui/SolverPage.test.tsx
git commit -m "feat: solver page input (3D cube + net + palette + reset/clear/scramble)"
```

---

## Task 9: Phase 1 verification (incl. browser smoke)

**Files:** none (verification only)

- [ ] **Step 1: Full automated gate**

Run: `npm run typecheck && npm run lint && npm run test && npm run build`
Expected: all clean/green.

- [ ] **Step 2: Browser smoke (the 3D check the tests can't do)**

Run `npm run dev`, open `/solver`. Verify:
1. The 3D cube renders (white/colored stickers on a black body) and orbits with drag.
2. Picking a palette color and clicking a 3D sticker paints it; the same sticker changes on the 2D net (and vice-versa) — confirming 3D↔net↔facelet-index consistency.
3. **Clear** blanks all non-center stickers (gray); centers stay colored. **Reset** restores solved. **Scramble** fills a random pattern.
4. Nav switches between `/timer` (timer still fully works) and `/solver`.

If a 3D face appears mirrored/rotated relative to the 2D net, adjust that face's `right`/`down` in `geometry.ts` `FACE_BASIS` and re-verify (this is the one orientation detail tests can't catch).

- [ ] **Step 3: Commit any fixes from the smoke test**

```bash
git add -A
git commit -m "fix: phase 1 browser-smoke corrections"
```
(Only if changes were needed.)

---

## Self-Review notes (author)

- **Spec coverage (Phase 1 scope):** routing + NavBar + TimerPage extraction (T5), lazy SolverPage (T5/T8), shared 3D cube render+orbit+paint (T7), 2D net paint synced to same grid (T6/T3-geometry), color palette (T6), reset/clear/scramble helpers (T4/T8), grid model with fixed centers + null unpainted (T4). Solver/validation/playback are Phase 2.
- **Type consistency:** `PaintGrid = (FaceKey|null)[]`, `FaceKey`/`FACE_COLORS` reused from `facelets.ts`; `CENTER_INDICES`, `NET_CELLS`, `STICKERS` from `geometry.ts`; store actions `paintSticker/resetToSolved/clear/scramble/setActiveColor` consistent across store, NetEditor, Cube3D, SolverPage.
- **Known browser-only risk:** the `FACE_BASIS` 3D orientation (T7/T3) and the `StickerOrienter` structural fix (T7 note) are verified in T9's browser smoke, not unit tests.
- **Theme effect** moves from the old App into the shell `App` only (T5 Step 1 + Step 4) — must not be duplicated in `TimerPage`.
