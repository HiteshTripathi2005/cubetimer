# Solver Worker, Full-Width Responsive Layout, OLL/PLL Algorithms Page

Date: 2026-06-10
Status: Approved

## Problems

1. **Solve freezes the whole site.** `solveFacelets` calls `initSolver()`, which
   builds cubejs's Kociemba pruning tables synchronously on the main thread
   (multi-second). All rendering and input block until it finishes.
2. **Layout is a narrow centered column.** `SolverPage` uses `mx-auto max-w-6xl`,
   wasting space on big screens; small screens aren't tuned (canvas size,
   touch targets).
3. **No OLL/PLL algorithm reference** anywhere in the app.

## Design

### 1. Web Worker solve

- `src/solver/solver.worker.ts` — imports `virtual:cubejs-solver` (the existing
  vite plugin applies to Vite worker bundles too), reuses the sync
  `solveFacelets` core, and handles messages:
  - `{ type: 'init' }` → builds tables, replies `{ type: 'ready' }`
  - `{ type: 'solve', id, facelets }` → replies `{ type: 'solved', id, solution }`
    or `{ type: 'error', id, message }`
- `src/solver/client.ts` — lazy singleton worker; exposes
  `warmSolver(): void` and `solveAsync(facelets: FaceKey[]): Promise<string[]>`
  (request id correlation; rejects with `SolverError`).
- Store: `solveCurrent` awaits `solveAsync` instead of calling `solveFacelets`
  directly; drops the `setTimeout(0)` hack.
- `SolverPage` calls `warmSolver()` on mount so the first solve doesn't pay the
  table build.
- Tests: `solve.test.ts` keeps testing the sync core. Store tests mock
  `solver/client.ts` (jsdom has no Worker).

### 2. Full-width responsive layout

- `SolverPage`: remove `max-w-6xl mx-auto`. Grid:
  `grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]`, full width,
  padding scales with breakpoint. Mobile stacks: cube on top with responsive
  height, controls/solution below, touch-friendly buttons.
- `TimerPage`: same full-width pass (remove centering caps where they cramp
  big screens; verify mobile stacking).
- `NavBar`: add **Algorithms** link; keep compact on phones (horizontal scroll
  if needed).

### 3. `/algorithms` page (lazy route)

- Data: `src/algs/oll.ts` (57 cases: id, name, group, alg) and
  `src/algs/pll.ts` (21 cases: name, group, alg). Standard speedcubing algs.
- Diagrams computed, not hand-encoded: apply `inverse(alg)` to a solved cube
  (existing `applyMoves` from `src/cube/state.ts`), then render the last-layer
  top view as a small SVG (`CaseDiagram` component):
  - OLL: U stickers yellow/grey + side strips showing oriented/misoriented.
  - PLL: U face solved-color + colored side sticker strips.
  This guarantees every diagram matches its algorithm.
- UI: searchable, grouped card grid (OLL groups: Dot, Line, Cross, T, etc.;
  PLL: corner swaps, edge cycles, G perms). 1 column on phones → 4+ on wide
  screens. Card = diagram + name + monospace alg.
- Tests: alg data sanity (counts, valid notation), diagram derivation
  (known case → expected sticker pattern), page render/search.

## Error handling

- Worker errors propagate as `SolverError` messages into the existing
  `status: 'error'` UI path (color tally etc. unchanged).
- Worker creation failure (ancient browser) → reject with a clear message.

## Out of scope

- CFOP-style solve breakdown (solver output stays Kociemba two-phase).
- F2L/other alg sets (data files make them easy to add later).
