# Search, Filter & Keyboard Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement Phase 6B (Search & Filter) and Phase 6C (Keyboard Flow) from the [Authoring UX Workshop](2026-03-10-authoring-ux-workshop.md). Users can search/filter features via the command bar, navigate to features with `@` GOTO mode, and use the full keyboard-driven workflow (hybrid focus, Tab cycling, shortcuts).

**Architecture:** All mutations flow through `MapCommand` → `executeCommand()` → `CommandHistory`. The filter state is UI-only — no commands needed. The keyboard focus model is a global concern wired through `useKeyboardShortcuts` and a new `useFocusZones` hook.

**Tech Stack:** TypeScript, Vitest, React 18, `@hexmap/core`, `@hexmap/canvas`

**Design docs:**
- [Authoring UX Workshop](2026-03-10-authoring-ux-workshop.md) — Phases 6B and 6C
- [API Surface Design](2026-03-12-api-surface-design.md)
- [Visual Identity](2026-03-11-visual-identity-sandtable.md)

---

## Pre-flight: Current State

- 240 tests pass across core/canvas/editor
- Phase 6A complete: Inspector editing, FeatureStack with add/select, CommandHistory with undo/redo, all 8 MapCommand types implemented
- Command bar detects `/` prefix (SEARCH badge) but does nothing — `handleCommandSubmit` returns early for `/`
- No `@` GOTO mode exists — only `>` (command) and `/` (search) prefixes are detected
- No filter state, no search logic, no canvas dimming
- `useKeyboardShortcuts` supports `mod+shift+key` combos; only `mod+k`, `mod+z`, `mod+shift+z`, `mod+0/1/2`, `escape` are registered
- **Bug:** `App.tsx` dispatch/undo/redo create `new CommandHistory(history.currentState)`, destroying undo/redo stacks — multi-level undo is broken

---

## Task 0: Fix CommandHistory State Management in App.tsx

The undo/redo stacks are destroyed on every mutation because `dispatch()`, `undo()`, and `redo()` all call `setHistory(new CommandHistory(history.currentState))`. This replaces the `CommandHistory` instance — which holds the stacks — with a fresh one containing only the current state.

The fix: use a counter to force React re-renders while keeping the same `CommandHistory` instance.

**Files:**
- Modify: `editor/src/App.tsx:33,78-88,206-210`

**Step 1: Write a failing test that proves multi-level undo is broken**

Add to `editor/src/App.test.tsx`:

```typescript
import { CommandHistory, MapModel } from '@hexmap/canvas';
import { HexMapDocument } from '@hexmap/core';

test('CommandHistory survives undo/redo cycle (regression)', () => {
  const yaml = `
hexmap: "1.0"
layout:
  orientation: flat-down
  all: "0101 0201"
terrain:
  hex:
    clear: { style: { color: "#ffffff" } }
features:
  - at: "@all"
    terrain: clear
`;
  const doc = new HexMapDocument(yaml);
  const model = MapModel.fromDocument(doc);
  const history = new CommandHistory({ document: doc, model });

  // Execute two commands
  history.execute({ type: 'addFeature', feature: { at: '0101' } });
  history.execute({ type: 'addFeature', feature: { at: '0201' } });
  expect(history.currentState.model.features).toHaveLength(3);

  // Undo both
  history.undo();
  expect(history.currentState.model.features).toHaveLength(2);
  history.undo();
  expect(history.currentState.model.features).toHaveLength(1);

  // Redo both
  history.redo();
  expect(history.currentState.model.features).toHaveLength(2);
  history.redo();
  expect(history.currentState.model.features).toHaveLength(3);
});
```

This test passes at the `CommandHistory` level. The real bug is in `App.tsx`'s state management pattern — the test documents the contract that App.tsx must preserve.

**Step 2: Fix `App.tsx` — use a version counter instead of replacing CommandHistory**

Replace the history state pattern:

```typescript
// Before (broken):
const [history, setHistory] = useState<CommandHistory | null>(null);
// ...
const dispatch = (cmd: MapCommand) => {
  if (!history) return;
  history.execute(cmd);
  setHistory(new CommandHistory(history.currentState));
};

// After (fixed):
const historyRef = useRef<CommandHistory | null>(null);
const [historyVersion, setHistoryVersion] = useState(0);
const history = historyRef.current;
const model = history?.currentState.model ?? null;
```

Update the initial load:

```typescript
useEffect(() => {
  fetch('/maps/battle-for-moscow.hexmap.yaml')
    .then((r) => r.text())
    .then((yaml) => {
      const newModel = MapModel.load(yaml);
      historyRef.current = new CommandHistory({ document: newModel.document, model: newModel });
      setHistoryVersion((v) => v + 1);
    })
    .catch((err) => console.error('Failed to load map:', err));
}, []);
```

Update `dispatch`:

```typescript
const dispatch = (cmd: MapCommand) => {
  if (!historyRef.current) return;
  historyRef.current.execute(cmd);
  setHistoryVersion((v) => v + 1);
};
```

Update undo/redo shortcuts:

```typescript
'mod+z': () => {
  if (historyRef.current?.canUndo) {
    historyRef.current.undo();
    setHistoryVersion((v) => v + 1);
  }
},
'mod+shift+z': () => {
  if (historyRef.current?.canRedo) {
    historyRef.current.redo();
    setHistoryVersion((v) => v + 1);
  }
},
```

Remove `history` from the `shortcuts` useMemo dependency array (it's now accessed via ref). Add `historyVersion` to any useMemo that reads `model` to ensure recomputation.

**Step 3: Run all tests**

Run: `npx vitest run -v`
Expected: PASS (240 tests). The existing App.test.tsx tests should still pass since they test rendering behavior, not undo/redo depth.

**Step 4: Manual verification**

Load the editor, add two features via the command bar, then Cmd+Z twice. Both should undo. Cmd+Shift+Z should redo them.

**Step 5: Commit**

```
fix(editor): preserve CommandHistory undo/redo stacks across React re-renders
```

---

## Task 1: Add Filter State to App.tsx

Introduce a `filterQuery` state that the command bar's SEARCH mode populates in real-time. This drives filtering in the FeatureStack and dimming on the canvas.

**Files:**
- Modify: `editor/src/App.tsx`

**Step 1: Add filter state and derived filtered features**

```typescript
const [filterQuery, setFilterQuery] = useState<string | null>(null);
```

Extract the filter logic into a `useMemo`:

```typescript
const filteredIndices = useMemo(() => {
  if (!filterQuery || !model) return null; // null = no filter active
  const query = filterQuery.toLowerCase();

  // Key:value search (e.g., "terrain:forest")
  const colonIdx = query.indexOf(':');
  if (colonIdx > 0) {
    const key = query.substring(0, colonIdx).trim();
    const value = query.substring(colonIdx + 1).trim();
    return model.features
      .filter((f) => {
        switch (key) {
          case 'terrain': return f.terrain.toLowerCase().includes(value);
          case 'label': return (f.label ?? '').toLowerCase().includes(value);
          case 'id': return (f.id ?? '').toLowerCase().includes(value);
          case 'at': return f.at.toLowerCase().includes(value);
          case 'tags': return f.tags.some((t) => t.toLowerCase().includes(value));
          default: return false;
        }
      })
      .map((f) => f.index);
  }

  // Fuzzy match across all fields
  return model.features
    .filter((f) =>
      f.terrain.toLowerCase().includes(query) ||
      (f.label ?? '').toLowerCase().includes(query) ||
      (f.id ?? '').toLowerCase().includes(query) ||
      f.at.toLowerCase().includes(query) ||
      f.tags.some((t) => t.toLowerCase().includes(query))
    )
    .map((f) => f.index);
}, [filterQuery, model]);
```

**Step 2: Wire command bar onChange to update filter state**

In the `onChange` handler or a `useEffect` watching `commandValue`:

```typescript
useEffect(() => {
  if (commandValue.startsWith('/')) {
    setFilterQuery(commandValue.substring(1));
  } else {
    setFilterQuery(null);
  }
}, [commandValue]);
```

**Step 3: Pass filter info to FeatureStack and canvas**

```typescript
<FeatureStack
  features={features}
  filteredIndices={filteredIndices}
  // ... existing props
/>
```

For canvas dimming, the filtered indices determine which hexes to dim. This will be wired in Task 3.

**Step 4: Run all tests**

Run: `npx vitest run -v`
Expected: PASS

**Step 5: Commit**

```
feat(editor): add filter state for search mode with key:value and fuzzy matching
```

---

## Task 2: FeatureStack — Filter Display

When a filter is active, the FeatureStack should show only matching features and display a match count.

**Files:**
- Modify: `editor/src/components/FeatureStack.tsx:4-10,26-37`
- Modify: `editor/src/components/FeatureStack.test.tsx`

**Step 1: Write failing tests**

```typescript
test('shows all features when filteredIndices is null', () => {
  const features = [
    { index: 0, terrain: 'clear', at: '@all', isBase: true, hexIds: [], tags: [] },
    { index: 1, terrain: 'forest', at: '0201', isBase: false, hexIds: [], tags: [], label: 'Woods' },
  ] as FeatureItem[];
  render(<FeatureStack features={features} filteredIndices={null} terrainColor={() => '#000'} />);
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
});

test('shows only matching features when filteredIndices is set', () => {
  const features = [
    { index: 0, terrain: 'clear', at: '@all', isBase: true, hexIds: [], tags: [] },
    { index: 1, terrain: 'forest', at: '0201', isBase: false, hexIds: [], tags: [], label: 'Woods' },
  ] as FeatureItem[];
  render(<FeatureStack features={features} filteredIndices={[1]} terrainColor={() => '#000'} />);
  expect(screen.getAllByRole('listitem')).toHaveLength(1);
  expect(screen.getByText('Woods')).toBeDefined();
});

test('shows match count in header when filtering', () => {
  const features = [
    { index: 0, terrain: 'clear', at: '@all', isBase: true, hexIds: [], tags: [] },
    { index: 1, terrain: 'forest', at: '0201', isBase: false, hexIds: [], tags: [], label: 'Woods' },
    { index: 2, terrain: 'forest', at: '0301', isBase: false, hexIds: [], tags: [], label: 'Grove' },
  ] as FeatureItem[];
  render(<FeatureStack features={features} filteredIndices={[1, 2]} terrainColor={() => '#000'} />);
  expect(screen.getByText('2 of 3 features')).toBeDefined();
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run editor/src/components/FeatureStack.test.tsx -v`
Expected: FAIL — `filteredIndices` prop doesn't exist

**Step 3: Implement filtering in FeatureStack**

Add `filteredIndices` to props:

```typescript
interface FeatureStackProps {
  features: FeatureItem[];
  filteredIndices?: number[] | null; // null = no filter, [] = nothing matches
  selectedIndices?: number[];
  terrainColor?: (terrain: string) => string;
  onSelect?: (indices: number[], modifier: 'none' | 'shift' | 'cmd') => void;
  onHover?: (index: number | null) => void;
  dispatch?: (command: MapCommand) => void;
}
```

Filter the rendered list:

```typescript
const visibleFeatures = filteredIndices != null
  ? features.filter((f) => filteredIndices.includes(f.index))
  : features;
```

Update the header:

```typescript
<div className="feature-stack-header">
  {filteredIndices != null
    ? <span>{filteredIndices.length} of {features.length} features</span>
    : 'FEATURE STACK'}
  <button
    className="btn-icon"
    aria-label="Add feature"
    onClick={() => dispatch?.({ type: 'addFeature', feature: { at: '' } })}
  >+</button>
</div>
```

Replace `features.map(...)` in the list with `visibleFeatures.map(...)`.

**Step 4: Run tests**

Run: `npx vitest run editor/src/components/FeatureStack.test.tsx -v`
Expected: PASS

**Step 5: Run all tests**

Run: `npx vitest run -v`
Expected: PASS

**Step 6: Commit**

```
feat(editor): filter FeatureStack display when search is active
```

---

## Task 3: Canvas Dimming for Non-Matching Features

When a filter is active, non-matching features' hexes should be dimmed on the canvas. The approach: add a `dim` highlight style to the scene system that renders with reduced opacity.

**Files:**
- Modify: `canvas/src/scene.ts:13` (add `'dim'` to style union)
- Modify: `editor/src/canvas/draw.ts` (handle `dim` style in hex rendering)
- Modify: `editor/src/App.tsx` (compute dim highlights from filter state)
- Modify: `canvas/src/scene.test.ts` (new test)

**Step 1: Write failing test**

In `canvas/src/scene.test.ts`:

```typescript
it('dim highlight style is accepted', () => {
  const hl: SceneHighlight = {
    type: 'hex',
    hexIds: [Hex.hexId(Hex.offsetToCube(1, 1, 'flat-down'))],
    color: '#000000',
    style: 'dim'
  };
  const scene = buildScene(model, vp, { highlights: [hl] });
  expect(scene.highlights).toHaveLength(1);
  expect(scene.highlights[0].style).toBe('dim');
});
```

**Step 2: Run test to verify it fails**

Expected: FAIL — TypeScript won't accept `'dim'` as a valid style value.

**Step 3: Add `'dim'` to the style union**

In `canvas/src/scene.ts:13`, change:

```typescript
style: 'select' | 'hover' | 'ghost';
```

To:

```typescript
style: 'select' | 'hover' | 'ghost' | 'dim';
```

Also update `HighlightRenderItem:34`:

```typescript
style: 'select' | 'hover' | 'ghost' | 'dim';
```

**Step 4: Handle `dim` in draw.ts**

In `editor/src/canvas/draw.ts`, find the highlight drawing section and add handling for `dim`:

```typescript
// In the highlight drawing loop:
if (hl.style === 'dim') {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; // Dark overlay to dim
  fillHexPath(ctx, hl.corners);
  ctx.fill();
  continue;
}
```

**Step 5: Compute dim highlights in App.tsx**

Add a `dimHighlights` computation in the `highlights` useMemo:

```typescript
const dimHighlights: SceneHighlight[] = useMemo(() => {
  if (!model || filteredIndices === null) return [];
  // Collect all hex IDs that belong to non-matching features
  const matchingHexIds = new Set(
    filteredIndices.flatMap((idx) => model.features[idx]?.hexIds ?? [])
  );
  const allHexIds = model.mesh.getAllHexes().map((h) => h.id);
  const dimHexIds = allHexIds.filter((id) => !matchingHexIds.has(id));
  if (dimHexIds.length === 0) return [];
  return [{ type: 'hex', hexIds: dimHexIds, color: '#000000', style: 'dim' }];
}, [model, filteredIndices]);
```

Include `dimHighlights` in the highlights array passed to CanvasHost.

**Step 6: Run all tests**

Run: `npx vitest run -v`
Expected: PASS

**Step 7: Commit**

```
feat(canvas,editor): add dim highlight style for search filter canvas dimming
```

---

## Task 4: CommandBar — Search Key Dropdown

When the user types `/`, the command bar should show a dropdown with searchable keys (terrain, at, label, id, tags) so they can narrow their search.

**Files:**
- Modify: `editor/src/components/CommandBar.tsx`
- Modify: `editor/src/components/CommandBar.css`
- Modify: `editor/src/components/CommandBar.test.tsx`

**Step 1: Write failing tests**

```typescript
test('shows key dropdown when value is "/"', () => {
  render(<CommandBar value="/" onChange={() => {}} />);
  expect(screen.getByRole('listbox')).toBeDefined();
  expect(screen.getByText('terrain')).toBeDefined();
  expect(screen.getByText('label')).toBeDefined();
  expect(screen.getByText('id')).toBeDefined();
  expect(screen.getByText('at')).toBeDefined();
  expect(screen.getByText('tags')).toBeDefined();
});

test('hides key dropdown when value has a colon', () => {
  render(<CommandBar value="/terrain:" onChange={() => {}} />);
  expect(screen.queryByRole('listbox')).toBeNull();
});

test('clicking a key in dropdown appends it to value', () => {
  const onChange = vi.fn();
  render(<CommandBar value="/" onChange={onChange} />);
  fireEvent.click(screen.getByText('terrain'));
  expect(onChange).toHaveBeenCalledWith('/terrain:');
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run editor/src/components/CommandBar.test.tsx -v`
Expected: FAIL — no listbox rendered

**Step 3: Implement the dropdown**

In `CommandBar.tsx`, add dropdown rendering when in search mode with no colon:

```tsx
const SEARCH_KEYS = ['terrain', 'label', 'id', 'at', 'tags'];

const showKeyDropdown = mode === 'search' && !value.includes(':');

// In the JSX, after the input container:
{showKeyDropdown && (
  <ul className="command-dropdown" role="listbox">
    {SEARCH_KEYS.map((key) => (
      <li
        key={key}
        role="option"
        className="command-dropdown-item"
        onClick={() => onChange?.(`/${key}:`)}
      >
        {key}
      </li>
    ))}
  </ul>
)}
```

Update `aria-expanded` on the input:

```tsx
aria-expanded={showKeyDropdown ? 'true' : 'false'}
```

**Step 4: Add dropdown CSS**

In `CommandBar.css`:

```css
.command-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--surface-elevated);
  border: 1px solid var(--border-subtle);
  border-top: none;
  list-style: none;
  margin: 0;
  padding: 0;
  z-index: 100;
}

.command-dropdown-item {
  padding: 6px 12px;
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-secondary);
}

.command-dropdown-item:hover {
  background: var(--surface-hover);
  color: var(--text-primary);
}
```

Ensure `.command-bar-wrapper` has `position: relative` for the absolute dropdown.

**Step 5: Run tests**

Run: `npx vitest run editor/src/components/CommandBar.test.tsx -v`
Expected: PASS

**Step 6: Commit**

```
feat(editor): add search key dropdown to command bar SEARCH mode
```

---

## Task 5: CommandBar — `@` GOTO Mode

Add the `@` prefix for navigating to existing features by name/id. Typing `@river` should filter the suggestion list to features matching "river", and Enter should select + center viewport on that feature.

**Files:**
- Modify: `editor/src/components/CommandBar.tsx:26-29` (add `goto` mode)
- Modify: `editor/src/components/CommandBar.css` (GOTO badge styling)
- Modify: `editor/src/components/CommandBar.test.tsx`
- Modify: `editor/src/App.tsx` (handle GOTO submit)

**Step 1: Write failing tests**

```typescript
test('displays GOTO mode badge for @ prefix', () => {
  render(<CommandBar value="@" onChange={() => {}} />);
  expect(screen.getByText('GOTO')).toBeDefined();
});

test('shows feature suggestions in GOTO mode', () => {
  const suggestions = [
    { label: 'River', index: 1 },
    { label: 'Forest', index: 2 },
  ];
  render(<CommandBar value="@r" onChange={() => {}} gotoSuggestions={suggestions} />);
  expect(screen.getByRole('listbox')).toBeDefined();
  expect(screen.getByText('River')).toBeDefined();
  // Forest doesn't match "r" — but filtering happens in App.tsx, not CommandBar
});
```

**Step 2: Run tests to verify they fail**

Expected: FAIL — `@` not detected as a mode, no GOTO badge

**Step 3: Implement GOTO mode detection**

In `CommandBar.tsx`, update `getMode`:

```typescript
const getMode = (val: string) => {
  if (val.startsWith('>')) return 'command';
  if (val.startsWith('/')) return 'search';
  if (val.startsWith('@')) return 'goto';
  return 'path';
};
```

Add GOTO badge styling in CSS:

```css
.mode-goto {
  background: var(--accent-edge);
  color: var(--surface-base);
}
```

**Step 4: Add GOTO suggestions dropdown**

Add `gotoSuggestions` prop to `CommandBarProps`:

```typescript
interface CommandBarProps {
  value?: string;
  onChange?: (value: string) => void;
  onClear?: () => void;
  onSubmit?: (value: string) => void;
  error?: string;
  gotoSuggestions?: { label: string; index: number }[];
}
```

Render suggestions when in goto mode:

```tsx
const showGotoDropdown = mode === 'goto' && gotoSuggestions && gotoSuggestions.length > 0;

{showGotoDropdown && (
  <ul className="command-dropdown" role="listbox">
    {gotoSuggestions!.map((s) => (
      <li
        key={s.index}
        role="option"
        className="command-dropdown-item"
        onClick={() => onSubmit?.(`@${s.label}`)}
      >
        {s.label}
      </li>
    ))}
  </ul>
)}
```

**Step 5: Wire GOTO in App.tsx**

Compute goto suggestions:

```typescript
const gotoSuggestions = useMemo(() => {
  if (!model || !commandValue.startsWith('@')) return [];
  const query = commandValue.substring(1).toLowerCase();
  if (!query) return model.features.filter((f) => f.label).map((f) => ({ label: f.label!, index: f.index }));
  return model.features
    .filter((f) =>
      (f.label ?? '').toLowerCase().includes(query) ||
      (f.id ?? '').toLowerCase().includes(query)
    )
    .filter((f) => f.label || f.id)
    .map((f) => ({ label: f.label ?? f.id ?? `Feature ${f.index}`, index: f.index }));
}, [commandValue, model]);
```

Handle GOTO submit in `handleCommandSubmit`:

```typescript
if (value.startsWith('@')) {
  const query = value.substring(1).toLowerCase();
  if (!model) return;
  const match = model.features.find((f) =>
    (f.label ?? '').toLowerCase() === query ||
    (f.id ?? '').toLowerCase() === query
  );
  if (match) {
    handleSelectFeature([match.index]);
    // Center viewport on feature's hexes
    if (match.hexIds.length > 0) {
      canvasHostRef.current?.centerOnHexes(match.hexIds);
    }
  }
  setCommandValue('');
  return;
}
```

Note: `centerOnHexes` needs to be added to `CanvasHostRef` — see Task 6.

**Step 6: Run tests**

Run: `npx vitest run -v`
Expected: PASS (GOTO submit may not be fully testable until Task 6, but mode detection and suggestions should pass)

**Step 7: Commit**

```
feat(editor): add @ GOTO mode to command bar with feature suggestions
```

---

## Task 6: CanvasHost — `centerOnHexes` Method

The GOTO mode needs to center the viewport on a set of hex IDs. Add a `centerOnHexes` method to `CanvasHostRef`.

**Files:**
- Modify: `editor/src/canvas/CanvasHost.tsx`

**Step 1: Implement `centerOnHexes`**

In `CanvasHostRef`, add:

```typescript
export interface CanvasHostRef {
  resetZoom: () => void;
  centerOnHexes: (hexIds: string[]) => void;
}
```

In the `useImperativeHandle`:

```typescript
useImperativeHandle(ref, () => ({
  resetZoom: () => { /* existing */ },
  centerOnHexes: (hexIds: string[]) => {
    if (!viewportRef.current || hexIds.length === 0) return;
    const orientation = Hex.orientationTop(model?.grid.orientation ?? 'flat-down');
    const centers = hexIds.map((id) => {
      const cube = Hex.hexFromId(id);
      return Hex.hexToPixel(cube, 1, orientation); // HEX_SIZE = 1
    });
    const bounds = computeWorldBounds(centers, 1, orientation === 'flat' ? 'flat-down' : 'pointy-right');
    const vp = viewportRef.current;
    // Center on the midpoint of the bounds, keep current zoom
    const newCenter = {
      x: (bounds.min.x + bounds.max.x) / 2,
      y: (bounds.min.y + bounds.max.y) / 2,
    };
    viewportRef.current = { ...vp, center: newCenter };
    requestAnimationFrame(() => renderFrame());
  },
}));
```

Import `computeWorldBounds` from `@hexmap/canvas`.

**Step 2: Run all tests**

Run: `npx vitest run -v`
Expected: PASS (no new tests needed — this is a ref method, tested via manual interaction)

**Step 3: Commit**

```
feat(editor): add centerOnHexes to CanvasHost for GOTO navigation
```

---

## Task 7: Escape Clears Search Filter

When the user presses Escape while the command bar has a search query, it should clear the filter and restore the full feature list.

**Files:**
- Modify: `editor/src/App.tsx` (escape handler)

**Step 1: Verify current behavior**

Currently, `escape` calls `setSelection(clearSelection())`. It does NOT clear the command value. The command bar's own Escape handler calls `onClear?.()` + blur, but only when the input is focused.

**Step 2: Update escape shortcut**

In the `shortcuts` useMemo, update escape:

```typescript
escape: () => {
  if (commandValue) {
    setCommandValue('');
    commandBarRef.current?.blur();
  } else {
    setSelection(clearSelection());
  }
},
```

This means: if there's something in the command bar (including a search query), Escape clears it first. A second Escape clears the selection. This matches the UX workshop spec: "Escape or clearing the search bar restores full view."

**Step 3: Run all tests**

Run: `npx vitest run -v`
Expected: PASS

**Step 4: Commit**

```
feat(editor): escape clears command bar before clearing selection
```

---

## Task 8: Hybrid Focus Model — Printable Keys Auto-Focus Command Bar

The core of the keyboard-first workflow: typing any printable character (without modifier) should auto-focus the command bar and start entering a HexPath expression.

**Files:**
- Create: `editor/src/hooks/useHybridFocus.ts`
- Create: `editor/src/hooks/useHybridFocus.test.ts`
- Modify: `editor/src/App.tsx` (wire the hook)

**Step 1: Write failing test**

```typescript
import { renderHook } from '@testing-library/react';
import { useHybridFocus } from './useHybridFocus';

test('calls onCapture when printable key is pressed without modifier', () => {
  const onCapture = vi.fn();
  renderHook(() => useHybridFocus({ onCapture }));

  // Simulate pressing '0' with no modifier, target is document.body
  const event = new KeyboardEvent('keydown', { key: '0', bubbles: true });
  Object.defineProperty(event, 'target', { value: document.body });
  window.dispatchEvent(event);

  expect(onCapture).toHaveBeenCalledWith('0');
});

test('does not capture when modifier key is held', () => {
  const onCapture = vi.fn();
  renderHook(() => useHybridFocus({ onCapture }));

  const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true });
  Object.defineProperty(event, 'target', { value: document.body });
  window.dispatchEvent(event);

  expect(onCapture).not.toHaveBeenCalled();
});

test('does not capture when focus is in an input', () => {
  const onCapture = vi.fn();
  renderHook(() => useHybridFocus({ onCapture }));

  const input = document.createElement('input');
  document.body.appendChild(input);
  input.focus();

  const event = new KeyboardEvent('keydown', { key: '0', bubbles: true });
  Object.defineProperty(event, 'target', { value: input });
  window.dispatchEvent(event);

  expect(onCapture).not.toHaveBeenCalled();
  document.body.removeChild(input);
});
```

**Step 2: Run tests to verify they fail**

Expected: FAIL — `useHybridFocus` doesn't exist

**Step 3: Implement the hook**

```typescript
import { useEffect } from 'react';

interface UseHybridFocusOptions {
  onCapture: (key: string) => void;
  enabled?: boolean;
}

const PRINTABLE_RE = /^[a-zA-Z0-9@/>.!,;:\-+~_ ]$/;

export function useHybridFocus({ onCapture, enabled = true }: UseHybridFocusOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if modifier held (except shift — shift+number is valid for e.g. @ / > etc.)
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      // Skip if already in an input/textarea
      const target = event.target as HTMLElement;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      if (target.isContentEditable) return;

      // Skip non-printable keys
      if (!PRINTABLE_RE.test(event.key)) return;

      event.preventDefault();
      onCapture(event.key);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onCapture, enabled]);
}
```

**Step 4: Wire in App.tsx**

```typescript
import { useHybridFocus } from './hooks/useHybridFocus';

// In the component:
const handleHybridCapture = useCallback((key: string) => {
  setCommandValue((prev) => prev + key);
  commandBarRef.current?.focus();
}, []);

useHybridFocus({ onCapture: handleHybridCapture });
```

**Step 5: Run tests**

Run: `npx vitest run editor/src/hooks/useHybridFocus.test.ts -v`
Expected: PASS

**Step 6: Run all tests**

Run: `npx vitest run -v`
Expected: PASS

**Step 7: Commit**

```
feat(editor): hybrid focus model — printable keys auto-focus command bar
```

---

## Task 9: Tab Cycling Between Focus Zones

Tab should cycle focus between the three main zones: Feature Stack → Canvas → Inspector. This is a UX convenience — not standard browser tab order.

**Files:**
- Modify: `editor/src/hooks/useKeyboardShortcuts.ts` (allow `tab` in shortcuts)
- Modify: `editor/src/App.tsx` (add Tab handler)

**Step 1: Design the focus zone cycle**

The three zones each have a focusable anchor element:
- **Feature Stack:** the `<ul>` with `role="listbox"` — or the first `<li>` if items exist
- **Canvas:** the `<canvas>` element (already has `tabIndex={0}`)
- **Inspector:** the first `<input>` in the Inspector form

We need refs to identify the zone containers, then cycle focus between them.

**Step 2: Add Tab shortcut**

In `App.tsx` shortcuts:

```typescript
'tab': () => {
  const zones = [
    document.querySelector('.feature-stack'),
    document.querySelector('.canvas-host canvas'),
    document.querySelector('.inspector input, .inspector select'),
  ].filter(Boolean) as HTMLElement[];

  const activeZone = zones.findIndex((z) =>
    z === document.activeElement || z.contains(document.activeElement)
  );
  const nextIdx = (activeZone + 1) % zones.length;
  zones[nextIdx]?.focus();
},
```

**Step 3: Update `useKeyboardShortcuts` to handle Tab**

Tab is special: it doesn't have a `mod` prefix. The current hook checks `hasMod === modifier` which for a non-mod shortcut means `false === false` — this should already work for a plain `tab` shortcut. However, Tab also needs to be prevented from normal browser tab behavior.

Add `'tab'` to the input guard whitelist (or rather, don't — Tab should only be captured when NOT in an input, which is the default behavior since `'tab'` is not in `['k', 'z']`).

Wait — the hook skips non-mod shortcuts if focus is in an input. When you're in an input and press Tab, you want normal browser tabbing within the form. So the current guard is correct: Tab cycling only works when NOT in an input. When in an input (Inspector), Tab moves to the next field naturally.

But we need one addition: **Shift+Tab should skip the cycle** and let the browser handle it for accessibility.

```typescript
'tab': () => {
  // Only cycle when not in an input (the hook guard handles this)
  cycleFocusZone(1);
},
```

Create a `cycleFocusZone` function in App.tsx.

**Step 4: Run all tests**

Run: `npx vitest run -v`
Expected: PASS

**Step 5: Commit**

```
feat(editor): Tab cycles focus between Feature Stack, Canvas, and Inspector
```

---

## Task 10: Delete Key Shortcut

Pressing `Delete` or `Backspace` (when not in an input) should delete the selected feature.

**Files:**
- Modify: `editor/src/App.tsx` (add shortcuts)
- Modify: `editor/src/hooks/useKeyboardShortcuts.ts` (handle non-modifier shortcuts like `delete`, `backspace`)

**Step 1: Add Delete/Backspace shortcuts**

In `App.tsx` shortcuts:

```typescript
'delete': () => {
  if (selection.type === 'feature' && history) {
    // Delete in reverse order to preserve indices
    for (const idx of [...selection.indices].sort((a, b) => b - a)) {
      dispatch({ type: 'deleteFeature', index: idx });
    }
    setSelection(clearSelection());
  }
},
'backspace': () => {
  // Same as delete — common on Mac keyboards without a Delete key
  if (selection.type === 'feature' && history) {
    for (const idx of [...selection.indices].sort((a, b) => b - a)) {
      dispatch({ type: 'deleteFeature', index: idx });
    }
    setSelection(clearSelection());
  }
},
```

**Step 2: Handle in useKeyboardShortcuts**

The hook currently checks `hasMod === modifier` for every shortcut. For non-mod shortcuts like `delete`, `hasMod` is `false` and `modifier` is `false` when no meta/ctrl is held — so the match works. However, we need to make sure `delete` and `backspace` aren't blocked by the input guard. They should be blocked in inputs (you don't want Delete to delete a feature when you're editing a text field).

The current input guard only allows `['k', 'z']` through. Since `delete` and `backspace` are NOT in that list, they'll be blocked in inputs — which is correct.

But wait: `backspace` will also be captured by the hybrid focus hook if it matches `PRINTABLE_RE`. It shouldn't — backspace is not a printable character and won't match `/^[a-zA-Z0-9@/>.!,;:\-+~_ ]$/`. Good.

**Step 3: Write a test**

```typescript
test('Delete key calls handler when not in input', () => {
  const handler = vi.fn();
  renderHook(() => useKeyboardShortcuts({ 'delete': handler }));

  fireEvent.keyDown(window, { key: 'Delete' });
  expect(handler).toHaveBeenCalled();
});
```

**Step 4: Run tests**

Run: `npx vitest run -v`
Expected: PASS

**Step 5: Commit**

```
feat(editor): Delete/Backspace key deletes selected feature
```

---

## Task 11: Cmd+D Duplicate Shortcut

**Files:**
- Modify: `editor/src/App.tsx` (add shortcut)

**Step 1: Add shortcut**

In `App.tsx` shortcuts:

```typescript
'mod+d': () => {
  if (selection.type === 'feature' && selection.indices.length === 1 && model) {
    const feature = model.features[selection.indices[0]];
    if (feature) {
      dispatch({
        type: 'addFeature',
        feature: {
          at: feature.at,
          terrain: feature.terrain || undefined,
          label: feature.label ? `${feature.label} (copy)` : undefined,
        },
      });
    }
  }
},
```

Also add `'d'` to the input guard whitelist in `useKeyboardShortcuts` so Cmd+D works from inputs:

In `useKeyboardShortcuts.ts:31`:

```typescript
if (isInput && !['k', 'z', 'd'].includes(key)) {
```

**Step 2: Run all tests**

Run: `npx vitest run -v`
Expected: PASS

**Step 3: Commit**

```
feat(editor): Cmd+D duplicates selected feature
```

---

## Task 12: Arrow Key Navigation — Add Shift+Arrow for Second Diagonal

The UX workshop specifies Shift+↑/↓ for the NW/SE diagonal (the "other" diagonal not covered by plain ↑/↓).

**Files:**
- Modify: `editor/src/canvas/CanvasHost.tsx` (onKeyDown handler)
- Modify: `editor/src/App.tsx:171` (handleNavigate already takes directionName — just need new callers)

**Step 1: Update CanvasHost arrow key handler**

Find the `onKeyDown` handler in CanvasHost and update:

```typescript
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (!onNavigate) return;

  const dirMap: Record<string, string> = e.shiftKey
    ? {
        ArrowUp: 'NW',
        ArrowDown: 'SE',
      }
    : {
        ArrowLeft: 'W',
        ArrowRight: 'E',
        ArrowUp: 'NE',
        ArrowDown: 'SW',
      };

  const direction = dirMap[e.key];
  if (direction) {
    e.preventDefault();
    onNavigate(direction);
  }
};
```

This implements the mapping from the UX workshop:

| Keys | Direction |
|------|-----------|
| ← → | W, E |
| ↑ ↓ | NE, SW |
| Shift+↑ Shift+↓ | NW, SE |

**Step 2: Run all tests**

Run: `npx vitest run -v`
Expected: PASS

**Step 3: Commit**

```
feat(editor): Shift+arrow keys navigate to NW/SE hex neighbors
```

---

## Task 13: CommandBar — Escape Clears Filter with Visual Feedback

When the filter is active and the user presses Escape, the SEARCH badge should animate briefly to signal the filter was cleared. Also ensure the `onClear` callback resets filter state properly.

**Files:**
- Modify: `editor/src/components/CommandBar.css`
- Modify: `editor/src/App.tsx` (onClear wiring — already done in Task 7, just verify)

This is mostly a CSS polish task. Add a subtle transition on the mode badge:

```css
.mode-badge {
  transition: opacity 0.15s ease;
}
```

No new tests needed — visual feedback only.

**Commit:**

```
style(editor): add transition to command bar mode badge
```

---

## Task 14: Integration Test — Search & Keyboard Flow

Write an end-to-end test that exercises the full search and keyboard flow.

**Files:**
- Modify: `editor/src/App.test.tsx`

**Step 1: Write the integration test**

```typescript
describe('Search & Keyboard Flow', () => {
  test('typing / enters search mode and filters features', async () => {
    // This tests the integration at the component level.
    // We can't easily test the full hybrid focus → command bar → filter chain
    // in jsdom, but we can test the filter logic in isolation.
  });
});
```

Actually, the more valuable integration test is at the canvas package level, testing the filter logic:

```typescript
// In a new file: editor/src/hooks/useFilterLogic.test.ts
// Or simply add to App.test.tsx

import { FeatureItem } from '@hexmap/canvas';

const mockFeatures: FeatureItem[] = [
  { index: 0, terrain: 'clear', at: '@all', isBase: true, hexIds: [], tags: [], label: 'Base' },
  { index: 1, terrain: 'forest', at: '0201', isBase: false, hexIds: [], tags: ['dense'], label: 'Dark Forest' },
  { index: 2, terrain: 'river', at: '0101/E', isBase: false, hexIds: [], tags: ['waterway'], label: 'Elbe' },
  { index: 3, terrain: 'forest', at: '0301', isBase: false, hexIds: [], tags: [], label: 'Light Forest' },
];

// Extract the filter logic into a testable function (from Task 1)
function filterFeatures(features: FeatureItem[], query: string): number[] {
  const q = query.toLowerCase();
  const colonIdx = q.indexOf(':');
  if (colonIdx > 0) {
    const key = q.substring(0, colonIdx).trim();
    const value = q.substring(colonIdx + 1).trim();
    return features
      .filter((f) => {
        switch (key) {
          case 'terrain': return f.terrain.toLowerCase().includes(value);
          case 'label': return (f.label ?? '').toLowerCase().includes(value);
          case 'id': return (f.id ?? '').toLowerCase().includes(value);
          case 'at': return f.at.toLowerCase().includes(value);
          case 'tags': return f.tags.some((t) => t.toLowerCase().includes(value));
          default: return false;
        }
      })
      .map((f) => f.index);
  }
  return features
    .filter((f) =>
      f.terrain.toLowerCase().includes(q) ||
      (f.label ?? '').toLowerCase().includes(q) ||
      (f.id ?? '').toLowerCase().includes(q) ||
      f.at.toLowerCase().includes(q) ||
      f.tags.some((t) => t.toLowerCase().includes(q))
    )
    .map((f) => f.index);
}

describe('filterFeatures', () => {
  test('key:value search — terrain:forest', () => {
    expect(filterFeatures(mockFeatures, 'terrain:forest')).toEqual([1, 3]);
  });

  test('key:value search — tags:waterway', () => {
    expect(filterFeatures(mockFeatures, 'tags:waterway')).toEqual([2]);
  });

  test('fuzzy search — "forest"', () => {
    expect(filterFeatures(mockFeatures, 'forest')).toEqual([1, 3]);
  });

  test('fuzzy search — "elbe"', () => {
    expect(filterFeatures(mockFeatures, 'elbe')).toEqual([2]);
  });

  test('fuzzy search — "0201"', () => {
    expect(filterFeatures(mockFeatures, '0201')).toEqual([1]);
  });

  test('no match returns empty', () => {
    expect(filterFeatures(mockFeatures, 'swamp')).toEqual([]);
  });
});
```

**Step 2: Extract `filterFeatures` into a utility**

Rather than duplicating the filter logic from Task 1's useMemo, extract it into a pure function in a new file:

Create `editor/src/utils/filter-features.ts`:

```typescript
import { FeatureItem } from '@hexmap/canvas';

export function filterFeatures(features: FeatureItem[], query: string): number[] {
  // ... (same logic as Task 1)
}
```

Then import it in both App.tsx and the test file.

**Step 3: Run tests**

Run: `npx vitest run -v`
Expected: PASS

**Step 4: Commit**

```
feat(editor): extract filterFeatures utility with comprehensive tests
```

---

## Summary: Task Dependency Graph

```
Task 0: Fix CommandHistory state management (prerequisite for everything)
  │
  ├── Task 1: Filter state in App.tsx
  │     ├── Task 2: FeatureStack filter display
  │     ├── Task 3: Canvas dimming
  │     └── Task 7: Escape clears search
  │
  ├── Task 4: Search key dropdown
  │
  ├── Task 5: @ GOTO mode
  │     └── Task 6: centerOnHexes in CanvasHost
  │
  ├── Task 8: Hybrid focus model (printable → command bar)
  │
  ├── Task 9: Tab cycling between zones
  │
  ├── Task 10: Delete key shortcut
  │
  ├── Task 11: Cmd+D duplicate shortcut
  │
  ├── Task 12: Shift+arrow navigation
  │
  ├── Task 13: CSS polish (mode badge transition)
  │
  └── Task 14: Integration tests + extract filterFeatures utility
```

Tasks 1-7 are Phase 6B (Search & Filter). Tasks 8-12 are Phase 6C (Keyboard Flow). Tasks 13-14 are polish and testing.

Task 0 must be done first. After that, the two phases can be interleaved freely — the only hard dependencies are:
- Task 2 and 3 depend on Task 1 (filter state)
- Task 6 depends on Task 5 (GOTO mode)
- Task 14 depends on Task 1 (extracts the filter function)
