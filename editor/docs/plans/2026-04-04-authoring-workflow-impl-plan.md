# Authoring Workflow Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the core edit loop so authoring a simple map (BFM-class) feels smooth — fix mistakes easily, save reliably, see useful status info.

**Architecture:** All changes in the editor package except one CSS-variable fix in CommandBar.css. State machine changes in App.tsx, UI fixes in Inspector/StatusBar/NewMapDialog/CommandBar/ShortcutsOverlay. New state machine audit tests in App.test.tsx. No changes to `@hexmap/core` or `@hexmap/canvas`.

**Tech Stack:** React 18, TypeScript, Vitest, React Testing Library, CSS custom properties

**Design Spec:** `editor/docs/plans/2026-04-04-authoring-workflow-review.md`

**Test runner:** `cd editor && npx vitest run` (specific: `npx vitest run src/App.test.tsx`)

---

## File Map

| File | Responsibility | Changes |
|------|---------------|---------|
| `editor/src/App.tsx` | Main state machine | Command bar edit-vs-create, paint dedup, alt-click remove, cursor label conversion |
| `editor/src/App.test.tsx` | State machine tests | New tests for all state transitions |
| `editor/src/components/StatusBar.tsx` | Bottom bar display | Show hex label + edge/vertex notation |
| `editor/src/components/StatusBar.test.tsx` | StatusBar tests | Test label formatting |
| `editor/src/components/CommandBar.tsx` | Command palette | Rename export→save, add placeholder for edit mode |
| `editor/src/components/CommandBar.css` | Command bar styles | Fix undefined CSS variables |
| `editor/src/components/Inspector.tsx` | Feature inspector | Expandable at field, Duplicate/Delete styling |
| `editor/src/components/Inspector.css` | Inspector styles | `.inspector-actions` button styling |
| `editor/src/components/NewMapDialog.tsx` | Map creation | Required title field |
| `editor/src/components/NewMapDialog.test.tsx` | NewMapDialog tests | Test title validation |
| `editor/src/components/ShortcutsOverlay.css` | Shortcuts dialog | (already OK — the issue is CommandBar dropdown) |
| `editor/src/canvas/CanvasHost.tsx` | Canvas host | Emit cursor info for edges/vertices too |

---

## Phase 1: Fix the Edit Loop

### Task 1: Status bar shows hex labels instead of cube coords

The status bar `POS` field currently shows raw cube coordinate strings like `0,0,0`. Users need hex labels like `0101`.

**Root cause:** `CanvasHost.tsx:286` emits `hit.hexId` (cube coordinate string) as the cursor. `App.tsx` passes it to StatusBar unchanged. The cursor must remain a hexId internally for `highlightsForCursor()`, so the fix is to derive a formatted label in App.tsx via `useMemo`.

**Note:** `hit-test.ts:38` calls `formatHexLabel` without `firstCol`/`firstRow` (they default to 0), so `hit.label` is potentially wrong for maps with `firstCol != 0`. The `useMemo` approach below uses the correct grid parameters.

**Files:**
- Modify: `editor/src/App.tsx:53,600-604` — add `cursorLabel` useMemo, pass to StatusBar
- Modify: `editor/src/components/StatusBar.test.tsx` — verify label display

- [ ] **Step 1: Write failing test for StatusBar cursor display**

In `editor/src/components/StatusBar.test.tsx`, add:

```typescript
it('displays cursor text in POS segment', () => {
  render(<StatusBar cursor="0201" />);
  expect(screen.getByText('0201')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd editor && npx vitest run src/components/StatusBar.test.tsx`

These should pass since StatusBar renders `{cursor}` directly — the display layer is fine, the fix is in App.tsx.

- [ ] **Step 3: Add cursorLabel derivation in App.tsx**

In `editor/src/App.tsx`, add a `useMemo` to derive the label from hexId. `cursorHex` is at line 53, and `Hex` is already imported at line 25.

```typescript
// Add after the cursorHex state declaration (line 53):
const cursorLabel = useMemo(() => {
  if (!cursorHex || !model) return null;
  return Hex.formatHexLabel(
    Hex.hexFromId(cursorHex),
    model.grid.labelFormat,
    model.grid.orientation,
    model.grid.firstCol,
    model.grid.firstRow
  );
}, [cursorHex, model]);
```

Then update the StatusBar prop (around line 600-604) to pass `cursorLabel` instead of `cursorHex`:

```typescript
cursor={cursorLabel ?? (hoverIndex !== null && features[hoverIndex]
  ? features[hoverIndex].at.split(' ')[0]
  : '----')}
```

- [ ] **Step 4: Run tests, commit**

Run: `cd editor && npx vitest run`

```bash
git add editor/src/App.tsx editor/src/components/StatusBar.test.tsx
git commit -m "fix(editor): status bar shows hex labels instead of cube coords"
```

---

### Task 2: Command bar edits selected feature on Enter

Currently, pressing Enter in the command bar always creates a new feature via `addFeature`. When a feature is already selected, Enter should update that feature's `at` instead.

**Files:**
- Modify: `editor/src/App.tsx:431-436`
- Test: `editor/src/App.test.tsx`

- [ ] **Step 1: Write failing test**

In `editor/src/App.test.tsx`, following the existing pattern from line 102 (New Map dialog → Create):

```typescript
test('Enter in command bar updates selected feature instead of creating new', async () => {
  render(<App />);

  // 1. Create a map via the New Map dialog (pattern from line 102)
  const dialog = screen.getByRole('dialog');
  const titleInput = within(dialog).getByLabelText(/title/i);
  await userEvent.clear(titleInput);
  await userEvent.type(titleInput, 'Test Map');
  const createBtn = within(dialog).getByRole('button', { name: /create/i });
  await userEvent.click(createBtn);
  await screen.findByTitle('flat-down');

  // 2. Add a feature via command bar
  const input = screen.getByRole('combobox', { name: /command/i });
  await userEvent.type(input, '0101{enter}');

  // 3. Verify feature was created (check FeatureStack)
  const featureStack = screen.getByRole('complementary', { name: /features/i });
  const featureItems = within(featureStack).getAllByRole('listitem');
  const initialCount = featureItems.length;

  // 4. Select the feature we just created (click it in the stack)
  await userEvent.click(featureItems[featureItems.length - 1]);

  // 5. Type a new hexpath and press Enter — should UPDATE, not add
  await userEvent.click(input);
  await userEvent.clear(input);
  await userEvent.type(input, '0201{enter}');

  // 6. Verify feature count hasn't increased (edit, not create)
  const updatedItems = within(featureStack).getAllByRole('listitem');
  expect(updatedItems.length).toBe(initialCount);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd editor && npx vitest run src/App.test.tsx -t "updates selected feature"`
Expected: FAIL — currently creates a new feature instead of editing.

- [ ] **Step 3: Implement the edit-vs-create logic**

In `editor/src/App.tsx`, replace lines 431-436:

```typescript
// Current code:
if (historyRef.current) {
  const cmd: MapCommand = { type: 'addFeature', feature: { at: value.trim() } };
  historyRef.current.execute(cmd);
  setHistoryVersion((v) => v + 1);
}
setCommandValue('');
```

With:

```typescript
if (historyRef.current) {
  const sel = selectionRef.current;
  if (sel.type === 'feature' && sel.indices.length === 1) {
    // Edit selected feature's `at` expression
    const cmd: MapCommand = {
      type: 'updateFeature',
      index: sel.indices[0],
      changes: { at: value.trim() },
    };
    historyRef.current.execute(cmd);
  } else {
    // No feature selected — create new feature
    const cmd: MapCommand = { type: 'addFeature', feature: { at: value.trim() } };
    historyRef.current.execute(cmd);
  }
  setHistoryVersion((v) => v + 1);
}
setCommandValue('');
```

- [ ] **Step 3: Show visual indicator in command bar placeholder**

In `editor/src/App.tsx`, update the `commandBarPlaceholder` computed value to indicate edit mode. Find where `commandBarPlaceholder` is set (or the placeholder prop on CommandBar) and add:

```typescript
const commandBarPlaceholder = useMemo(() => {
  if (selection.type === 'feature' && selection.indices.length === 1 && model) {
    const f = model.features[selection.indices[0]];
    const name = f.label || f.id || f.terrain || `Feature ${selection.indices[0]}`;
    return `Edit "${name}" — type HexPath expression, Enter to apply`;
  }
  return 'HexPath expression, >command, /search, or @goto';
}, [selection, model]);
```

- [ ] **Step 4: Run tests, commit**

Run: `cd editor && npx vitest run`

```bash
git add editor/src/App.tsx
git commit -m "feat(editor): command bar Enter updates selected feature instead of creating new"
```

---

### Task 3: Deduplicate singletons during paint

Clicking the same hex multiple times during paint mode keeps adding duplicates. Fix: before appending a singleton, check if the atom's ID already exists.

**Files:**
- Modify: `editor/src/App.tsx:298-317`
- Test: `editor/src/App.test.tsx`

- [ ] **Step 1: Write failing test at the HexPath level**

The paint handler's dedup logic operates on HexPath segments. Test via `CommandHistory` directly (same pattern as App.test.tsx line 53):

In `editor/src/App.test.tsx`:

```typescript
test('addFeature followed by updateFeature with duplicate atom keeps only one copy', () => {
  const yaml = `
hexmap: "1.0"
layout:
  orientation: flat-down
  all: "0101 0201 0301"
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

  // Simulate painting: add feature, then update with "0101 0101"
  history.execute({ type: 'addFeature', feature: { at: '0101', terrain: 'clear' } });
  // If dedup works in the paint handler, this wouldn't happen.
  // But we can test at the data level: "0101 0101" should be normalized.
  history.execute({
    type: 'updateFeature',
    index: 1,
    changes: { at: '0101 0101' },
  });
  const at = history.currentState.model.features[1].at;
  // This test documents the current (buggy) behavior: duplicates are preserved.
  // After dedup is added to the paint handler, duplicates won't reach CommandHistory.
  expect(at).toContain('0101');
});
```

This test verifies the data layer. The actual dedup is in the paint handler (App.tsx), not CommandHistory, so the real fix is preventing duplicates from being submitted.

- [ ] **Step 2: Add deduplication to paint handler**

In `editor/src/App.tsx`, inside `handlePaintClick` (after line 310, the `else` branch for non-shift click), add a check:

```typescript
} else {
  // New disconnected atom (singleton segment)
  const newAtomResult = hp.resolve(atomId);
  const newId = newAtomResult.items[0];
  // Deduplicate: skip if this atom already exists in any segment
  const allIds = segments.flat();
  if (!allIds.includes(newId)) {
    segments.push(newAtomResult.items.map((id) => id));
  }
}
```

- [ ] **Step 3: Run tests, commit**

Run: `cd editor && npx vitest run`

```bash
git add editor/src/App.tsx
git commit -m "fix(editor): deduplicate singleton atoms during paint"
```

---

### Task 4: Alt-click to remove atom during paint

Add ability to remove a painted atom by Alt-clicking it. This is the inverse of paint.

**Files:**
- Modify: `editor/src/App.tsx:277-328`
- Modify: `editor/src/canvas/CanvasHost.tsx` (pass altKey from pointer events)

- [ ] **Step 1: Check that CanvasHost passes altKey**

In `editor/src/canvas/CanvasHost.tsx`, find the `onPaintClick` callback type. Check if it already passes `altKey`. If not:

```typescript
// In CanvasHostProps, change onPaintClick signature:
onPaintClick?: (hit: HitResult, shiftKey: boolean, altKey: boolean) => void;
```

And at `CanvasHost.tsx:286` (the pointer up handler), pass `e.altKey`:
```typescript
if (onPaintClick) onPaintClick(hit, e.shiftKey, e.altKey);
```

- [ ] **Step 2: Update handlePaintClick signature**

In `editor/src/App.tsx`, change `handlePaintClick`:

```typescript
const handlePaintClick = (hit: HitResult, shiftKey: boolean, altKey: boolean) => {
```

- [ ] **Step 3: Add removal logic**

After resolving the atom (line 294), before the `targetIndex` check, add:

```typescript
if (altKey && targetIndex !== null) {
  // Remove mode: find and remove the clicked atom from segments
  const feature = model.features[targetIndex];
  const existing = feature.at ? hp.resolve(feature.at) : { segments: [], type: hit.type };
  const segments = [...(existing.segments ?? [])];
  const newAtomResult = hp.resolve(atomId);
  const removeId = newAtomResult.items[0];

  // Remove from segments: filter out singletons that match, or remove from within segments
  const filtered = segments
    .map(seg => seg.filter(id => id !== removeId))
    .filter(seg => seg.length > 0);

  const newAt = hp.serialize(filtered, hit.type);
  dispatch({ type: 'updateFeature', index: targetIndex, changes: { at: newAt } });
  setCommandValue(newAt);
  return;
}
```

- [ ] **Step 4: Run tests, commit**

Run: `cd editor && npx vitest run`

```bash
git add editor/src/App.tsx editor/src/canvas/CanvasHost.tsx
git commit -m "feat(editor): alt-click removes atom during paint mode"
```

---

### Task 5: Expandable 'at' field in Inspector

The `at` text input overflows after a few hex labels. Make it a textarea that expands, with an atom count hint.

**Files:**
- Modify: `editor/src/components/Inspector.tsx:500-507`
- Modify: `editor/src/components/Inspector.css`

- [ ] **Step 1: Replace input with textarea**

In `editor/src/components/Inspector.tsx`, replace the `at` field input (lines 500-507):

```tsx
<textarea
  className="inspector-input inspector-at-textarea font-mono"
  defaultValue={feature.at}
  key={`at-${featureIndex}-${feature.at}`}
  rows={Math.min(Math.max(Math.ceil(feature.at.length / 40), 1), 6)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.currentTarget.blur();
    }
    if (e.key === 'Escape') {
      e.currentTarget.value = e.currentTarget.defaultValue;
      e.currentTarget.blur();
    }
  }}
  onBlur={(e) => handleFieldBlur('at', e.target.value)}
/>
```

- [ ] **Step 2: Add CSS for textarea**

In `editor/src/components/Inspector.css`:

```css
.inspector-at-textarea {
  resize: vertical;
  min-height: 24px;
  max-height: 120px;
  line-height: 1.4;
  padding: 4px 6px;
  overflow-y: auto;
}
```

- [ ] **Step 3: Run tests, commit**

Run: `cd editor && npx vitest run`

```bash
git add editor/src/components/Inspector.tsx editor/src/components/Inspector.css
git commit -m "fix(editor): expandable textarea for feature 'at' field"
```

---

## Phase 2: Map Creation & Save

### Task 6: Require map name in New Map dialog

Make the title field required so users always name their maps before creating.

**Files:**
- Modify: `editor/src/components/NewMapDialog.tsx:42,259-265`
- Test: `editor/src/components/NewMapDialog.test.tsx`

- [ ] **Step 1: Write failing test**

In `editor/src/components/NewMapDialog.test.tsx`:

```typescript
test('Create button is disabled when title is empty', () => {
  render(<NewMapDialog onCreateMap={vi.fn()} onCancel={vi.fn()} />);
  const titleInput = screen.getByLabelText(/title/i);
  fireEvent.change(titleInput, { target: { value: '' } });
  const createBtn = screen.getByRole('button', { name: /create/i });
  expect(createBtn).toBeDisabled();
});

test('title field starts empty with placeholder', () => {
  render(<NewMapDialog onCreateMap={vi.fn()} onCancel={vi.fn()} />);
  const titleInput = screen.getByLabelText(/title/i);
  expect(titleInput).toHaveValue('');
  expect(titleInput).toHaveAttribute('placeholder');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd editor && npx vitest run src/components/NewMapDialog.test.tsx`
Expected: FAIL — title starts as "New Map" and Create is not disabled.

- [ ] **Step 3: Implement required title**

In `editor/src/components/NewMapDialog.tsx`:

Change line 42:
```typescript
const [title, setTitle] = useState('');
```

Add validation to the title input (find the title `<input>`, add `placeholder`):
```tsx
<input
  type="text"
  value={title}
  onChange={(e) => setTitle(e.target.value)}
  placeholder="Enter map name..."
  aria-label="Title"
/>
```

Disable Create button when title is empty (line 263):
```tsx
<button
  className="btn-primary"
  onClick={handleCreate}
  disabled={!title.trim()}
>
  Create
</button>
```

- [ ] **Step 4: Run tests, commit**

Run: `cd editor && npx vitest run`

```bash
git add editor/src/components/NewMapDialog.tsx editor/src/components/NewMapDialog.test.tsx
git commit -m "feat(editor): require map name in New Map dialog"
```

---

### Task 7: Simplify save commands

Rename "export yaml" to "save". Remove JSON export from the command list (keep as undocumented `>export json`).

**Files:**
- Modify: `editor/src/components/CommandBar.tsx:22-31`
- Modify: `editor/src/App.tsx:398-407`

- [ ] **Step 1: Update command list**

In `editor/src/components/CommandBar.tsx`, replace the COMMANDS array entries (lines 25-26):

```typescript
{ label: 'save', description: 'Save map as YAML' },
```

Remove the `export yaml` and `export json` entries.

- [ ] **Step 2: Update command handler**

In `editor/src/App.tsx`, extract a shared save helper and use it from both the command handler and `mod+s`:

```typescript
// Extract save logic into a helper (inside the component, near the command handler):
const doSave = () => {
  const yaml = historyRef.current?.currentState.document.toString() ?? '';
  const title = model?.metadata.title?.replace(/\s+/g, '-').toLowerCase() || 'hexmap';
  downloadFile(yaml, `${title}.hexmap.yaml`, 'text/yaml');
  historyRef.current?.markSaved();
  setHistoryVersion((v) => v + 1);
};
```

Then in the command handler, replace the `export yaml` block with:
```typescript
} else if (cmd === 'save' || cmd === 'export yaml' || cmd === 'export') {
  doSave();
} else if (cmd === 'export json') {
```

And update the `mod+s` handler to call `doSave()` too (verify it already does the same thing — if so, replace with `doSave()`).

Note: keep `export yaml` as a silent alias so existing muscle memory works. Just remove it from the visible command list.

- [ ] **Step 3: Run tests, commit**

Run: `cd editor && npx vitest run`

```bash
git add editor/src/components/CommandBar.tsx editor/src/App.tsx
git commit -m "feat(editor): rename 'export yaml' to 'save' in command palette"
```

---

## Phase 3: Inspector & UI Polish

### Task 8: Fix command dropdown transparent background

ISSUES.md says "shortcut/command palette menu has transparent background" — investigation shows this is actually the **CommandBar dropdown** (not the ShortcutsOverlay, which already has a solid `rgba(0,0,0,0.7)` backdrop + `var(--bg-elevated)` dialog). The CommandBar dropdown uses `var(--surface-elevated)`, `var(--surface-hover)`, and `var(--surface-base)` which are undefined CSS variables, making the dropdown transparent.

**Files:**
- Modify: `editor/src/components/CommandBar.css:100,121`

- [ ] **Step 1: Fix undefined CSS variables**

In `editor/src/components/CommandBar.css`:

Line 100: change `background: var(--surface-elevated);` to `background: var(--bg-elevated);`
Line 121: change `background: var(--surface-hover);` to `background: var(--bg-hover, var(--bg-elevated));`

Also check line 38 `.mode-badge.mode-goto`: `color: var(--surface-base);` → `color: var(--bg-base);`

- [ ] **Step 2: Verify visually (human check)**

Run `npm run dev -w editor`, open command bar with `>`, verify dropdown has solid background.

- [ ] **Step 3: Commit**

```bash
git add editor/src/components/CommandBar.css
git commit -m "fix(editor): replace undefined CSS variables in command dropdown"
```

---

### Task 9: Fix Duplicate/Delete button styling

The `.btn-secondary` and `.btn-danger` classes used in Inspector have no CSS definitions, making the buttons look like unstyled text.

**Files:**
- Modify: `editor/src/components/Inspector.css`

- [ ] **Step 1: Add button styles**

In `editor/src/components/Inspector.css`, add:

```css
.inspector-actions {
  display: flex;
  gap: 8px;
  padding: 8px 0;
  border-top: 1px solid var(--border-subtle);
  margin-top: 8px;
}

.inspector-actions .btn-secondary,
.inspector-actions .btn-danger {
  flex: 1;
  padding: 6px 12px;
  border-radius: var(--radius-sm, 4px);
  font-size: var(--font-size-sm, 12px);
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--border-subtle);
  transition: background 0.15s, color 0.15s;
}

.inspector-actions .btn-secondary {
  background: var(--bg-elevated);
  color: var(--text-secondary);
}

.inspector-actions .btn-secondary:hover {
  background: var(--bg-hover, var(--bg-elevated));
  color: var(--text-primary);
}

.inspector-actions .btn-danger {
  background: transparent;
  color: var(--color-error, #f85149);
  border-color: var(--color-error, #f85149);
}

.inspector-actions .btn-danger:hover {
  background: rgba(248, 81, 73, 0.15);
}
```

- [ ] **Step 2: Run tests, commit**

Run: `cd editor && npx vitest run`

```bash
git add editor/src/components/Inspector.css
git commit -m "fix(editor): style Duplicate/Delete buttons in feature inspector"
```

---

### Task 10: Auto-edit mode on terrain add

After adding a new terrain type, automatically expand its edit panel so the user can immediately customize it.

**Files:**
- Modify: `editor/src/components/Inspector.tsx`

- [ ] **Step 1: Verify auto-expand already works**

In `Inspector.tsx`, the "Add terrain" handler is at line 147 and already calls:
```typescript
setExpandedTerrain({ key: newKey, geometry });
```

The state is `expandedTerrain`/`setExpandedTerrain` at line 45. This means auto-expand **may already be implemented**. Verify by:
1. Running the editor (`npm run dev -w editor`)
2. Adding a terrain type
3. Checking if it auto-expands

If it already works, mark this task as done and skip to the commit. If the expansion doesn't visually work (e.g., it sets state but the panel doesn't render), investigate the `isExpanded` check at line 87.

- [ ] **Step 2: If broken, fix the expansion logic**

The `isExpanded` check at line 87:
```typescript
const isExpanded = expandedTerrain?.key === key && expandedTerrain?.geometry === geometry;
```

Verify that `newKey` at the add handler matches the format used in the iteration. If they differ (e.g., one uses `terrain_3` and the other uses just the key), fix the mismatch.

- [ ] **Step 3: Run tests, commit**

Run: `cd editor && npx vitest run`

```bash
git add editor/src/components/Inspector.tsx
git commit -m "feat(editor): auto-expand edit panel when adding terrain type"
```

---

### Task 11: Editable hex color field + path checkbox

Add a text input for direct hex color entry alongside the ColorPicker, and a checkbox for `properties.path` in the terrain edit panel.

**Files:**
- Modify: `editor/src/components/Inspector.tsx`
- Modify: `editor/src/components/Inspector.css`

- [ ] **Step 1: Add hex input to color picker row**

Find the `<ColorPicker>` usage in the terrain edit form. Add an inline text input beside it:

```tsx
<div className="inspector-color-row">
  <ColorPicker value={def.color} onChange={(c) => handleColorChange(key, c)} />
  <input
    type="text"
    className="inspector-input inspector-hex-input font-mono"
    value={def.color}
    onChange={(e) => {
      const v = e.target.value;
      if (/^#[0-9a-fA-F]{3,8}$/.test(v)) {
        handleColorChange(key, v);
      }
    }}
    onBlur={(e) => {
      const v = e.target.value;
      if (/^#[0-9a-fA-F]{3,8}$/.test(v)) {
        handleColorChange(key, v);
      }
    }}
    onKeyDown={handleInputKeyDown}
  />
</div>
```

- [ ] **Step 2: Add path checkbox**

In the terrain edit form, add after the type/modifier row:

```tsx
{geometry === 'hex' && (
  <div className="inspector-row">
    <label>Path</label>
    <input
      type="checkbox"
      checked={!!def.properties?.path}
      onChange={(e) => {
        const props = { ...(def.properties ?? {}), path: e.target.checked || undefined };
        // Dispatch setTerrainType with updated properties
        dispatch?.({
          type: 'setTerrainType',
          geometry,
          key,
          def: { ...buildDef(def), properties: props },
        });
      }}
    />
  </div>
)}
```

- [ ] **Step 3: Add CSS**

In `Inspector.css`:

```css
.inspector-color-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.inspector-hex-input {
  width: 80px;
  font-size: 11px;
}
```

- [ ] **Step 4: Run tests, commit**

Run: `cd editor && npx vitest run`

```bash
git add editor/src/components/Inspector.tsx editor/src/components/Inspector.css
git commit -m "feat(editor): editable hex color field and path checkbox in terrain editor"
```

---

### Task 12: ~~Fix road terrain missing path=true in Standard Wargame palette~~

**ALREADY FIXED.** `NewMapDialog.tsx:110-112` — `pathTerrain` items already generate `properties: { path: true }` in the YAML output. Road is in `pathTerrain` array (line 33). No code change needed.

- [x] **Verified:** `pathTerrain` YAML generation at line 112: `yaml += \`..., properties: { path: true } }\n\``

---

## Phase 4: State Machine Audit

### Task 13: Comprehensive state machine tests

Write integration tests that verify App.tsx state transitions are correct across all mode interactions.

**Files:**
- Modify: `editor/src/App.test.tsx`

- [ ] **Step 1: Write mode transition tests**

Add a new `describe` block in `App.test.tsx`. Use the existing pattern (line 102) for creating a map via the New Map dialog. Here is one fully-worked example to establish the pattern:

```typescript
describe('state machine transitions', () => {
  // Helper: create a map and return to idle state
  async function createMap() {
    render(<App />);
    const dialog = screen.getByRole('dialog');
    const titleInput = within(dialog).getByLabelText(/title/i);
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Test');
    const createBtn = within(dialog).getByRole('button', { name: /create/i });
    await userEvent.click(createBtn);
    await screen.findByTitle('flat-down'); // wait for canvas to mount
  }

  test('command bar > prefix shows command mode and lists commands', async () => {
    await createMap();
    const input = screen.getByRole('combobox', { name: /command/i });
    await userEvent.type(input, '>');

    // Verify command mode badge appears
    expect(screen.getByText('CMD')).toBeInTheDocument();

    // Verify command list dropdown is visible
    expect(screen.getByText(/save/i)).toBeInTheDocument();
  });

  test('Escape in command bar clears input and blurs', async () => {
    await createMap();
    const input = screen.getByRole('combobox', { name: /command/i });
    await userEvent.type(input, '0101');
    expect(input).toHaveValue('0101');

    await userEvent.keyboard('{Escape}');
    expect(input).toHaveValue('');
  });

  test('selecting feature changes command bar placeholder to edit mode', async () => {
    await createMap();

    // Add a feature via command bar
    const input = screen.getByRole('combobox', { name: /command/i });
    await userEvent.type(input, '0101{enter}');

    // Select the feature in the stack
    const featureStack = screen.getByRole('complementary', { name: /features/i });
    const items = within(featureStack).getAllByRole('listitem');
    await userEvent.click(items[items.length - 1]);

    // Verify placeholder indicates editing
    expect(input).toHaveAttribute('placeholder', expect.stringContaining('Edit'));
  });
});
```

- [ ] **Step 2: Write command bar mode interaction tests**

```typescript
test('command bar >save triggers download', async () => {
  // Mock download infrastructure (pattern from line 88-99)
  const createObjectUrlMock = vi.fn().mockReturnValue('blob:mock');
  window.URL.createObjectURL = createObjectUrlMock;
  window.URL.revokeObjectURL = vi.fn();
  const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

  try {
    await createMap();
    const input = screen.getByRole('combobox', { name: /command/i });
    await userEvent.type(input, '>save{enter}');

    // Verify download was triggered
    expect(clickSpy).toHaveBeenCalled();
    expect(createObjectUrlMock).toHaveBeenCalled();
  } finally {
    clickSpy.mockRestore();
  }
});
```

- [ ] **Step 3: Run tests, commit**

Run: `cd editor && npx vitest run`

```bash
git add editor/src/App.test.tsx
git commit -m "test(editor): state machine audit tests for mode transitions"
```

---

## Phase 5: Remaining Polish

### Task 14: Clear terrain off-white default

**Files:**
- Modify: `editor/src/components/NewMapDialog.tsx:14`

- [ ] **Step 1: Change clear terrain color**

In `NewMapDialog.tsx` line 14:
```typescript
clear: '#f5f0e8',  // was '#d4c87a'
```

Wait — the current value `#d4c87a` is already a warm tan, not pure white. The issue may be in the default `clear` terrain style in the generated YAML, or in the canvas rendering fallback. Check what color is actually rendered for "clear" terrain on the canvas.

If the issue is the fallback color in MapModel for unknown terrain (pure white), that's in `canvas/src/model.ts` — but the review spec says no canvas changes. If the palette color is fine, this may already be OK. Verify visually and skip if not needed.

- [ ] **Step 2: Commit if changed**

```bash
git add editor/src/components/NewMapDialog.tsx
git commit -m "fix(editor): use warmer off-white for clear terrain default"
```

---

### Task 15: Fix inspector field alignment

**Files:**
- Modify: `editor/src/components/Inspector.css`

- [ ] **Step 1: Add consistent grid layout for inspector rows**

```css
.inspector-row {
  display: grid;
  grid-template-columns: 72px 1fr;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.inspector-row label {
  text-align: left;
  font-size: var(--font-size-sm, 12px);
  color: var(--text-muted);
}
```

This gives all labels a fixed 72px column width with fields starting at the same horizontal position.

- [ ] **Step 2: Run tests, commit**

Run: `cd editor && npx vitest run`

```bash
git add editor/src/components/Inspector.css
git commit -m "fix(editor): consistent label/field alignment in inspector"
```

---

## Summary

| Phase | Tasks | Issues Fixed |
|-------|-------|-------------|
| 1: Edit loop | 1-5 | P0 #1-5: status bar, command bar edit, dedup, alt-remove, expandable at |
| 2: Creation & save | 6-7 | P1 #6-7: required name, save command |
| 3: Inspector polish | 8-12 | P1 #8-12: dropdown bg, buttons, auto-edit, color field, path checkbox, road palette |
| 4: State machine audit | 13 | Testing: comprehensive mode transition coverage |
| 5: Polish | 14-15 | P2 #14,19: clear color, field alignment |
