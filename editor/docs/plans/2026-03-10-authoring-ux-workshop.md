# Authoring UX Workshop

**Date:** 2026-03-10  
**Updated:** 2026-03-14  
**Purpose:** Design the full authoring loop — how adding, modifying, filtering, and editing features should work across the Command Bar, Canvas, and Inspector.

**Prerequisites:**
- [API Surface Design](2026-03-12-api-surface-design.md) — all mutations flow through `MapCommand` / `CommandHistory`
- [Visual Identity: Sand Table](2026-03-11-visual-identity-sandtable.md) — new UI components must be themable and consistent with the sand table aesthetic

---

## The Core Mental Model

The architecture already embodies the right principle: **features are the source of truth, hexes are computed views.** The authoring flow should reinforce this at every interaction point. The user thinks "I want to put a forest at 0304–0306" — not "I want to edit hex 0305's terrain."

The three surfaces map to three distinct roles:

| Surface | Role | Analogy |
|---------|------|---------|
| **Command Bar** | Address & create — name a location, invoke an action | URL bar / terminal |
| **Canvas** | Point & discover — see what's there, click to select | Map / viewport |
| **Inspector** | Read & edit properties — modify the selected thing | Property sheet |

### Canvas Brushing

The canvas should support **brushing** — highlighting hex/edge/vertex under the cursor to preview what would be selected on click. This uses the `SceneHighlight` and `HitResult` types from `@hexmap/canvas` (see [API §3](2026-03-12-api-surface-design.md#section-3-the-hexmapcanvas-package)). The hover highlight uses a subtle glow treatment per the [visual identity](2026-03-11-visual-identity-sandtable.md#interaction-glow-effects-canvas).

**The Command Bar addresses, the Canvas selects, the Inspector edits.** They shouldn't duplicate each other's jobs.

---

## Authoring Flow: Adding a Feature

Three paths to the same result. The command bar is fastest for users who know HexPath syntax. The canvas is most intuitive for spatial thinking. The stack is best for organizational work.

### Path A: Keyboard-first (expert)

```
1. Cmd+K (or just start typing in hybrid mode)
2. Type: 0304-0306          → ghost preview shows 3 hexes highlighted
3. Enter                     → new feature created, selected in stack
4. Inspector auto-focuses    → terrain dropdown shows (none)
5. Type "forest" or arrow    → terrain updates, canvas re-renders
   to select from dropdown
6. Tab to label field        → type "Trenice Forest"
7. Done — feature is live
```

### Path B: Canvas-first (visual)

```
1. Click hex 0304 on canvas  → hex selected, Inspector shows computed state
2. Inspector shows contributing features (or "No features here")
3. Click [+ Add Feature Here] in Inspector (or Cmd+N)
   → new feature created at "0304", selected
4. Want to extend it?
   - Shift+click to connect: appends "-0306" to `at` (contiguous range)
   - Cmd+click to jump: appends ",0306" to `at` (disjoint addition)
5. Set terrain to "forest" in dropdown
6. Done
```

Two click modifiers for extending a selected feature's geometry:
- **Shift+click** — connects (HexPath `-` separator, implies contiguous range)
- **Cmd+click** — jumps (HexPath `,` separator, disjoint addition)

### Path C: Stack-first (organizational)

```
1. Click [+] in Feature Stack header
   → new empty feature appended, selected
2. Inspector shows blank feature form
3. Set `at` via typing HexPath in Inspector field,
   OR Cmd+K to switch to command bar for path entry
4. Set terrain, label, etc.
5. Done
```

---

## Authoring Flow: Modifying a Feature

### Via Canvas

```
1. Click the edge on canvas    → edge highlights, Inspector shows boundary info
2. Inspector shows "Contributing features: River (click)"
3. Click "River"               → feature selected, Inspector shows editable form
4. Edit `at` field: append ",0103/E" to existing path, or click to add new edge(s)
5. Canvas updates live as you type (ghost preview of new extent)
```

### Via Stack

```
1. Click "River" in feature stack → selected, Inspector shows form
2. Edit `at` field directly
```

### Via Command Bar

```
1. /river (search) to find and select it
2. Edit in Inspector
```

The command bar is less natural for *modifying* — it's best for addressing and creating. **The Inspector is the primary editing surface.**

---

## Authoring Flow: Filtering Features

This is where Search mode (`/` prefix) earns its keep.

### Search interaction

When the user types `/`, the command bar enters SEARCH mode and offers a **dropdown of searchable keys** (terrain, at, label, id, tags) so users can quickly narrow their search:

```
/                         → dropdown shows: terrain, at, label, id, tags
/terrain:                 → autocomplete terrain values from vocabulary
/terrain:forest           → Stack filters to forest features only
/at:0304                  → Stack filters to features touching 0304
/label:river              → Stack filters by label substring
/tags:defensive           → Stack filters by tag
/forest                   → fuzzy match across all fields (no prefix needed)
```

The key dropdown avoids the awkwardness of fuzzy-matching on partial key names — typing `/` then arrowing to `terrain` then `:` then the value is fluid and discoverable.

### Visual behavior when filtering

- Feature Stack shows only matching features, with count: "4 of 23 features"
- Canvas **dims** non-matching features (reduce opacity to ~20%) rather than hiding — spatial context matters
- Inspector shows nothing special until you select a filtered result
- Escape or clearing the search bar restores full view

The stack becomes a **live-filtered view**, not a separate results panel. You're narrowing your lens, not switching contexts.

No separate "clear all / select all" button needed — Escape clears the filter and the stack always shows the match count. If multi-select becomes important later, we can revisit.

---

## Command Bar: Modal Architecture

Three modes, auto-detected by prefix:

| Prefix | Mode | Badge | Behavior |
|--------|------|-------|----------|
| *(none)* | PATH | `PATH` | HexPath expression → ghost preview → Enter creates |
| `/` | SEARCH | `FIND` | Key dropdown → live filter stack + dim canvas → Escape clears |
| `@` | GOTO | `GOTO` | Select existing feature/hex by id/label → Enter selects + centers |

### PATH vs GOTO: Create vs Select

PATH mode and GOTO mode both accept HexPath expressions, but with different intent:
- **PATH** (no prefix): the expression defines geometry for a **new feature**. Enter creates.
- **GOTO** (`@` prefix): the expression **navigates to existing** geometry. Enter selects and centers the viewport.

This means `@river` selects the existing "river" feature (a named HexPath reference), while typing `river` in PATH mode would try to create a new feature at the hex(es) named "river." The distinction is creating vs. selecting — same addressing language, different verbs.

### Deferred: `>` Command Mode

The `>` command prefix (for typed commands like `>export yaml`, `>delete`, etc.) is **deferred**. The current command list isn't compelling enough to justify a separate mode.

However, the underlying `MapCommand` type from the [API surface design §4](2026-03-12-api-surface-design.md#section-4-command-based-mutation-layer) is the right foundation for a future scriptable command bar. All mutations already flow through `executeCommand()` — when we eventually expose `>` mode, it should dispatch `MapCommand` values directly, keeping the UX thin and all business logic in the command layer. This also keeps us honest about the UX being a skin over a fully scriptable API.

---

## Inspector Design: The Editing Surface

### When a Feature is selected (editable)

```
┌─────────────────────────┐
│ ▸ Feature: River        │  ← feature name as header
├─────────────────────────┤
│ label     [Elbe River ] │  ← text input
│ id        [elbe_river ] │  ← auto-generated from label (see below)
│ at        [0102/E,0103… │  ← text input, HexPath syntax
│ terrain   [▾ river    ] │  ← dropdown from terrain vocabulary
│ elevation [          0] │  ← number input
│ tags      [waterway   ] │  ← tag chips with add button
│                         │
│ ┌─ Properties ────────┐ │
│ │ navigable: true     │ │  ← key-value editor
│ │ + add property      │ │
│ └─────────────────────┘ │
├─────────────────────────┤
│ [Duplicate] [Delete]    │  ← action buttons
└─────────────────────────┘
```

Key interaction details:

- **`at` field gets live preview** — as you edit the HexPath, the canvas shows ghost geometry, same as command bar. The Inspector's `at` field *is* a mini command bar for that feature's geometry. The `at` text is **synced** between the Inspector field and the command bar: editing in either location updates both, but focus stays wherever you started typing (so tabbing through Inspector fields remains fluid).
- **Terrain dropdown** populated from the map's terrain vocabulary. Selecting a terrain auto-fills the color. Typing a terrain that doesn't exist offers to create it.
- **Tab order** matters: terrain → at → label → id → elevation → tags. Most common edits first.
- **Each field change is an atomic `MapCommand`** dispatched through `CommandHistory` (on blur or Enter, not per-keystroke). This gives us undo/redo for free — see [API §4](2026-03-12-api-surface-design.md#section-4-command-based-mutation-layer).

### Feature ID auto-generation

The `id` field defaults to a **HexPath-friendly transform of the label** (e.g., "Elbe River" → `elbe_river`). If no label is set, defaults to a terrain-plus-number scheme (e.g., `river3`).

The `id` **auto-updates when the label changes**, unless the user has directly edited the `id` field (at which point it becomes "pinned"). When an `id` changes, any references to that id in other features' `at` expressions must be kept in sync — this is an `updateFeature` command that cascades through the document.

> **API gap:** The `MapCommand.updateFeature` type supports partial updates but doesn't include cascade logic for ID renames. This needs to be handled either as a compound command or as built-in behavior of the executor when `changes.id` is present.

### When a Hex is selected (read-only, with escape hatches)

```
┌─────────────────────────┐
│ Hex 0304                │
├─────────────────────────┤
│ Effective terrain: forest│
│ Elevation: 0            │
│                         │
│ Contributing features:  │
│  ▸ Trenice Forest       │  ← click to select feature (now editable)
│  ▸ Base Terrain         │  ← click to select feature (now editable)
│                         │
│ Neighbors:              │
│  NE: 0305  E: 0404 ... │  ← clickable for navigation
├─────────────────────────┤
│ [+ Add Feature Here]    │  ← creates feature at this hex
└─────────────────────────┘
```

**The "escape hatch" pattern:** you can't edit a hex directly, but every read-only view offers a one-click path to the editable feature behind it. "Why is this forest? → click → now you can change it."

---

## Left Panel: Lists & Navigation

The left panel hosts **list views** for the main document sections. The Inspector (right panel) shows the detail/edit view for whichever item is selected.

| Panel | Content | Inspector shows |
|-------|---------|-----------------|
| **Feature Stack** | All features (filterable) | Feature edit form |
| **Terrain Types** | Hex/edge/vertex terrain vocabulary | Terrain type editor (name, style, properties) |
| **Map Info** | Singleton — metadata + layout | Metadata/layout fields |

The Feature Stack is the default and most-used panel. Terrain Types and Map Info are collapsible or tab-accessible. This makes the `@all` property from `HexMapLayout` accessible for editing — it's where you set global defaults (default terrain, etc.).

> **API gap:** The `MapCommand` type currently covers `setMetadata` but not `setLayout` or terrain vocabulary mutations. These need to be added:
> ```typescript
> | { type: 'setLayout'; key: keyof HexMapLayout; value: unknown }
> | { type: 'addTerrainType'; geometry: 'hex' | 'edge' | 'vertex'; key: string; def: TerrainTypeDef }
> | { type: 'updateTerrainType'; geometry: 'hex' | 'edge' | 'vertex'; key: string; changes: Partial<TerrainTypeDef> }
> | { type: 'deleteTerrainType'; geometry: 'hex' | 'edge' | 'vertex'; key: string }
> ```

---

## Keyboard Focus: The Hybrid Model

**Rule: Unmodified printable keys → Command Bar. Everything else → Canvas/global.**

```
Typing "0304"      → auto-focuses command bar, enters PATH mode
Typing "/forest"   → auto-focuses command bar, enters SEARCH mode
Arrow keys         → canvas navigation (move selection to neighbor)
Delete             → delete selected feature (global shortcut)
Escape             → clear command bar if focused, else clear selection
Tab                → cycle focus: Stack → Canvas → Inspector
```

### Arrow key mapping for hex navigation

For flat-top orientation, hex neighbors don't align to a 4-direction grid. Proposed mapping:

| Keys | Direction |
|------|-----------|
| ← → | W, E (horizontal neighbors) |
| ↑ ↓ | NE, SW (diagonal — "up-right" / "down-left") |
| Shift+↑ Shift+↓ | NW, SE (the other diagonal) |

This uses `Hex.directionName()` / `Hex.directionIndex()` from [API §2b](2026-03-12-api-surface-design.md#2b-direction-codec) — semantic direction names rather than raw indices.

> Open question: is there a more intuitive mapping? The above is consistent but requires learning that ↑ means NE, not N. Alternative: ↑/↓ could mean "next/prev row" in label order rather than geometric neighbors.

### Why this works

HexPath is the expert's primary input. Auto-focusing on printable chars means the expert never has to reach for Cmd+K — they just start typing coordinates. But arrow keys, Delete, Escape stay "spatial" and control the canvas/selection.

### The edge case

When the Inspector has focus (editing a text field), printable keys go to *that field*, not the command bar. This is natural — you clicked into a form field, you're editing it. Escape or clicking elsewhere returns to the hybrid default.

---

## Interaction State Machine

```
                    ┌──────────┐
          ┌────────►│  BROWSE  │◄──── Escape (from any state)
          │         └────┬─────┘
          │              │
          │   click hex  │  click feature    start typing
          │   on canvas  │  in stack         printable key
          │              ▼                        │
          │    ┌──────────────┐                   ▼
          │    │ HEX SELECTED │         ┌──────────────────┐
          │    └──────┬───────┘         │ COMMAND BAR      │
          │           │                 │ (PATH / SEARCH)  │
          │    click contributing       └────────┬─────────┘
          │    feature in Inspector              │
          │           │                    Enter (PATH mode)
          │           ▼                          │
          │  ┌─────────────────┐                 │
          └──│ FEATURE SELECTED│◄────────────────┘
             │ (Inspector editable)
             └─────────────────┘
```

The feature-selected state is the **editing state**. Everything flows toward selecting a feature, because that's where mutation happens.

---

## Feature Creation Defaults

When Enter creates a feature from HexPath:
- **No terrain** (field empty — the hex falls through to the `@all` default or is computed from other features)
- **No label** (field empty)
- **Auto-generated id** — based on the hex path or a sequential number (e.g., `feature_1`)
- The Inspector auto-focuses so the user can immediately set terrain, label, etc.

The `@all` property from `HexMapLayout` is where global defaults live. It should be editable via the Map Info panel (see [Left Panel](#left-panel-lists--navigation) above), so users can set "every hex defaults to grassland" and then features override specific hexes.

---

## Implementation Phasing

All mutations flow through `MapCommand` / `CommandHistory` from the [API surface design](2026-03-12-api-surface-design.md). The UX layer dispatches commands and subscribes to state updates — it never manipulates the document directly.

### Phase 6A — Inspector Editing (the critical unlock)

The minimum to close the authoring loop.

1. **Feature form in Inspector** — terrain dropdown, at, label, id (auto-generated), elevation, tags
2. **Live `at` preview** — reuse HexPath preview logic from command bar
3. **Mutation path** — Inspector edits dispatch `updateFeature` / `addFeature` / `deleteFeature` commands through `CommandHistory`
4. **`[+ Add Feature Here]`** button in hex Inspector view
5. **Delete** — button in Inspector + `Delete` key shortcut
6. **Undo/redo** — via `CommandHistory.undo()` / `CommandHistory.redo()` (no UX-specific undo stack)

### Phase 6B — Search & Filter

1. `/` search mode — key dropdown, filter stack + dim non-matching features on canvas
2. Fuzzy match across terrain, label, id, tags
3. `@` goto mode — select + center viewport on feature

### Phase 6C — Keyboard Flow

1. Hybrid focus model (printable → command bar, nav → canvas)
2. `Tab` to cycle focus zones
3. `Cmd+D` duplicate, `Cmd+Z`/`Cmd+Shift+Z` undo/redo wired to `CommandHistory`

### Phase 6D — Left Panel & Document Editing

1. Terrain Types panel — add/edit/delete terrain definitions
2. Map Info panel — metadata and layout editing (including `@all`)
3. Additional `MapCommand` types for layout and terrain vocabulary mutations

### Phase 6E — Export & Dirty State

1. Export yaml / json (via command bar or menu)
2. Dirty indicator in status bar — from `CommandHistory.isDirty`
3. `Cmd+S` to download

---

## API Alignment Notes

Items that need attention in the [API surface design](2026-03-12-api-surface-design.md) based on this workshop:

1. **ID rename cascading** — `updateFeature` with `changes.id` needs to cascade through all `at` expressions referencing the old id. Either compound command or executor-level logic.

2. **Missing command types** — Need `setLayout`, `addTerrainType`, `updateTerrainType`, `deleteTerrainType` commands for the left panel editing workflows (Phase 6D).

3. **Feature creation defaults** — `addFeature` should accept a feature with only `at` populated (no terrain, no label). The `Feature` type already supports this (all fields except `at` are optional), so this is just a UX convention, not an API change.

4. **`@all` layout exposure** — `HexMapLayout.all` is already in the API types. The UX needs to surface it in the Map Info panel and show how it interacts with feature terrain overrides.

---

## Resolved Questions

*Previously open questions, now resolved based on review feedback.*

1. **Shift+click to extend `at` on canvas** — Yes. Two modifiers: **Shift+click connects** (HexPath `-`), **Cmd+click jumps** (HexPath `,`). The `~` key toggles the last segment between `-` and `~` (fill operator). See [Path B](#path-b-canvas-first-visual).

2. **Terrain vocabulary management** — Terrain types get their own collapsible panel in the left sidebar, not inline creation in the dropdown. The dropdown can still offer "create new..." as a convenience that opens the Terrain Types panel. See [Left Panel](#left-panel-lists--navigation).

3. **Multi-feature Inspector** — Deferred. MVP supports multi-select for delete only. Inspector greys out when multiple features are selected.

4. **`at` field vs command bar** — Text is synced between both, but focus stays wherever you started typing. This preserves Inspector tab-flow while keeping a single source of truth for the HexPath expression.

5. **Undo granularity** — Aligned with `CommandHistory` from the API. Each `MapCommand` is one undo step. No UX-specific undo stack.

6. **Feature creation defaults** — No terrain, no label, just an auto-generated id. The `@all` layout property provides global defaults. See [Feature Creation Defaults](#feature-creation-defaults).

## Open Questions

1. **Arrow key mapping for hex navigation** — The proposed Shift+arrow for the second diagonal axis works but may not be discoverable. Need to test with users. See [Keyboard Focus](#arrow-key-mapping-for-hex-navigation).

2. **`at` sync mechanics** — Syncing HexPath text between Inspector `at` field and command bar raises questions about conflict (what if both are being edited simultaneously?) and about which one "owns" the state. Likely answer: the `at` field on the feature model is the source of truth; both UI surfaces bind to it.

3. **`>` command mode revival** — When we eventually add this, should it expose raw `MapCommand` JSON for power users / scripting, or should it have a friendlier DSL? The API's `MapCommand` type is the right foundation either way.
