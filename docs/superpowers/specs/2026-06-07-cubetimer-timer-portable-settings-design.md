# CubeTimer — Timer + Portable Settings (v1)

**Date:** 2026-06-07
**Status:** Approved design — ready for implementation planning
**Sub-project:** #1 of the larger CubeTimer platform (solver, tutor, playground follow as separate specs and will reuse this foundation).

## Overview

A no-login, no-ads, fully open speedcubing **timer and tracker** for the 3×3 cube, with a **file-based export/import** system so users can move their data and preferences between browsers and devices. Everything runs client-side; all data lives in the user's browser. This sub-project is intentionally self-contained and does not require the future 3D solve engine.

### Goals
- Genuinely useful speedcubing timer with the stats real cubers care about.
- Clean, simple, beginner-friendly UI — usable with zero setup and no account.
- Portability baked in from day one (file-based, user chooses what to export).
- Build the small shared primitives (cube facelet model, scramble interface) in a way the later solver/tutor/playground can reuse.

### Non-goals (v1 — YAGNI)
- Solver, learn-to-solve tutor, virtual playground.
- Puzzles other than the 3×3.
- Bluetooth / Stackmat hardware timer integration.
- Cloud sync or user accounts.
- The encrypted copy-paste string transfer method (file-only for v1).

## Users
Speedcubers from absolute beginners to experienced practitioners. Beginners must be able to land on the page and start timing immediately, with advanced features (inspection, stats depth, sessions) available but never in the way.

## Tech & Architecture

- **Stack:** existing React 19 + TypeScript + Tailwind v4 + Vite project.
- **State management:** Zustand store holding `settings`, `sessions`, `solves`, and live `timerState`. Chosen so the scramble bar, timer, stats card, and solve list stay in sync without prop-drilling, with minimal boilerplate.
- **New dependencies:** `scrambow` (WCA random-state scrambles), `cubejs` (compute facelet state from a scramble for the 2D preview), `zustand` (state), `idb` or equivalent thin wrapper (IndexedDB ergonomics). Graphs are hand-rolled SVG — no charting dependency.

### Module structure (independently testable units)

| Module | Responsibility | Depends on |
|--------|----------------|------------|
| `scramble/` | `ScrambleSource` interface + a `scrambow`-backed implementation producing WCA random-state 3×3 scrambles. Interface lets the future solver-based generator swap in. | `scrambow` |
| `facelets/` | Pure function turning a scramble string into a 54-sticker facelet array via `cubejs`, for the 2D preview. (Replaces a hand-rolled cube model — `cubejs` guarantees correctness; the real 3D engine arrives with the solver sub-project.) | `cubejs` |
| `timer/` | Timer state machine (hook): idle → ready → running → stopped, with optional inspection. Emits a completed solve. | — |
| `stats/` | Pure functions for best, worst, mean, ao5/ao12/ao100, current vs. best rolling averages. WCA-correct, DNF-aware. | — |
| `storage/` | Persistence: settings → `localStorage`; sessions + solves → IndexedDB. Load on boot, write-through on change. | `idb` |
| `transfer/` | Versioned JSON export/import: build export payload, validate + migrate on import, merge/replace. | `storage` |
| `ui/` | Presentational + container components (listed below). | store, all above |

## Data Model

```ts
type Penalty = 'none' | 'plus2' | 'dnf';

interface Solve {
  id: string;            // uuid
  sessionId: string;
  timeMs: number;        // raw recorded time, excluding penalty
  penalty: Penalty;      // effective time = timeMs (+2000 if plus2; DNF excluded from stats)
  scramble: string;      // the scramble used
  createdAt: number;     // epoch ms
  comment?: string;
}

interface Session {
  id: string;            // uuid
  name: string;
  createdAt: number;
}

interface Settings {
  theme: 'light' | 'dark' | 'system';
  inspection: boolean;            // default false
  inspectionAudioCues: boolean;   // default true when inspection on
  holdToStartMs: number;          // default 300
  distractionFree: boolean;       // collapses right column
  decimalPlaces: 2 | 3;           // timer display precision, default 2
  activeSessionId: string;
}

interface ExportFile {
  version: number;       // schema version for migration
  exportedAt: number;
  settings?: Settings;            // present if "settings" chosen
  sessions?: Session[];           // present if sessions/solves chosen
  solves?: Solve[];               // present if solves chosen
}
```

## Feature Detail

### Layout (option B — balanced two-column)
- **Left column:** scramble bar (top) + large central timer display.
- **Right column:** compact stats card (top), scrollable solve list (middle), 2D scramble preview (bottom).
- **Distraction-free toggle:** collapses the right column to leave only the scramble + timer. Generous whitespace throughout.
- Responsive: on narrow screens the right column stacks below the timer.

### Timer behavior
- Spacebar **hold for `holdToStartMs` (default 300 ms)** to arm (display turns "ready"); **release** to start; **any key / tap** stops. Touch-friendly equivalents (press-and-hold, tap).
- On stop, a `Solve` is recorded against the active session with the current scramble; a new scramble is generated immediately.
- Display precision follows `decimalPlaces`.

### Inspection (optional, default off)
- 15-second countdown before the solve starts.
- WCA rules: **+2** penalty if the solve starts after 15s; **DNF** if after 17s.
- Audio cues at **8s** and **12s** when `inspectionAudioCues` is on.

### Stats (WCA-correct, DNF-aware)
- **Single values:** best, worst, session mean (arithmetic mean of all non-DNF effective times).
- **Averages:** ao5, ao12, ao100 computed over the most recent N solves — **drop the single best and single worst, mean the rest**. A DNF counts as the worst (dropped); **two or more DNFs in the window ⇒ the average is DNF**.
- Show **current** (latest window) and **best** (best rolling window over the session) for ao5/ao12/ao100.
- Effective time for a `plus2` solve is `timeMs + 2000`.

### Solve list
- Scrollable, newest-first. Each row shows index, effective time (with penalty marker), and a quick menu: toggle **+2**, toggle **DNF**, add/edit **comment**, **delete**.
- Editing a solve recomputes affected stats live.

### Graphs (hand-rolled SVG)
- **Per-solve chart:** effective time per solve across the session.
- **Average-trend line:** rolling ao5 (or selected window) over the session to visualize improvement.
- DNFs rendered distinctly (e.g., gap / marker). No external charting library.

### Sessions
- Create, rename, delete, switch. Deleting a session deletes its solves (with confirmation). Each solve belongs to exactly one session. `activeSessionId` persists in settings.

### Portable export / import (file-only)
- **Export dialog** lets the user choose: *settings only*, *settings + all solves*, or *pick specific sessions* (their solves included). Produces a versioned `.json` download named e.g. `cubetimer-export-YYYY-MM-DD.json`.
- **Import dialog** accepts a file, validates `version` + shape, runs migrations if older, then offers **Merge** (add to existing data; new IDs where they collide) or **Replace** (wipe + load). Invalid files are rejected with a clear message.
- **Format:** plain, human-readable JSON (no encryption). Rationale: moving one's own data between one's own browsers has no secret to protect; plain JSON is debuggable, future-proof, and shareable. Optional password encryption can be added later as an opt-in if requested.

## Persistence
- **Settings:** `localStorage` (small, synchronous, fine for config).
- **Sessions + solves:** IndexedDB (handles tens of thousands of solves without the ~5 MB localStorage ceiling).
- Store hydrates from persistence on boot; mutations write through to persistence.

## Error Handling
- Corrupt/missing persisted data ⇒ fall back to defaults (fresh default session), never crash.
- Import validation failures ⇒ clear, non-destructive error; existing data untouched.
- Scramble generation failure ⇒ retry, then show a recoverable error in the scramble bar; timing remains usable.
- Audio cue failures (autoplay restrictions) ⇒ silently degrade; timing unaffected.

## Testing Strategy
- **`stats/`:** unit tests against known WCA average cases, including DNF handling (1 DNF dropped, ≥2 DNF ⇒ DNF average), +2 effective times, and small-N edge cases (fewer solves than window).
- **`facelets/`:** a known scramble maps to the expected 54-char facelet string (golden test via `cubejs`); solved state maps to all-matching faces.
- **`scramble/`:** interface conformance + that generated scrambles parse and apply cleanly.
- **`timer/`:** state-machine transitions, including inspection +2/DNF thresholds.
- **`transfer/`:** round-trip export → import equality; version migration; merge vs. replace; rejection of malformed files.
- **UI:** key timer interactions (hold/release/stop), solve-edit recompute, distraction-free toggle.

## Future integration notes
The `ScrambleSource` interface is deliberately minimal but shaped to be reused by the future solver/tutor/playground sub-projects, which will introduce the full 3D engine and a solver-based scramble generator. The v1 preview leans on `cubejs` for facelet correctness; the later engine sub-project supersedes it.
