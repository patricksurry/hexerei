# Authoring Workflow Review & Improvement Plan

**Date:** 2026-04-04
**Goal:** Make the editor feel like a polished tool for authoring simple wargame maps (BFM-class), addressing friction discovered during manual authoring, and generalizing the fixes to improve all authoring workflows.

**Prior art:** ISSUES.md (manual authoring feedback), UX rounds 1-3, HexPath serialize refactor.

---

## Methodology: How to Test Authoring Workflows

### What automated tooling can do

**State machine audit** (priority) — write tests that exhaustively walk App.tsx state transitions (selection mode, paint mode, command bar mode, feature editing) and assert no invalid states are reachable. This catches the class of bugs where actions in one mode produce unexpected results in another (e.g., command bar Enter during feature selection).

**React Testing Library integration tests** — already in use. Extend with workflow-level tests: paint deduplication, alt-click removal, command bar edit-vs-create, save/load round-trip.

**Playwright E2E** — deferred. Valuable for regression testing but lower priority than getting the state machine right.

### What needs human eyes

- Visual polish judgment (opacity, spacing, "does this look right?")
- Gesture feel (drag smoothness, zoom responsiveness)
- Discoverability (is it obvious how to do X?)

---

## Authoring Workflows (Use Cases)

### W1. Create a new map
1. Launch editor (or click "New Map")
2. Pick orientation, size, label format
3. Get an empty hex grid with @all feature

**Current friction:**
- Title defaults to "New Map" — should be a required field in the New Map dialog
- First col/row interaction with orientation is confusing (deferred per ISSUES.md)

### W2. Define terrain vocabulary
1. Open terrain section in inspector
2. Add terrain types (clear, forest, road, river, etc.)
3. Set colors, path property, modifier vs base

**Design question — terrain presets vs library:**
The current preset approach (Standard Wargame, Blank) is helpful to get started but brittle: too small (missing map-specific types) or too large (extraneous types that need cleanup). A better model might be "pick and customize individual types from a larger library" — but that introduces navigation/search challenges. This is a bigger UX design question; for now, focus on making the add/edit/customize flow smooth enough that starting from a small preset and building up works well.

**Current friction:**
- After adding terrain, user must manually click to edit it (ISSUES.md: auto-enter edit mode)
- Color field shows hex value but isn't directly editable (ISSUES.md: hex field should be editable)
- 'path' property requires editing raw properties (ISSUES.md: should be checkbox)
- Clear terrain color defaults to pure white which is harsh (ISSUES.md: should be off-white)
- Labels/fields in edit mode aren't consistently aligned (ISSUES.md: left-align labels, then fields)
- Road terrain in Standard Wargame palette doesn't have path=true (ISSUES.md)

### W3. Paint terrain onto hexes
1. Click terrain chip in palette to enter paint mode
2. Click hexes to paint
3. Shift-click for connected paths
4. Escape to exit paint mode

**Current friction:**
- Clicking same hex multiple times adds duplicates (ISSUES.md: deduplicate singletons)
- No way to un-paint a hex with modifier-click (ISSUES.md: modifier to remove)
- Path-like terrain shows same as hex fill in palette (ISSUES.md: show as path-in-hex)
- Modifier terrain shows same as base (ISSUES.md: colored badge/dot overlay)

### W4. Edit/fix a feature
1. Select a feature in the stack
2. Inspect its properties
3. Fix its hexpath (remove a wrong hex, change terrain)

**Current friction:**
- Clicking a hex in a feature selects the whole path, not clear which hex you're on (ISSUES.md)
- Editing hexpath in command bar creates a NEW feature instead of updating selected (ISSUES.md)
- 'at' field overflows after a few values, nearly impossible to edit (ISSUES.md)
- Duplicate/Delete buttons look like a single weird label (ISSUES.md: inconsistent UI pattern)
- No way to remove a single hex from a feature (the core use case ISSUES.md calls out)
- Bottom bar shows cube coords (p/q/r) instead of hex labels (ISSUES.md)

### W5. Save and resume
1. Ctrl+S or >save command to save YAML
2. Close browser, reopen, load file
3. Continue editing where you left off

**Current friction:**
- "Export YAML" vs "Export JSON" is confusing — should just be "Save" (ISSUES.md)
- No auto-save or save-on-close warning
- (Name prompt at save time eliminated by requiring name in New Map dialog)

### W6. Navigate the map
1. Pan by dragging
2. Zoom with wheel/trackpad
3. Jump to coordinates via command bar
4. "Home" to reset view

**Current friction:**
- Zoom % in status bar is not clickable (ISSUES.md: standard zoom levels + home button)
- No keyboard shortcuts for zoom preset levels
- Shortcuts overlay has transparent background, hard to read (ISSUES.md)

---

## Prioritized Issue List

### P0: Blocking authoring flow

| # | Issue | Workflow | Fix |
|---|-------|----------|-----|
| 1 | Command bar Enter creates new feature instead of editing selected | W4 | When a feature is selected, Enter in command bar should update that feature's `at`, not create new |
| 2 | No way to remove a single hex from a feature | W4 | Alt-click (or similar modifier) to remove a singleton atom from the selected feature |
| 3 | Clicking same hex during paint adds duplicates | W3 | Deduplicate singletons in paint handler (check if atom already exists) |
| 4 | 'at' field overflows, nearly uneditable | W4 | Make 'at' field expandable/scrollable, or show in command bar on click |
| 5 | Bottom bar shows cube coords, not hex labels | W4 | Convert cursor hexId to hex label using `formatHexLabel` |

### P1: Significant UX friction

| # | Issue | Workflow | Fix |
|---|-------|----------|-----|
| 6 | "Export YAML" should be "Save" | W5 | Rename command, remove JSON export option, add Ctrl+S → save |
| 7 | Map name should be required in New Map dialog | W1 | Make title field required, disable Create until non-empty |
| 8 | Duplicate/Delete looks like a label | W4 | Use standard icon buttons with tooltips, consistent with other action buttons |
| 9 | Add terrain type should auto-enter edit mode | W2 | After dispatch, expand the new terrain type's edit panel |
| 10 | Hex color field should be directly editable | W2 | Add text input next to color chip |
| 11 | 'path' should be a checkbox | W2 | Add checkbox in terrain edit panel for `properties.path` |
| 12 | Shortcuts overlay transparent background | W6 | Add solid/semi-solid backdrop |
| 13 | Modifier-click to remove atom during paint | W3 | Alt-click removes the clicked atom from the feature's hexpath |

### P2: Polish and consistency

| # | Issue | Workflow | Fix |
|---|-------|----------|-----|
| 14 | Clear terrain color should be off-white | W2 | Change default from `#ffffff` to `#f5f0e8` or similar |
| 15 | Path terrain chip should show path-in-hex | W3 | Render TerrainChip differently for path=true terrain |
| 16 | Modifier terrain chip should show badge overlay | W3 | Render dot/badge for modifier terrain types |
| 17 | Zoom % should be clickable with presets | W6 | Dropdown with 50/75/100/150/200% + Home/Fit |
| 18 | Map title in status bar should be editable | W6 | Click to edit inline |
| 19 | Edit fields: labels left-aligned, fields left-aligned | W2 | CSS grid for consistent inspector layout |
| 20 | Road in Standard Wargame palette missing path=true | W2 | Fix palette definition |

---

## Implementation Strategy

### Phase 1: Fix the edit loop (P0 issues 1-5)

These five issues collectively make it painful to author or fix a feature. Fixing them makes the core edit workflow functional.

**Task 1.1: Status bar shows hex label instead of cube coords**
- In `CanvasHost.tsx`: emit hex label (not hexId) from `onCursorHex`
- Or: in `App.tsx`, convert `cursorHex` to label using `Hex.formatHexLabel()`
- Also show edge/vertex notation when hovering those geometries

**Task 1.2: Command bar edits selected feature on Enter**
- In `handleCommandSubmit`: if a feature is selected AND the command bar contains a hexpath (not a `>` command), update the selected feature's `at` instead of creating a new feature
- Show visual indicator that you're editing (e.g., "Editing Feature 3" in command bar placeholder)

**Task 1.3: Deduplicate singletons in paint handler**
- In `handlePaintClick`: before appending a new singleton segment, check if the atom's ID already exists in any segment. If it does, skip (or optionally toggle it off).

**Task 1.4: Alt-click to remove atom from feature**
- In `handlePaintClick`: if Alt key is held, parse the feature's `at`, find and remove the clicked atom from segments, serialize back.
- This is the inverse of paint: unpaint.

**Task 1.5: Expandable 'at' field**
- Make the `at` field in Inspector a multi-line textarea that expands on focus
- Or: clicking the `at` field populates the command bar with the hexpath for editing
- Show atom count below the field

### Phase 2: Map creation & save workflow (P1 issues 6-7)

**Task 2.1: Require map name in New Map dialog**
- Make title field required (non-empty validation)
- Disable Create button until title is entered
- Remove "New Map" default — use empty placeholder text like "Enter map name..."

**Task 2.2: Simplify save**
- Rename "export yaml" command to "save"
- Remove "export json" command (or keep as hidden `>export json`)
- Ctrl+S triggers save (already wired, just needs consistent naming)

### Phase 3: Inspector polish (P1 issues 8-11)

**Task 3.1: Fix Duplicate/Delete button styling**
- Replace text-only buttons with icon+text or icon-only buttons matching the feature stack's `btn-icon` pattern
- Add proper spacing and visual separation

**Task 3.2: Auto-edit mode on terrain add**
- After `setTerrainType` dispatch, set expanded terrain key state to the new key

**Task 3.3: Editable hex color field + path checkbox**
- Add text input alongside ColorPicker for direct hex value entry
- Add checkbox for `properties.path` in terrain edit panel

### Phase 4: Paint UX (P1 issue 13, P2 issues 15-16)

**Task 4.1: Alt-click removal during paint**
- Already covered by Task 1.4

**Task 4.2: Terrain chip rendering for path and modifier types**
- Path terrain: render a line through the hex center instead of fill
- Modifier terrain: render a colored dot/badge in corner of hex

### Phase 5: Navigation and polish (P2 issues 12, 14, 17-20)

Smaller independent improvements, can be done in any order.

---

## Regarding Automated Testing

### State machine audit (new, high priority)

Write a comprehensive test suite for App.tsx state transitions. The editor has ~4 modes that interact:
1. **Idle/selection** — clicking selects geometry or features
2. **Paint mode** — clicking adds/removes atoms from a feature
3. **Command bar active** — typing hexpath expressions or commands
4. **Feature editing** — a feature is selected and its properties are shown in Inspector

Test matrix: for each mode, verify that all user actions (click hex, press Enter, press Escape, Ctrl+Z, switch mode) produce the correct state transition. Key scenarios:
- Enter in command bar with feature selected → updates feature (not creates new)
- Paint click on already-painted hex → no duplicate
- Alt-click in paint mode → removes atom
- Escape from paint mode → returns to idle with feature still selected
- Undo during paint → reverts last paint action

### Integration test scenarios (React Testing Library)

Extend existing tests with workflow-level coverage:
- Paint deduplication: paint same hex twice, verify at string has it once
- Alt-click removal: paint 3 hexes, alt-click middle one, verify removed
- Command bar edit-vs-create: select feature, submit hexpath, verify update not add
- Save/load round-trip: export YAML, re-import, verify identical model state

### Playwright E2E (deferred)

Will be valuable later for visual regression testing but lower priority than getting the state machine right.

---

## Deferred (not in this plan)

- **Terrain type library** — replace preset palettes with a searchable library of terrain types that can be individually picked and customized. Bigger UX design question.
- First col/row interaction with @all and orientation (per ISSUES.md "Defer" section)
- Rectangle shortcut syntax for @all
- Vertex shortest path
- Build pipeline tooling (jscpd, knip, biome)
- Auto-save / save-on-close warning
- Keyboard accessibility for terrain palette
- Playwright E2E scenario tests
