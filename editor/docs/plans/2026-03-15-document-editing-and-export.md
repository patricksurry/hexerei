# Document Editing & Export Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement Phase 6D (Terrain Types panel, editable Map Info) and Phase 6E (YAML export, Cmd+S download) from the [Authoring UX Workshop](2026-03-10-authoring-ux-workshop.md). Users can edit terrain definitions, modify map metadata and layout, and export the document.

**Architecture:** All mutations flow through `MapCommand` -> `executeCommand()` -> `CommandHistory`. The command types for `setLayout`, `setMetadata`, `setTerrainType`, and `deleteTerrainType` already exist in `canvas/src/command.ts` with full undo/inverse support. This plan is purely UI wiring + export logic. The Inspector currently renders metadata/layout read-only and has a terrain vocabulary placeholder. We convert those to editable forms.

**Tech Stack:** TypeScript, Vitest, React 18, `@hexmap/core`, `@hexmap/canvas`

**Design docs:**

- [Authoring UX Workshop](2026-03-10-authoring-ux-workshop.md) -- Phases 6D and 6E
- [API Surface Design](2026-03-12-api-surface-design.md)
- [Visual Identity](2026-03-11-visual-identity-sandtable.md)

---

## Pre-flight: Current State

- 270 tests pass across core/canvas/editor
- Phase 6A-6C complete: Inspector editing, search/filter, keyboard flow
- `MapCommand` already supports: `setLayout`, `setMetadata`, `setTerrainType`, `deleteTerrainType` (with undo/inverse) -- `canvas/src/command.ts:10-23`
- `HexMapDocument` API: `getTerrain()`, `setTerrainType()`, `deleteTerrainType()`, `getLayout()`, `setLayout()`, `getMetadata()`, `setMetadata()` -- `core/src/format/document.ts:39-196`
- Inspector renders metadata/layout as read-only `<span>` elements -- `editor/src/components/Inspector.tsx:19-58`
- Inspector has a placeholder for terrain vocabulary -- `Inspector.tsx:56`
- `MapModel.terrainDefs` is a `Map<string, TerrainDef>` with `{ key, name, color, properties }` -- `canvas/src/model.ts:70-80`
- `MapModel.toYAML()` returns the document as a YAML string -- `canvas/src/model.ts:154-156`
- `StatusBar` already shows "MODIFIED" via `history.isDirty` -- wired in `App.tsx:406`
- `>` command mode exists with `zoom fit`, `clear`, `theme sandtable`, `theme classic` -- `App.tsx:263-276`

### Type Reference

```typescript
// core/src/format/types.ts
interface HexMapMetadata {
  id?: string;
  version?: string;
  title?: string;
  description?: string;
  designer?: string;
  publisher?: string;
  date?: string;
  source?: { url?: string; notes?: string };
}

interface HexMapLayout {
  orientation: Orientation; // 'flat-down' | 'flat-up' | 'pointy-right' | 'pointy-left'
  all: string; // HexPath expression defining the grid
  label?: string; // label format e.g. 'XXYY'
  origin?: 'top-left' | 'bottom-left' | 'top-right' | 'bottom-right';
  georef?: GeoReference;
}

interface TerrainTypeDef {
  name?: string;
  type?: 'base' | 'modifier';
  onesided?: boolean;
  style?: { color?: string; pattern?: string; stroke?: string; stroke_width?: number };
  properties?: Record<string, unknown>;
}

interface TerrainVocabulary {
  hex?: Record<string, TerrainTypeDef>;
  edge?: Record<string, TerrainTypeDef>;
  vertex?: Record<string, TerrainTypeDef>;
}
```

---

## Task 1: Editable Map Metadata in Inspector

Replace the read-only metadata `<span>` elements with input fields that dispatch `setMetadata` commands on blur.

**Files:**

- Modify: `editor/src/components/Inspector.tsx:19-32`
- Modify: `editor/src/components/Inspector.test.tsx`

**Step 1: Write a failing test**

Add to `editor/src/components/Inspector.test.tsx`:

```typescript
it('dispatches setMetadata when title is changed', () => {
  const model = MapModel.load(MOCK_YAML);
  const sel: Selection = { type: 'none' };
  const dispatched: MapCommand[] = [];
  render(<Inspector selection={sel} model={model} dispatch={(cmd) => dispatched.push(cmd)} />);

  const titleInput = screen.getByDisplayValue('Battle for Moscow');
  fireEvent.change(titleInput, { target: { value: 'New Title' } });
  fireEvent.blur(titleInput);

  expect(dispatched).toHaveLength(1);
  expect(dispatched[0]).toEqual({ type: 'setMetadata', key: 'title', value: 'New Title' });
});
```

Note: The `MOCK_YAML` at the top of the test file doesn't have a `metadata` section with a title. Either update `MOCK_YAML` to include `metadata: { title: "Battle for Moscow" }` or use a separate YAML for this test. Since the existing model's `metadata.title` may be undefined, check what `MapModel.load(MOCK_YAML).metadata.title` returns and adjust.

If the mock doesn't have a title, create a dedicated `METADATA_YAML`:

```typescript
const METADATA_YAML = `
hexmap: "1.0"
metadata:
  title: "Test Map"
  designer: "Test Designer"
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
```

And use this in the metadata tests.

**Step 2: Run tests to verify they fail**

Run: `npx vitest run editor/src/components/Inspector.test.tsx -v`
Expected: FAIL -- no input found with the expected display value

**Step 3: Make metadata fields editable**

In `Inspector.tsx`, replace the `renderMetadata` function's MAP METADATA section. Replace the read-only `<span>` for title with an input:

```tsx
const renderMetadata = () => (
  <div className="inspector-content">
    <section className="inspector-section">
      <h3 className="inspector-header"
        style={{ padding: '0 0 8px 0', marginBottom: '12px', fontSize: '10px' }}>
        MAP METADATA
      </h3>
      <div className="inspector-row">
        <label>Title</label>
        <input
          type="text"
          className="inspector-input"
          defaultValue={model.metadata.title || ''}
          key={`meta-title-${model.metadata.title}`}
          onBlur={(e) => {
            const value = e.target.value || undefined;
            if (value !== (model.metadata.title || undefined)) {
              dispatch?.({ type: 'setMetadata', key: 'title', value });
            }
          }}
        />
      </div>
      <div className="inspector-row">
        <label>Designer</label>
        <input
          type="text"
          className="inspector-input"
          defaultValue={model.metadata.designer || ''}
          key={`meta-designer-${model.metadata.designer}`}
          onBlur={(e) => {
            const value = e.target.value || undefined;
            if (value !== (model.metadata.designer || undefined)) {
              dispatch?.({ type: 'setMetadata', key: 'designer', value });
            }
          }}
        />
      </div>
      <div className="inspector-row">
        <label>Description</label>
        <input
          type="text"
          className="inspector-input"
          defaultValue={model.metadata.description || ''}
          key={`meta-description-${model.metadata.description}`}
          onBlur={(e) => {
            const value = e.target.value || undefined;
            if (value !== (model.metadata.description || undefined)) {
              dispatch?.({ type: 'setMetadata', key: 'description', value });
            }
          }}
        />
      </div>
    </section>
    {/* ... LAYOUT and VOCABULARY sections unchanged for now */}
```

**Step 4: Run tests**

Run: `npx vitest run editor/src/components/Inspector.test.tsx -v`
Expected: PASS

**Step 5: Run all tests**

Run: `npx vitest run -v`
Expected: PASS

**Step 6: Commit**

```
feat(editor): make map metadata fields editable in Inspector
```

---

## Task 2: Editable Layout Fields in Inspector

Replace the read-only layout `<span>` elements with an orientation dropdown and a label format input that dispatch `setLayout` commands.

**Files:**

- Modify: `editor/src/components/Inspector.tsx:33-47`
- Modify: `editor/src/components/Inspector.test.tsx`

**Step 1: Write a failing test**

```typescript
it('dispatches setLayout when orientation is changed', () => {
  const model = MapModel.load(METADATA_YAML);
  const sel: Selection = { type: 'none' };
  const dispatched: MapCommand[] = [];
  render(<Inspector selection={sel} model={model} dispatch={(cmd) => dispatched.push(cmd)} />);

  const orientationSelect = screen.getByDisplayValue('flat-down');
  fireEvent.change(orientationSelect, { target: { value: 'pointy-right' } });

  expect(dispatched).toHaveLength(1);
  expect(dispatched[0]).toEqual({ type: 'setLayout', key: 'orientation', value: 'pointy-right' });
});
```

**Step 2: Run tests to verify they fail**

Expected: FAIL -- no select element with expected value

**Step 3: Make layout fields editable**

Replace the LAYOUT section's `<span>` elements:

```tsx
<section className="inspector-section">
  <h3
    className="inspector-header"
    style={{ padding: '0 0 8px 0', marginBottom: '12px', fontSize: '10px' }}
  >
    LAYOUT
  </h3>
  <div className="inspector-row">
    <label>Orientation</label>
    <select
      className="inspector-select"
      defaultValue={model.grid.orientation}
      key={`layout-orientation-${model.grid.orientation}`}
      onChange={(e) => {
        dispatch?.({ type: 'setLayout', key: 'orientation', value: e.target.value });
      }}
    >
      <option value="flat-down">flat-down</option>
      <option value="flat-up">flat-up</option>
      <option value="pointy-right">pointy-right</option>
      <option value="pointy-left">pointy-left</option>
    </select>
  </div>
  <div className="inspector-row">
    <label>Label Format</label>
    <input
      type="text"
      className="inspector-input font-mono"
      defaultValue={model.grid.labelFormat}
      key={`layout-label-${model.grid.labelFormat}`}
      onBlur={(e) => {
        const value = e.target.value || undefined;
        if (value !== model.grid.labelFormat) {
          dispatch?.({ type: 'setLayout', key: 'label', value });
        }
      }}
    />
  </div>
</section>
```

**Step 4: Run tests**

Run: `npx vitest run editor/src/components/Inspector.test.tsx -v`
Expected: PASS

**Step 5: Run all tests**

Run: `npx vitest run -v`
Expected: PASS

**Step 6: Commit**

```
feat(editor): make layout orientation and label format editable in Inspector
```

---

## Task 3: Terrain Vocabulary List in Inspector

Replace the placeholder text with a list of terrain type definitions from `model.terrainDefs`, each showing the key, color chip, and name. Add a delete button for each and an "Add terrain" button at the bottom.

**Files:**

- Modify: `editor/src/components/Inspector.tsx:49-57`
- Modify: `editor/src/components/Inspector.test.tsx`
- Modify: `editor/src/components/Inspector.css` (terrain list styling)

**Step 1: Write failing tests**

```typescript
it('shows terrain types when nothing is selected', () => {
  const model = MapModel.load(MOCK_YAML);
  const sel: Selection = { type: 'none' };
  render(<Inspector selection={sel} model={model} />);

  // MOCK_YAML defines "clear" and "forest" terrain types
  expect(screen.getByText('clear')).toBeDefined();
  expect(screen.getByText('forest')).toBeDefined();
});

it('dispatches deleteTerrainType when delete button is clicked', () => {
  const model = MapModel.load(MOCK_YAML);
  const sel: Selection = { type: 'none' };
  const dispatched: MapCommand[] = [];
  render(<Inspector selection={sel} model={model} dispatch={(cmd) => dispatched.push(cmd)} />);

  // Find the delete button next to "forest"
  const forestRow = screen.getByText('forest').closest('.terrain-row');
  const deleteBtn = forestRow?.querySelector('button[aria-label="Delete terrain"]');
  expect(deleteBtn).toBeDefined();
  fireEvent.click(deleteBtn!);

  expect(dispatched).toHaveLength(1);
  expect(dispatched[0]).toEqual({
    type: 'deleteTerrainType',
    geometry: 'hex',
    key: 'forest',
  });
});
```

**Step 2: Run tests to verify they fail**

Expected: FAIL -- placeholder text found instead of terrain names

**Step 3: Implement the terrain list**

Replace the VOCABULARY section in `renderMetadata()`:

```tsx
<section className="inspector-section">
  <h3
    className="inspector-header"
    style={{ padding: '0 0 8px 0', marginBottom: '12px', fontSize: '10px' }}
  >
    TERRAIN VOCABULARY
  </h3>
  <ul className="terrain-list">
    {Array.from(model.terrainDefs.entries()).map(([key, def]) => (
      <li key={key} className="terrain-row">
        <div className="terrain-color-chip" style={{ backgroundColor: def.color }} />
        <span className="terrain-key">{key}</span>
        {def.name !== key && <span className="terrain-name">{def.name}</span>}
        <button
          className="btn-icon btn-danger-icon"
          aria-label="Delete terrain"
          onClick={() =>
            dispatch?.({
              type: 'deleteTerrainType',
              geometry: 'hex',
              key,
            })
          }
        >
          x
        </button>
      </li>
    ))}
  </ul>
  <button
    className="btn-secondary"
    onClick={() =>
      dispatch?.({
        type: 'setTerrainType',
        geometry: 'hex',
        key: `terrain_${model.terrainDefs.size + 1}`,
        def: { style: { color: '#888888' } },
      })
    }
  >
    + Add Terrain Type
  </button>
</section>
```

**Step 4: Add CSS for terrain list**

Add to `Inspector.css`:

```css
.terrain-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.terrain-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) 0;
  font-size: var(--font-size-sm);
}

.terrain-color-chip {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
}

.terrain-key {
  color: var(--text-primary);
  font-family: var(--font-mono);
  flex: 1;
}

.terrain-name {
  color: var(--text-muted);
  font-size: var(--font-size-xs, 10px);
}

.btn-danger-icon {
  color: var(--text-muted);
  font-size: 10px;
  padding: 2px 4px;
  opacity: 0.5;
}

.btn-danger-icon:hover {
  color: var(--color-error);
  opacity: 1;
}
```

**Step 5: Run tests**

Run: `npx vitest run editor/src/components/Inspector.test.tsx -v`
Expected: PASS

**Step 6: Run all tests**

Run: `npx vitest run -v`
Expected: PASS

**Step 7: Commit**

```
feat(editor): add terrain vocabulary list with delete and add in Inspector
```

---

## Task 4: Terrain Type Editing -- Click to Expand Inline Editor

When the user clicks a terrain type row, it should expand to show editable fields: key (rename), name, color, and type (base/modifier). Changes dispatch `setTerrainType` (for updates) or `deleteTerrainType` + `setTerrainType` (for key rename).

**Files:**

- Modify: `editor/src/components/Inspector.tsx`
- Modify: `editor/src/components/Inspector.css`
- Modify: `editor/src/components/Inspector.test.tsx`

**Step 1: Write a failing test**

```typescript
it('dispatches setTerrainType when terrain color is changed', () => {
  const model = MapModel.load(MOCK_YAML);
  const sel: Selection = { type: 'none' };
  const dispatched: MapCommand[] = [];
  render(<Inspector selection={sel} model={model} dispatch={(cmd) => dispatched.push(cmd)} />);

  // Click "clear" to expand
  fireEvent.click(screen.getByText('clear'));

  // Find the color input (type="color")
  const colorInput = screen.getByLabelText('Terrain color');
  fireEvent.change(colorInput, { target: { value: '#ff0000' } });
  fireEvent.blur(colorInput);

  expect(dispatched.length).toBeGreaterThanOrEqual(1);
  const setCmd = dispatched.find((c) => c.type === 'setTerrainType');
  expect(setCmd).toBeDefined();
  if (setCmd?.type === 'setTerrainType') {
    expect(setCmd.key).toBe('clear');
    expect(setCmd.def.style?.color).toBe('#ff0000');
  }
});
```

**Step 2: Run tests to verify they fail**

Expected: FAIL -- clicking terrain key doesn't expand anything

**Step 3: Implement expandable terrain editor**

Add state for expanded terrain key. Since `renderMetadata` is inside a component that doesn't have local state for this, we need to either:

- Track `expandedTerrainKey` in the Inspector's parent (App.tsx) and pass it as a prop, or
- Convert the terrain list into a sub-component with its own state.

The simpler approach: add `useState` for `expandedTerrainKey` inside `Inspector`. Since Inspector is currently a pure component receiving props, we need to add a state hook. This is fine -- it's UI-only state (which terrain row is expanded), not document state.

At the top of the `Inspector` component, add:

```typescript
import { useState } from 'react';

// Inside the component:
const [expandedTerrain, setExpandedTerrain] = useState<string | null>(null);
```

Update the terrain list item to expand on click:

```tsx
<li key={key} className={`terrain-row ${expandedTerrain === key ? 'expanded' : ''}`}>
  <div
    className="terrain-row-header"
    onClick={() => setExpandedTerrain(expandedTerrain === key ? null : key)}
  >
    <div className="terrain-color-chip" style={{ backgroundColor: def.color }} />
    <span className="terrain-key">{key}</span>
    <button
      className="btn-icon btn-danger-icon"
      aria-label="Delete terrain"
      onClick={(e) => {
        e.stopPropagation();
        dispatch?.({ type: 'deleteTerrainType', geometry: 'hex', key });
        if (expandedTerrain === key) setExpandedTerrain(null);
      }}
    >
      x
    </button>
  </div>
  {expandedTerrain === key && (
    <div className="terrain-edit-form">
      <div className="inspector-row">
        <label htmlFor={`terrain-color-${key}`}>Color</label>
        <input
          id={`terrain-color-${key}`}
          type="color"
          aria-label="Terrain color"
          defaultValue={def.color}
          key={`tc-${key}-${def.color}`}
          onBlur={(e) => {
            if (e.target.value !== def.color) {
              dispatch?.({
                type: 'setTerrainType',
                geometry: 'hex',
                key,
                def: { ...buildDef(def), style: { ...def.properties, color: e.target.value } },
              });
            }
          }}
        />
      </div>
      <div className="inspector-row">
        <label>Name</label>
        <input
          type="text"
          className="inspector-input"
          defaultValue={def.name}
          key={`tn-${key}-${def.name}`}
          onBlur={(e) => {
            const newName = e.target.value || undefined;
            if (newName !== def.name) {
              dispatch?.({
                type: 'setTerrainType',
                geometry: 'hex',
                key,
                def: { ...buildDef(def), name: newName },
              });
            }
          }}
        />
      </div>
    </div>
  )}
</li>
```

Add a helper to reconstruct a `TerrainTypeDef` from a `TerrainDef`:

```typescript
const buildDef = (def: TerrainDef): TerrainTypeDef => ({
  name: def.name !== def.key ? def.name : undefined,
  style: { color: def.color },
  properties: def.properties,
});
```

Note: `TerrainDef` is from `canvas/src/model.ts`, `TerrainTypeDef` is from `core/src/format/types.ts`. Import `TerrainTypeDef` from `@hexmap/core` and `TerrainDef` from `@hexmap/canvas`.

**Step 4: Add CSS**

```css
.terrain-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.terrain-row-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) 0;
  cursor: pointer;
}

.terrain-row-header:hover {
  color: var(--accent-hex);
}

.terrain-edit-form {
  padding: var(--space-sm) 0 var(--space-sm) 20px;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  border-left: 2px solid var(--border-subtle);
}
```

**Step 5: Run tests**

Run: `npx vitest run editor/src/components/Inspector.test.tsx -v`
Expected: PASS

**Step 6: Run all tests**

Run: `npx vitest run -v`
Expected: PASS

**Step 7: Commit**

```
feat(editor): add expandable inline terrain type editor in Inspector
```

---

## Task 5: `>export` Command -- YAML Download

Add `>export yaml` and `>export json` commands that trigger a file download. Also add `Cmd+S` as a shortcut for `>export yaml`.

**Files:**

- Create: `editor/src/utils/download.ts`
- Create: `editor/src/utils/download.test.ts`
- Modify: `editor/src/App.tsx:263-276` (command handler)
- Modify: `editor/src/App.tsx` (shortcuts, add mod+s)

**Step 1: Write a failing test for the download utility**

Create `editor/src/utils/download.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadFile } from './download';

describe('downloadFile', () => {
  let clickSpy: ReturnType<typeof vi.fn>;
  let createElementSpy: ReturnType<typeof vi.spyOn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clickSpy = vi.fn();
    createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue({
      click: clickSpy,
      set href(v: string) {
        /* noop */
      },
      set download(v: string) {
        /* noop */
      },
    } as unknown as HTMLAnchorElement);
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a blob and triggers download', () => {
    downloadFile('hello', 'test.yaml', 'text/yaml');
    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run editor/src/utils/download.test.ts -v`
Expected: FAIL -- module not found

**Step 3: Implement the download utility**

Create `editor/src/utils/download.ts`:

```typescript
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

**Step 4: Run tests**

Run: `npx vitest run editor/src/utils/download.test.ts -v`
Expected: PASS

**Step 5: Commit**

```
feat(editor): add downloadFile utility for export
```

---

## Task 6: Wire `>export` Commands and `Cmd+S` Shortcut

Add the export commands to the command handler and the Cmd+S shortcut.

**Files:**

- Modify: `editor/src/App.tsx:263-276` (add export commands)
- Modify: `editor/src/App.tsx` (shortcuts)

**Step 1: Add export commands**

In `App.tsx`, import the download utility:

```typescript
import { downloadFile } from './utils/download';
```

In `handleCommandSubmit`, in the `>` command handler block, add:

```typescript
} else if (cmd === 'export yaml' || cmd === 'export') {
  const yaml = historyRef.current?.currentState.document.toString() ?? '';
  const title = model.metadata.title?.replace(/\s+/g, '-').toLowerCase() || 'hexmap';
  downloadFile(yaml, `${title}.hexmap.yaml`, 'text/yaml');
} else if (cmd === 'export json') {
  const doc = historyRef.current?.currentState.document;
  const json = JSON.stringify(doc?.toJS() ?? {}, null, 2);
  const title = model.metadata.title?.replace(/\s+/g, '-').toLowerCase() || 'hexmap';
  downloadFile(json, `${title}.hexmap.json`, 'application/json');
}
```

**Step 2: Add Cmd+S shortcut**

In the `shortcuts` useMemo, add:

```typescript
'mod+s': () => {
  const yaml = historyRef.current?.currentState.document.toString() ?? '';
  const currentModel = historyRef.current?.currentState.model;
  const title = currentModel?.metadata.title?.replace(/\s+/g, '-').toLowerCase() || 'hexmap';
  downloadFile(yaml, `${title}.hexmap.yaml`, 'text/yaml');
  historyRef.current?.markSaved();
  setHistoryVersion((v) => v + 1);
},
```

Also add `'s'` to the input guard whitelist in `useKeyboardShortcuts.ts` so Cmd+S works from inputs:

In `useKeyboardShortcuts.ts:31`:

```typescript
if (isInput && !['k', 'z', 'd', 's'].includes(key)) {
```

**Step 3: Update `markSaved` behavior**

After Cmd+S exports, call `historyRef.current?.markSaved()` to clear the dirty indicator.

`CommandHistory.markSaved()` already exists (`canvas/src/history.ts`). Verify it resets `isDirty`. It should -- the existing test `"markSaved resets isDirty"` confirms this.

**Step 4: Run all tests**

Run: `npx vitest run -v`
Expected: PASS

**Step 5: Commit**

```
feat(editor): add >export yaml/json commands and Cmd+S shortcut
```

---

## Task 7: `>export` Autocomplete in Command Bar Dropdown

When the user types `>`, show a dropdown of available commands. This mirrors the `/` search key dropdown.

**Files:**

- Modify: `editor/src/components/CommandBar.tsx`
- Modify: `editor/src/components/CommandBar.test.tsx`

**Step 1: Write a failing test**

```typescript
test('shows command dropdown when value is ">"', () => {
  render(<CommandBar value=">" onChange={() => {}} />);
  expect(screen.getByRole('listbox')).toBeDefined();
  expect(screen.getByText('export yaml')).toBeDefined();
  expect(screen.getByText('zoom fit')).toBeDefined();
  expect(screen.getByText('clear')).toBeDefined();
});

test('clicking a command in dropdown sets the value', () => {
  const onChange = vi.fn();
  render(<CommandBar value=">" onChange={onChange} />);
  fireEvent.click(screen.getByText('export yaml'));
  expect(onChange).toHaveBeenCalledWith('>export yaml');
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run editor/src/components/CommandBar.test.tsx -v`
Expected: FAIL -- no listbox rendered for `>`

**Step 3: Implement the command dropdown**

In `CommandBar.tsx`, add a command list:

```typescript
const COMMANDS = [
  { label: 'export yaml', description: 'Download as YAML' },
  { label: 'export json', description: 'Download as JSON' },
  { label: 'zoom fit', description: 'Reset viewport' },
  { label: 'clear', description: 'Clear selection' },
  { label: 'theme sandtable', description: 'Sand table theme' },
  { label: 'theme classic', description: 'Classic theme' },
];
```

Add dropdown logic:

```typescript
const commandQuery = mode === 'command' ? value.substring(1).trim().toLowerCase() : '';
const showCommandDropdown = mode === 'command' && !commandQuery;
// Or filter: show commands matching what's typed so far
const filteredCommands =
  mode === 'command' && commandQuery
    ? COMMANDS.filter((c) => c.label.startsWith(commandQuery))
    : COMMANDS;
const showCommandDropdown =
  mode === 'command' && filteredCommands.length > 0 && commandQuery.length < 20;
```

Render:

```tsx
{
  showCommandDropdown && (
    <ul className="command-dropdown" role="listbox">
      {filteredCommands.map((cmd) => (
        <li
          key={cmd.label}
          role="option"
          aria-selected={false}
          className="command-dropdown-item"
          onClick={() => onChange?.(`>${cmd.label}`)}
        >
          <span>{cmd.label}</span>
          <span className="command-hint">{cmd.description}</span>
        </li>
      ))}
    </ul>
  );
}
```

Add CSS for the hint text:

```css
.command-hint {
  color: var(--text-muted);
  font-size: 10px;
  margin-left: auto;
}
```

**Step 4: Run tests**

Run: `npx vitest run editor/src/components/CommandBar.test.tsx -v`
Expected: PASS

**Step 5: Run all tests**

Run: `npx vitest run -v`
Expected: PASS

**Step 6: Commit**

```
feat(editor): add command dropdown for > mode with available commands
```

---

## Task 8: Cmd+S Clears Dirty Indicator -- Integration Test

Write a test that verifies the full flow: make a change, verify dirty, export, verify clean.

**Files:**

- Modify: `editor/src/App.test.tsx`

**Step 1: Write the integration test**

Since we can't easily test Cmd+S in jsdom (it triggers a download), test the `markSaved` integration at the `CommandHistory` level:

```typescript
import { CommandHistory, MapModel } from '@hexmap/canvas';

test('markSaved clears dirty indicator after mutations', () => {
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

  expect(history.isDirty).toBe(false);

  history.execute({ type: 'addFeature', feature: { at: '0101' } });
  expect(history.isDirty).toBe(true);

  history.markSaved();
  expect(history.isDirty).toBe(false);

  // Undo past the save point re-dirties
  history.undo();
  expect(history.isDirty).toBe(true);
});
```

Note: This test may already exist (`canvas/src/history.test.ts` has `"markSaved resets isDirty"` and `"undo past saved point makes isDirty true again"`). If so, skip this step -- the coverage already exists.

**Step 2: Run tests**

Run: `npx vitest run -v`
Expected: PASS

**Step 3: Commit (if new tests added)**

```
test(canvas): verify markSaved integration for export dirty tracking
```

---

## Summary: Task Dependency Graph

```
Task 1: Editable metadata fields (Inspector)
Task 2: Editable layout fields (Inspector)
Task 3: Terrain vocabulary list (Inspector)
  └── Task 4: Expandable terrain editor (Inspector)
Task 5: downloadFile utility
  └── Task 6: >export commands + Cmd+S shortcut
       └── Task 7: Command dropdown for > mode
Task 8: Integration test for dirty tracking
```

Tasks 1-4 are Phase 6D (Document Editing). Tasks 5-8 are Phase 6E (Export). The two groups are independent and can be interleaved. Within each group, dependencies are sequential as shown.
