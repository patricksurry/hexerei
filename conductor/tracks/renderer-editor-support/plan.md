# Implementation Plan: HexMap Renderer: Editor Support & Build

- **Track ID:** `hexmap-renderer-editor-support`

## Phase 1: Highlights & Core Support
- [x] Task 1.1: Add a dedicated `<g id="highlights">` group during `HexRenderer` initialization.
- [x] Task 1.2: Implement `highlight(hexIds: string[])` to draw temporary overlays.
- [x] Task 1.3: Unit test for highlights in `src/renderer.test.ts`.

## Phase 2: Reactivity
- [x] Task 2.1: Implement `update(mesh: MeshMap)` by factoring out rendering logic to a reusable method.
- [x] Task 2.2: Ensure efficient D3 `.join()` use for both hexes and labels.
- [x] Task 2.3: Unit test for reactivity in `src/renderer.test.ts`.

## Phase 3: Build System
- [x] Task 3.1: Update `vite.config.mts` to support Library Mode with `lib` output.
- [x] Task 3.2: Externalize `d3` and `@hexmap/core`.
- [x] Task 3.3: Add `npm run build` script to `package.json` and verify successful build.
- [x] Task 3.4: Configure package exports/main/module in `package.json`.

## Finalization
- [x] Task 4.1: Ensure all tests and builds pass.
- [x] Task 4.2: Mark track as completed in `conductor/tracks.md`.
