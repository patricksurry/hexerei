# Hexerei Editor: UX & IA Design

**Date:** 2026-03-07
**Approach:** Shell First — validate layout, IA, and visual identity before wiring real data and interaction.

## Information Architecture

Three-column layout with persistent command bar and status bar.

```
┌─────────────────────────────────────────────────────────┐
│  ⌘  Omni-Path Command Bar                    [≡] [?]   │
├────────────┬──────────────────────────┬──────────────────┤
│            │                          │                  │
│  Feature   │                          │   Inspector      │
│  Stack     │       Canvas             │                  │
│  (~240px)  │       (flex)             │   (~280px)       │
│            │                          │                  │
├────────────┴──────────────────────────┴──────────────────┤
│  Status Bar: cursor coords │ zoom │ map title │ dirty   │
└─────────────────────────────────────────────────────────┘
```

**Feature Stack (left):** Ordered feature list mirroring the `features` array. Each row: drag handle, terrain color chip, id/terrain label, truncated `at` in monospace. Hover previews geometry on canvas. `@all` base feature pinned at bottom with distinct styling.

**Canvas (center):** Hex map renderer. Pan (drag) and zoom (scroll). Schematic style initially — outlines, terrain fills, coordinate labels. No textures or gradients.

**Inspector (right):** Context-sensitive properties panel.

| Selection | Shows |
|-----------|-------|
| Nothing | Map metadata, layout summary, terrain vocabulary |
| Feature (from stack) | Editable attributes: `at`, `terrain`, `elevation`, `label`, `id`, `tags`, `properties` |
| Hex (from canvas) | Read-only computed state: coordinate, effective terrain, elevation, contributing features |
| Edge / Vertex | Same pattern as hex |

Canvas hex/edge/vertex views are read-only and computed. Editing happens through features. This reinforces "features are the source of truth."

**Command Bar (top):** Three modes by prefix.

| Input | Mode | Behavior |
|-------|------|----------|
| HexPath text | Path | Parse + ghost preview on canvas |
| `>` prefix | Command | Filter command list (export, zoom fit, etc.) |
| `/` prefix | Search | Search features by id, label, terrain, tags |

**Status Bar (bottom):** Cursor hex coordinate, zoom level, map title, dirty/saved indicator.

## Visual Identity: Tactical Blueprint

Dark mode base with geometry-typed accent colors.

### Color Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `bg-base` | `#141414` | App background, panels |
| `bg-surface` | `#1C1C1C` | Cards, panel sections, command bar |
| `bg-elevated` | `#242424` | Hover states, active items |
| `border-subtle` | `#2A2A2A` | Panel dividers |
| `border-focus` | `#3A3A3A` | Input borders, focus rings |
| `text-primary` | `#E8E8E8` | Primary labels |
| `text-secondary` | `#888888` | Secondary info |
| `text-muted` | `#555555` | Disabled, placeholders |
| `accent-hex` | `#00D4FF` | Hex selection, hex UI |
| `accent-edge` | `#FF3DFF` | Edge selection, edge UI |
| `accent-vertex` | `#FFD600` | Vertex selection, vertex UI |
| `accent-command` | `#00D4FF` | Command bar focus |

Accent colors do double duty: distinguish geometry types in both panel UI and canvas rendering.

### Typography

- `JetBrains Mono`: HexPath strings, coordinates, code-like content
- System sans-serif (`-apple-system`, `Inter`): UI labels, panel headings, metadata

### Canvas (schematic phase)

- Hex outlines: `#2A2A2A`
- Terrain fills: single muted color per type (from `style.color` or auto-assigned)
- Labels: hex coordinates in `text-muted`, small monospace
- Selection: accent-colored outline glow + fill tint

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+K` | Focus command bar |
| `Cmd+1` | Toggle Feature Stack |
| `Cmd+2` | Toggle Inspector |
| `Cmd+0` | Zoom to fit |
| `Delete` | Delete selected feature(s) |
| `Cmd+D` | Duplicate selected feature |
| `Cmd+Z` / `Cmd+Shift+Z` | Undo / Redo |
| Arrow keys (canvas) | Nudge selection to adjacent hex |
| `Tab` | Cycle focus: Stack / Canvas / Inspector |
| `Escape` | Clear command bar, deselect |

## Phased Implementation

Each phase validates a specific UX/IA hypothesis before investing in the next layer.

### Phase 1 — App Shell & Visual Identity

**Goal:** Validate layout, panel hierarchy, and visual tone with static data.

Build:
- Vite + React scaffold, CSS custom properties for full token system
- Three-column resizable layout
- Command bar (renders, accepts focus, no parsing)
- Status bar with static placeholder values
- Feature Stack with ~10 hardcoded fake feature rows (drag handle, color chip, label, monospace `at`)
- Inspector with static fake feature attributes
- Panel collapse/expand (`Cmd+1`, `Cmd+2`)
- Canvas area as styled placeholder
- JetBrains Mono, typography scale

**Validates:** Layout proportions at different viewports. Panel hierarchy legibility. Dark theme / accent system. Command bar discoverability.

### Phase 2 — Canvas: Load & Render

**Goal:** Prove the data pipeline from `.hexmap` through `core` to pixels.

Build:
- Wire `@hexerei/core` — load and parse `.hexmap` (Battle for Moscow first)
- Canvas 2D renderer: hex outlines, terrain fills, coordinate labels
- Pan (drag) and zoom (scroll wheel)
- Status bar shows cursor hex coordinate (pixel → hex conversion)
- Feature Stack populated from real `features` array (read-only)
- Inspector shows map metadata when nothing selected

**Validates:** Core library provides what the renderer needs. Layout holds up with a real map. Schematic rendering legibility.

### Phase 3 — Selection & Inspection

**Goal:** Validate the first interactive feedback loop.

Build:
- Click hex → `accent-hex` highlight, Inspector shows computed hex state
- Click edge → `accent-edge` highlight, Inspector shows edge attributes
- Click feature row → highlight geometry on canvas, Inspector shows feature attributes
- Hover feature row → lighter preview highlight
- Multi-select in stack (`Shift+click`, `Cmd+click`)
- Canvas ↔ stack linking: clicking a hex highlights the topmost affecting feature
- Arrow keys nudge canvas selection

**Validates:** Stack/canvas/inspector triangle is intuitive. Accent colors distinguish geometry types. Computed hex view is useful vs. wanting direct editing.

**Architecture notes (from Phase 2):** Phase 2 establishes a three-layer architecture that Phase 3 builds on directly:

- **`editor/src/model/`** — headless, testable, no React. Contains `MapModel` (document access), `Viewport` (camera transform), `hitTest` (screen → hex), and `buildScene` (model + viewport → render list).
- **`editor/src/canvas/`** — thin UX layer. `drawScene` paints a `Scene` object onto Canvas 2D; `CanvasHost` is the only React component, forwarding DOM events to pure viewport functions.

For Phase 3, selection and highlighting flow through the same pipeline:
- Canvas click → `hexAtScreen()` → selection state update → scene rebuild with highlight items
- Feature Stack click → model query → scene rebuild with feature geometry highlighted
- Inspector reads from `MapModel` by hex ID or feature index
- All selection logic stays in the headless model layer; the canvas just draws what `Scene` contains
- The `Scene` type extends to include `highlights: { corners, color }[]` for selection rendering

### Phase 4 — HexPath Entry & Live Preview

**Goal:** Validate the "Spatial IDE" premise.

Build:
- Command bar parses HexPath in real-time via core library
- Ghost geometry on canvas (dashed accent outlines)
- Syntax highlighting: coordinates, directions, operators
- Inline parse errors (red underline + tooltip)
- `Enter` creates new feature from current HexPath
- Auto-generation: select hexes on canvas → command bar shows HexPath
- Command mode (`>` prefix): `>zoom fit`, `>export json`, `>toggle stack`

**Validates:** Live preview is useful, not distracting. Users build DSL mental models through visual feedback. Auto-generation accuracy. Command bar as the right home for HexPath entry.

### Phase 5 — Feature Authoring & Stack Manipulation

**Goal:** Close the read-write loop.

Build:
- Edit feature attributes in Inspector (terrain dropdown, elevation, label, id, tags, properties)
- Drag-to-reorder features, canvas re-renders with new precedence
- Create new features (command bar or `+` button)
- Delete (`Delete` key, context menu), duplicate (`Cmd+D`)
- Undo/redo (`Cmd+Z` / `Cmd+Shift+Z`)
- Export to `.hexmap` JSON/YAML
- Dirty indicator in status bar

**Validates:** "Features as source of truth" feels natural for authoring. Drag-to-reorder for precedence management. Undo/redo granularity.

### Phase Summary

| Phase | Delivers | Key Question |
|-------|----------|--------------|
| 1 — Shell | Layout, panels, visual identity | Does the IA and aesthetic work? |
| 2 — Render | Real map on canvas | Does the data pipeline work? |
| 3 — Select | Click → highlight → inspect | Is the stack/canvas/inspector intuitive? |
| 4 — HexPath | Type → preview → create | Is the DSL learnable via visual feedback? |
| 5 — Author | Full read-write loop | Can you actually make maps with this? |

## Open Design Questions

### Keyboard focus: auto-capture vs explicit focus

Currently the command bar requires a click or `Cmd+K` to focus before accepting text input. Should bare keystrokes auto-focus it instead? Three options:

| Approach | Feel | Trade-off |
|----------|------|-----------|
| **Always capture printable keys → command bar** | VS Code file finder — just start typing | Canvas can only use modified shortcuts (`Cmd+arrows`); no single-letter hotkeys |
| **Focus follows context** (current) | Click canvas → canvas has focus; `Cmd+K` → command bar | Explicit, but requires deliberate action to start typing a HexPath |
| **Hybrid: printable chars → command bar, nav keys → canvas** | Spreadsheet-like — type a letter and you're editing, arrows navigate | Natural for path entry, but slightly magic; harder to explain |

The hybrid approach fits the "Spatial IDE" metaphor well: the command bar is the editor, the canvas is the viewport. Needs to be resolved before Phase 3 (canvas arrow-key navigation) and Phase 4 (HexPath live entry).

## Technology

- **Framework:** React (panels/chrome) + Canvas 2D (map rendering)
- **Build:** Vite
- **Core library:** `@hexerei/core` (hex math, HexPath parser, document model)
- **Styling:** CSS custom properties, no CSS framework
- **Font:** JetBrains Mono (loaded via fontsource or CDN)
