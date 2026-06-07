# CubeSolver — 3D Engine + Solver (Sub-project #2)

**Date:** 2026-06-07
**Status:** Approved design — ready for implementation planning
**Branch:** `feature/solver-3d-engine` (based on `feature/timer-portable-settings`)
**Sub-project:** #2 of the CubeTimer platform. Builds on #1 (Timer + portable settings). The shared 3D cube built here is the foundation the future Tutor and Playground sub-projects reuse.

## Overview

Add a **Solver** tool to the platform: a shared interactive **3D cube** (React Three Fiber) plus a **Kociemba two-phase solver** (via `cubejs`, run in a Web Worker). Introduce **react-router** so the Timer and Solver coexist as routes. The user inputs their cube's colors through a **synced 2D net + 3D paint**, the app validates the state, solves it, and **animates the solution** in 3D with full playback controls. 3×3 only. Everything remains client-side, no login, no ads.

### Goals
- A genuinely useful "solve it for me": paint your cube → get a short solution → watch it solve in 3D.
- Establish the real shared 3D cube engine (render, orbit, animate, paint) that later sub-projects reuse.
- Keep the Timer page fast by lazy-loading the heavy 3D/solver route.
- Beginner-friendly, clean UI; layout B (input left / solution right).

### Non-goals (v1 — YAGNI)
- Free-twist cube gameplay (that is the Playground sub-project).
- The learn-to-solve Tutor.
- Webcam color scanning.
- Puzzles other than the 3×3.
- Persisting solver state into the export/import system.

## Users
Anyone with a scrambled 3×3 who wants it solved, from beginners (who can't solve it) to cubers verifying a state. Must be usable with zero setup and no account.

## Tech & Architecture

- **Stack:** existing React 19 + TypeScript + Tailwind v4 + Vite + Zustand project.
- **New dependencies:** `react-router-dom` (routing), `three`, `@react-three/fiber`, `@react-three/drei` (3D). Reuse existing `cubejs` for the solver.
- **Routing:** `App` becomes a layout shell with a top `NavBar` and `<Routes>`. Routes: `/timer` (the existing timer UI, extracted into `TimerPage`) and `/solver`; `/` redirects to `/timer`.
- **Code splitting:** the `/solver` route is loaded via `React.lazy` + `Suspense`, so `three`/R3F/solver code only downloads when the Solver is opened. The Timer route stays light.

### Module structure (independently testable units)

| Module | Responsibility | Depends on |
|--------|----------------|------------|
| `routing` (in `App.tsx` + `ui/NavBar.tsx` + `ui/TimerPage.tsx`) | Layout shell, nav, routes; extract current timer UI into `TimerPage`. | react-router-dom |
| `cube/state.ts` | Logical 3×3 state: 54-facelet model, apply-move, to/from facelet string. Backed by cubejs's `Cube` for proven move logic. Pure, no 3D. | cubejs/lib/cube |
| `cube/animation.ts` | Pure playback controller: given a solution, index, and speed, decide the next turn; advance/step/reverse. No 3D. | — |
| `cube/Cube3D.tsx` | R3F component: render 54 stickers from a facelet array; drei `OrbitControls`; animate one face-turn; paint mode (click sticker → set active color). | three, @react-three/fiber, @react-three/drei |
| `solver/validate.ts` | Pre-solve validation of a `PaintGrid`: all 54 painted (no nulls), each color ×9, six distinct centers. Returns either a complete `Facelets` or a friendly error message. Pure. | — |
| `solver/worker.ts` | Web Worker: load cubejs, `initSolver()` once, return a solution (or error) for a facelet string. | cubejs |
| `solver/useSolver.ts` | Spawn the worker; expose init status + `solve(facelets) → Promise<solution \| error>`. | solver/worker |
| `solver/store.ts` | Zustand `useSolverStore`: solver-tool state + actions (below). | cube/state, solver/* |
| UI: `SolverPage`, `NetEditor`, `ColorPalette`, `SolveButton`, `MoveList`, `PlaybackControls` | Layout B; painting + solution/playback. | store, Cube3D |

## Data Model

```ts
// 54 stickers in cubejs order U(0-8) R(9-17) F(18-26) D(27-35) L(36-44) B(45-53)
type FaceKey = 'U' | 'R' | 'F' | 'D' | 'L' | 'B'   // reuse from facelets module

// Editable paint grid: a sticker may be unpainted (null). The 6 center stickers
// (indices 4,13,22,31,40,49) are fixed to U,R,F,D,L,B respectively and never null.
type PaintGrid = (FaceKey | null)[]                 // length 54

// A fully-painted state (no nulls) — what the solver/animation consume.
type Facelets = FaceKey[]                            // length 54

type SolveStatus = 'idle' | 'initializing' | 'solving' | 'solved' | 'error'

interface SolverState {
  grid: PaintGrid             // current editable/displayed paint state (centers fixed)
  activeColor: FaceKey        // currently selected paint color
  solution: string[] | null   // solution as a list of moves, e.g. ["R","U","R'",...]
  playbackIndex: number        // how many moves have been applied/shown (0..solution.length)
  isPlaying: boolean
  speedMs: number             // ms per turn
  status: SolveStatus
  error: string | null
}
```

State transitions for the grid: **Reset to solved** → every sticker its face color (full, no nulls). **Scramble** → a random valid full coloring (apply the shared scramble source to a solved cube). **Clear** → all non-center stickers `null`, centers kept. Solving requires a complete grid (validation rejects any `null`).

Helper states reused from the platform: `FaceKey`/`FACE_COLORS` from `src/facelets/facelets.ts`.

## Feature Detail

### Routing & layout
- `App` renders a `NavBar` (Timer | Solver) and `<Routes>`. `/timer` → `TimerPage` (the current timer UI, moved verbatim out of `App`), `/solver` → lazy `SolverPage`, `/` → redirect to `/timer`.
- Theme handling (the dark-mode effect) stays at the shell level so it applies to all routes.

### Solver page (layout B)
- **Left pane — input:** `Cube3D` (orbit + paint) and `NetEditor` (2D net paint) both bound to the store's `grid`; a `ColorPalette` (6 WCA colors) sets `activeColor`. Unpainted (`null`) stickers render as a neutral gray. Helper buttons: **Reset to solved**, **Clear** (blank/unpainted), **Scramble** (random valid state via the existing scramble source applied to a solved cube).
- **Right pane — solution:** a **Solve** button; once solved, a `MoveList` (the move sequence with the current move highlighted and a counter like `7 / 19`) and `PlaybackControls` (play/pause, step forward, step back, speed slider/presets).

### 3D cube (`Cube3D`)
- Renders 27 cubies / 54 stickers colored from `facelets`. drei `OrbitControls` for view rotation.
- **Paint mode:** clicking a sticker sets it to `activeColor` (updates `facelets` in the store).
- **Animation:** animates a single face quarter/half turn (rotating the affected layer group) to visualize a move during playback.
- Graceful fallback if WebGL is unavailable (see Error handling).

### Solve flow
1. **Solve** clicked → `validate(grid)`.
2. If invalid → show the specific message; do not call the worker.
3. If valid (returns a complete `Facelets`) → `status='solving'`, send facelets to the worker; worker (after one-time `initSolver()`, shown as `status='initializing'` the first time) returns `solution` or an error.
4. On success → store `solution`, `playbackIndex=0`, `status='solved'`. On unsolvable → `status='error'` with a friendly message.

### Playback
- **Play** advances `playbackIndex` over time at `speedMs` per move, animating each face-turn on `Cube3D`; stops at the end.
- **Step forward/back** moves one turn at a time (animating).
- **Speed** sets `speedMs`.
- The displayed cube always reflects the validated input `Facelets` with `solution[0..playbackIndex]` applied (computed via `cube/state.ts`).
- Editing the input (paint/Reset/Clear/Scramble) clears the solution and resets playback.

## Persistence
Solver state is **transient** (not persisted) in v1. (Optionally, the last-painted facelets may be cached in `localStorage` as a convenience — a nice-to-have, not required.) The solver does not touch the timer's IndexedDB or the export/import format.

## Error Handling / Resilience
- **Invalid counts/centers:** specific client-side message ("You have 10 white and 8 yellow stickers"; "Two faces share the same center color") before any solve.
- **Well-formed but unsolvable:** solver returns an error → "This cube state can't be solved — double-check the colors."
- **Worker init/solve failure:** show a recoverable message in the right pane; input stays usable. Fallback path (see Risk) keeps solving available.
- **No WebGL:** `Cube3D` renders a fallback notice; the 2D `NetEditor` still paints and the user can still solve and read the `MoveList` (playback animation is the only thing lost).

## Testing Strategy
- **End-to-end solver logic (strongest):** scramble a solved state, solve via the worker logic, apply the returned solution to `cube/state.ts`, and assert the cube reaches solved. Runs in node/vitest (cubejs solve works in node).
- **`cube/state.ts`:** move-then-inverse returns to start; facelet round-trip; applying a known scramble matches the expected facelet string.
- **`cube/animation.ts`:** advance/step-forward/step-back/clamp at ends; index→which-move mapping.
- **`solver/validate.ts`:** incomplete grid (nulls) rejected, count errors, center-collision errors, valid solved state passes (returns a complete `Facelets`), a well-formed-but-unsolvable state is left for the solver (validate passes counts), a miscount is rejected.
- **Routing:** `/timer` renders the timer, `/solver` renders the solver, NavBar switches; `/` redirects.
- **UI:** palette selection sets active color; painting a net cell updates `facelets`; move-list highlight tracks `playbackIndex`; playback controls advance/step the index.
- **3D (`Cube3D`):** lightly tested — R3F is hard to unit-test in jsdom, so all testable logic (state, animation controller) lives in pure modules outside the component.

## Phasing
The implementation plan builds in two stages, each leaving the app working:
- **Phase 1 — Engine + input:** add react-router + `NavBar`, extract `TimerPage`, build `cube/state.ts`, `Cube3D` (render, orbit, paint), `NetEditor`, `ColorPalette`, and the input helpers (Reset/Clear/Scramble). Result: a working "paint & view your cube in 3D" page at `/solver`.
- **Phase 2 — Solver + playback:** add `solver/validate.ts`, `solver/worker.ts`, `solver/useSolver.ts`, the Solve flow, `cube/animation.ts`, `MoveList`, and `PlaybackControls`. Result: full solve + animated playback.

## Known Risk
Running cubejs's solver inside a Vite-built Web Worker may hit the same UMD/top-level-`this` interop quirk we fixed for `cube.js` (the package root pulls in `lib/solve.js`, which reads top-level `this`). **Mitigations, in order:** (1) in a classic Worker, top-level `this` is `self`, so a classic (non-module) worker may sidestep it; (2) apply the same submodule/shim technique used for `cube.js`; (3) **fallback:** run the solver on the main thread — the only slow part is the one-time `initSolver()` table build (~few hundred ms, behind an `initializing` state), while the solve itself is milliseconds. The plan will resolve this explicitly and choose the cleanest working option.

## Future integration notes
The `cube/state.ts` model, `cube/animation.ts` controller, and `Cube3D` component are designed to be reused by the Tutor and Playground sub-projects. A future nicety: a "Solve this scramble" hand-off from the Timer (the scramble module is already shared).
