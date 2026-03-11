# Authoring UX Workshop

**Date:** 2026-03-10
**Purpose:** Design the full authoring loop — how adding, modifying, filtering, and editing features should work across the Command Bar, Canvas, and Inspector.

---

## The Core Mental Model

The architecture already embodies the right principle: **features are the source of truth, hexes are computed views.** The authoring flow should reinforce this at every interaction point. The user thinks "I want to put a forest at 0304–0306" — not "I want to edit hex 0305's terrain."

The three surfaces map to three distinct roles:

| Surface | Role | Analogy |
|---------|------|---------|
| **Command Bar** | Address & create — name a location, invoke an action | URL bar / terminal |
| **Canvas** | Point & discover — see what's there, click to select | Map / viewport |
| **Inspector** | Read & edit properties — modify the selected thing | Property sheet |

**The Command Bar addresses, the Canvas selects, the Inspector edits.** They shouldn't duplicate each other's jobs.

---

## Authoring Flow: Adding a Feature

Three paths to the same result. The command bar is fastest for users who know HexPath syntax. The canvas is most intuitive for spatial thinking. The stack is best for organizational work.

### Path A: Keyboard-first (expert)

```
1. Cmd+K (or just start typing in hybrid mode)
2. Type: 0304-0306          → ghost preview shows 3 hexes highlighted
3. Enter                     → new feature created, selected in stack
4. Inspector auto-focuses    → terrain dropdown shows "clear" (default)
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
4. Want to extend it? Edit the `at` field in Inspector:
   type "0304-0306" or Shift+click 0305, 0306 on canvas to extend
5. Set terrain to "forest" in dropdown
6. Done
```

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
4. Edit `at` field: append ",0103/E" to existing path
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

```
/terrain:forest       → Stack filters to forest features only
/at:0304              → Stack filters to features touching 0304
/label:river          → Stack filters by label substring
/tags:defensive       → Stack filters by tag
/forest               → fuzzy match across all fields (no prefix needed)
```

### Visual behavior when filtering

- Feature Stack shows only matching features, with count: "4 of 23 features"
- Canvas **dims** non-matching features (reduce opacity to ~20%) rather than hiding — spatial context matters
- Inspector shows nothing special until you select a filtered result
- Escape or clearing the search bar restores full view

The stack becomes a **live-filtered view**, not a separate results panel. You're narrowing your lens, not switching contexts.

---

## Command Bar: Modal Architecture

Four modes, auto-detected by prefix:

| Prefix | Mode | Badge | Behavior |
|--------|------|-------|----------|
| *(none)* | PATH | `PATH` | HexPath expression → ghost preview → Enter creates |
| `>` | COMMAND | `CMD` | Autocomplete command list → Enter executes |
| `/` | SEARCH | `FIND` | Live filter stack + dim canvas → Escape clears |
| `@` | GOTO | `GOTO` | Jump to feature by id/label → Enter selects + centers |

### Adding `@` for GOTO

Distinct from search because the intent is **navigation**, not filtering. `@river` jumps the viewport to center on the river feature and selects it. Search leaves the viewport alone and filters the list.

### Command list (initial)

| Command | Action |
|---------|--------|
| `>zoom fit` | Fit map to viewport (already exists) |
| `>export yaml` / `>export json` | Download file |
| `>delete` | Delete selected feature(s) |
| `>duplicate` | Duplicate selected feature(s) |
| `>undo` / `>redo` | Undo/redo |
| `>new` | Create empty feature |
| `>clear` | Clear command bar (already exists) |

Most of these are better as keyboard shortcuts than typed commands. The command bar's killer use case is **HexPath entry, search, and goto** — those are genuinely text-shaped tasks. Terrain changes and delete/duplicate are better as Inspector buttons + keyboard shortcuts.

---

## Inspector Design: The Editing Surface

### When a Feature is selected (editable)

```
┌─────────────────────────┐
│ ▸ Feature: River        │  ← feature name as header
├─────────────────────────┤
│ terrain   [▾ river    ] │  ← dropdown from terrain vocabulary
│ at        [0102/E,0103… │  ← text input, HexPath syntax
│ label     [Elbe River ] │  ← text input
│ id        [elbe       ] │  ← text input (auto-generated if blank)
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

- **`at` field gets live preview** — as you edit the HexPath, the canvas shows ghost geometry, same as command bar. The Inspector's `at` field *is* a mini command bar for that feature's geometry.
- **Terrain dropdown** populated from the map's terrain vocabulary. Selecting a terrain auto-fills the color. Typing a terrain that doesn't exist offers to create it.
- **Tab order** matters: terrain → at → label → id → elevation → tags. Most common edits first.
- **Each field change is an atomic edit** for undo purposes (on blur or Enter, not per-keystroke).

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

## Keyboard Focus: The Hybrid Model

**Rule: Unmodified printable keys → Command Bar. Everything else → Canvas/global.**

```
Typing "0304"      → auto-focuses command bar, enters PATH mode
Typing "/forest"   → auto-focuses command bar, enters SEARCH mode
Typing ">export"   → auto-focuses command bar, enters CMD mode
Arrow keys         → canvas navigation (move selection to neighbor)
Delete             → delete selected feature (global shortcut)
Escape             → clear command bar if focused, else clear selection
Tab                → cycle focus: Stack → Canvas → Inspector
```

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
          │           │                 │ (PATH/SEARCH/CMD)│
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

## Implementation Phasing

### Phase 6A — Inspector Editing (the critical unlock)

The minimum to close the authoring loop.

1. **Feature form in Inspector** — terrain dropdown, at, label, id, elevation, tags
2. **Live `at` preview** — reuse HexPath preview logic from command bar
3. **Mutation path** — Inspector edit → update HexMapDocument → re-serialize → `MapModel.load()`
4. **`[+ Add Feature Here]`** button in hex Inspector view
5. **Delete** — button in Inspector + `Delete` key shortcut
6. **Undo/redo** — YAML snapshot stack (simple, good enough for MVP)

### Phase 6B — Search & Filter

1. `/` search mode — filter stack + dim non-matching features on canvas
2. Fuzzy match across terrain, label, id, tags
3. `@` goto mode — select + center viewport on feature

### Phase 6C — Keyboard Flow

1. Hybrid focus model (printable → command bar, nav → canvas)
2. `Tab` to cycle focus zones
3. `Cmd+D` duplicate, `Cmd+Z`/`Cmd+Shift+Z` undo/redo wired

### Phase 6D — Export & Dirty State

1. `>export yaml` / `>export json` commands
2. Dirty indicator in status bar
3. `Cmd+S` to download

---

## Open Questions

1. **Shift+click to extend `at` on canvas** — when a feature is selected and you Shift+click another hex, should it append to the feature's `at` field? This is powerful but potentially surprising. Alternative: a dedicated "extend" mode toggled by holding a modifier.

2. **Terrain vocabulary management** — when a user types a terrain that isn't in the vocabulary, do we auto-create it (with a random color)? Show a "create terrain" mini-form? Reject it?

3. **Multi-feature Inspector** — when multiple features are selected, should the Inspector show a batch-edit form (shared fields editable, differing fields show "mixed")? Or just show a summary list?

4. **`at` field vs command bar** — the Inspector's `at` field and the command bar both accept HexPath and both show live preview. Should editing `at` in the Inspector literally move focus to the command bar (keeping one HexPath entry point)? Or are two independent HexPath inputs OK?

5. **Undo granularity** — YAML snapshot stack means undo reverts one "operation." What counts as an operation? Proposal: each Inspector field blur/Enter, each command bar Enter, each delete/duplicate. Drag-to-reorder is one operation per drop.

6. **Feature creation defaults** — when Enter creates a feature from HexPath, it currently gets `terrain: 'clear'` and `label: 'New Feature'`. Should it inherit the terrain of the hex it's placed on? Should it prompt for terrain immediately?
