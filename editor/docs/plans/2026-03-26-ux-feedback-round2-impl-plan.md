# UX Feedback Round 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix TypeScript errors from the serialize refactor, enhance the inspector for @all features and terrain dropdowns, add a label priority test, and add an atom count hint.

**Architecture:** This is a collection of independent polish items. Task 1 fixes a type safety issue in `HexPathOptions`. Tasks 2–3 enhance the Inspector component's feature properties view. Task 4 upgrades the terrain `<select>` to a custom dropdown with visual swatches. Task 5 adds a missing test. Edge shift-click intermediate computation is deferred (requires new graph traversal algorithm — not a UI polish task).

**Tech Stack:** TypeScript, React, Vitest, `@hexmap/core` (HexPath), `@hexmap/canvas` (MapModel, TerrainDef), editor components

**Deferred:**
- Edge shift-click intermediate pathfinding (needs shortest-edge-path algorithm — separate design task)
- Build pipeline tooling (jscpd, knip, biome — separate infrastructure task)

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `core/src/hexpath/hex-path.ts` | Modify | Make resolved options non-optional |
| `editor/src/components/Inspector.tsx` | Modify | @all display, atom count hint, terrain dropdown |
| `editor/src/components/Inspector.css` | Modify | Styles for atom count hint and terrain select |
| `editor/src/components/TerrainSelect.tsx` | Create | Custom terrain dropdown with visual swatches |
| `editor/src/components/TerrainSelect.css` | Create | Styles for terrain dropdown |
| `editor/src/components/FeatureStack.test.tsx` | Modify | Add label priority test |

---

### Task 1: Fix `HexPathOptions` type safety

The `idToAtom` and `serialize` methods destructure `labelFormat`, `firstCol`, `firstRow` from `this.options`, but these are declared optional in `HexPathOptions`. The constructor always assigns defaults, so they're never undefined at runtime — but TypeScript doesn't know that.

**Files:**
- Modify: `core/src/hexpath/hex-path.ts:60-66`
- Test: `core/src/hexpath/hex-path.test.ts` (existing tests)

- [ ] **Step 1: Run existing tests to establish baseline**

Run: `cd /Users/psurry/hexagons/hexerei && npx vitest run core/src/hexpath/hex-path.test.ts`
Expected: PASS

- [ ] **Step 2: Split `HexPathOptions` into input and resolved types**

In `core/src/hexpath/hex-path.ts`, change the types:

```typescript
/** Options passed to HexPath constructor — all fields optional (defaults applied). */
export interface HexPathOptions {
  labelFormat?: string;
  orientation?: Hex.Orientation;
  firstCol?: number;
  firstRow?: number;
  context?: Map<string, string[]>;
}

/** Resolved options with defaults applied — non-optional fields guaranteed. */
interface ResolvedHexPathOptions {
  labelFormat: string;
  orientation: Hex.Orientation;
  firstCol: number;
  firstRow: number;
  context?: Map<string, string[]>;
}
```

Change the class property type:

```typescript
private options: ResolvedHexPathOptions;
```

The constructor already assigns all defaults, so no logic changes are needed. The `orientation` field was already required in `HexPathOptions` — making it optional in the input type is a relaxation (callers can omit it and get the default from mesh layout). This is safe because the constructor handles it:

```typescript
orientation: options?.orientation ?? layout.orientation ?? 'flat-down',
```

**Before committing:** grep for all callers that construct `HexPathOptions` to confirm none rely on `orientation` being required for type-safety:

```bash
grep -rn "HexPathOptions\|new HexPath(" core/src canvas/src editor/src --include="*.ts" --include="*.tsx"
```

All existing callers pass `orientation` explicitly, so making it optional is safe.

- [ ] **Step 3: Run tests and type-check**

Run: `cd /Users/psurry/hexagons/hexerei && npx vitest run core/src/hexpath/hex-path.test.ts`
Expected: PASS

Run: `cd /Users/psurry/hexagons/hexerei && npx tsc --noEmit -p core/tsconfig.json 2>&1 | head -30`
Expected: No new errors in hex-path.ts. Pre-existing errors in other files are OK.

- [ ] **Step 4: Commit**

```bash
git add core/src/hexpath/hex-path.ts
git commit -m "fix(core): split HexPathOptions into input/resolved types for type safety"
```

---

### Task 2: @all inspector display — read-only ID + expanded HexPath

When a feature's `at` is `@all`, show "all" as a non-editable ID and show the expanded HexPath (list of all hex labels) in the `at` field.

**Files:**
- Modify: `editor/src/components/Inspector.tsx:359-415`

- [ ] **Step 1: Import HexPath**

At the top of `Inspector.tsx`, add:

```typescript
import { Hex, Feature, TerrainTypeDef, HexPath } from '@hexmap/core';
```

(Add `HexPath` to the existing import from `@hexmap/core`.)

- [ ] **Step 2: Add helper to get expanded @all text**

Inside the `renderFeature` function (after `const terrainKeys = ...`, around line 357), add:

```typescript
const isAllFeature = feature.at.trim() === '@all';
let expandedAt = feature.at;
let atomCount: number | null = null;
if (model) {
  try {
    const hp = new HexPath(model.mesh, {
      labelFormat: model.grid.labelFormat,
      orientation: model.grid.orientation,
      firstCol: model.grid.firstCol,
      firstRow: model.grid.firstRow,
    });
    const resolved = hp.resolve(feature.at);
    atomCount = resolved.items.length;
    if (isAllFeature) {
      expandedAt = hp.serialize(
        resolved.items.map(id => [id]),
        resolved.type
      );
    }
  } catch {
    // If resolve fails, show raw text
  }
}
```

- [ ] **Step 3: Update the ID field for @all**

Replace the ID row (lines 375-383):

```typescript
<div className="inspector-row">
  <label>ID</label>
  {isAllFeature ? (
    <span className="font-mono">all</span>
  ) : (
    <input
      type="text"
      className="inspector-input font-mono"
      defaultValue={feature.id || ''}
      key={`id-${featureIndex}-${feature.id}`}
      onBlur={(e) => handleFieldBlur('id', e.target.value)}
    />
  )}
</div>
```

- [ ] **Step 4: Update the At field for @all + add atom count**

Replace the At row (lines 406-414):

```typescript
<div className="inspector-row">
  <label>At</label>
  <div style={{ flex: 1 }}>
    {isAllFeature ? (
      <span className="font-mono inspector-at-readonly">{expandedAt}</span>
    ) : (
      <input
        type="text"
        className="inspector-input font-mono"
        defaultValue={feature.at}
        key={`at-${featureIndex}-${feature.at}`}
        onBlur={(e) => handleFieldBlur('at', e.target.value)}
      />
    )}
    {atomCount !== null && (
      <div className="inspector-hint">
        {atomCount} {feature.geometryType === 'hex' ? 'hex' : feature.geometryType}{atomCount !== 1 ? 'es' : ''}
      </div>
    )}
  </div>
</div>
```

Note: `feature.geometryType` is already available in scope — the existing code at line 357 uses `model.terrainDefs(feature.geometryType)`. No need for a separate resolve call to determine geometry type.

- [ ] **Step 5: Add CSS for the new elements**

In `editor/src/components/Inspector.css`, add:

```css
.inspector-at-readonly {
  display: block;
  word-break: break-all;
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  max-height: 80px;
  overflow-y: auto;
}

.inspector-hint {
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 2px;
}
```

- [ ] **Step 6: Run tests**

Run: `cd /Users/psurry/hexagons/hexerei && npx vitest run`
Expected: All pass

- [ ] **Step 7: Commit**

```bash
git add editor/src/components/Inspector.tsx editor/src/components/Inspector.css
git commit -m "feat(editor): show expanded HexPath and atom count for @all features in inspector"
```

---

### Task 3: Terrain dropdown with visual swatches

Replace the plain `<select>` for feature terrain with a custom dropdown that shows `TerrainChip` swatches next to each option, matching the terrain palette rendering.

**Files:**
- Create: `editor/src/components/TerrainSelect.tsx`
- Create: `editor/src/components/TerrainSelect.css`
- Modify: `editor/src/components/Inspector.tsx:386-399`

- [ ] **Step 1: Create `TerrainSelect` component**

Create `editor/src/components/TerrainSelect.tsx`:

```typescript
import { useState, useRef, useEffect } from 'react';
import { TerrainChip } from './TerrainChip';
import type { TerrainDef } from '@hexmap/canvas';
import './TerrainSelect.css';

interface TerrainSelectProps {
  value: string;
  terrainDefs: Map<string, TerrainDef>;
  geometry: 'hex' | 'edge' | 'vertex';
  onChange: (key: string) => void;
}

export const TerrainSelect = ({ value, terrainDefs, geometry, onChange }: TerrainSelectProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const currentDef = terrainDefs.get(value);

  return (
    <div className="terrain-select" ref={ref}>
      <button
        className="terrain-select-trigger"
        onClick={() => setOpen(!open)}
        type="button"
      >
        {currentDef ? (
          <>
            <TerrainChip color={currentDef.color} geometry={geometry} />
            <span className="terrain-select-label">{value}</span>
          </>
        ) : (
          <span className="terrain-select-label terrain-select-none">(none)</span>
        )}
        <span className="terrain-select-arrow">&#9662;</span>
      </button>
      {open && (
        <ul className="terrain-select-dropdown">
          <li
            className={`terrain-select-option ${!value ? 'selected' : ''}`}
            onClick={() => { onChange(''); setOpen(false); }}
          >
            <span className="terrain-select-label terrain-select-none">(none)</span>
          </li>
          {Array.from(terrainDefs.entries()).map(([key, def]) => (
            <li
              key={key}
              className={`terrain-select-option ${key === value ? 'selected' : ''}`}
              onClick={() => { onChange(key); setOpen(false); }}
            >
              <TerrainChip color={def.color} geometry={geometry} />
              <span className="terrain-select-label">{key}</span>
              {def.name !== key && <span className="terrain-select-name">{def.name}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Create `TerrainSelect.css`**

Create `editor/src/components/TerrainSelect.css`:

```css
.terrain-select {
  position: relative;
  flex: 1;
}

.terrain-select-trigger {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  padding: 4px 8px;
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  text-align: left;
}

.terrain-select-trigger:hover {
  border-color: var(--border-focus);
}

.terrain-select-arrow {
  margin-left: auto;
  font-size: 8px;
  color: var(--text-muted);
}

.terrain-select-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 100;
  margin-top: 2px;
  padding: 4px 0;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  list-style: none;
  max-height: 200px;
  overflow-y: auto;
}

.terrain-select-option {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 4px 8px;
  cursor: pointer;
  font-size: var(--font-size-sm);
}

.terrain-select-option:hover {
  background: rgba(255, 255, 255, 0.05);
}

.terrain-select-option.selected {
  background: rgba(0, 212, 255, 0.08);
}

.terrain-select-label {
  color: var(--text-primary);
  font-family: var(--font-mono);
}

.terrain-select-none {
  color: var(--text-muted);
  font-style: italic;
  font-family: inherit;
}

.terrain-select-name {
  color: var(--text-muted);
  font-size: 10px;
  margin-left: auto;
}
```

- [ ] **Step 3: Replace `<select>` in Inspector with `TerrainSelect`**

In `editor/src/components/Inspector.tsx`, add the import:

```typescript
import { TerrainSelect } from './TerrainSelect';
```

Replace the terrain `<select>` block (lines 386-399) with:

```typescript
<div className="inspector-row">
  <label>Terrain</label>
  <TerrainSelect
    value={feature.terrain || ''}
    terrainDefs={model.terrainDefs(feature.geometryType)}
    geometry={feature.geometryType}
    onChange={(key) => handleFieldBlur('terrain', key)}
  />
</div>
```

This uses `feature.geometryType` which is already available in scope (the existing `terrainKeys` line uses it).

- [ ] **Step 4: Run tests**

Run: `cd /Users/psurry/hexagons/hexerei && npx vitest run`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add editor/src/components/TerrainSelect.tsx editor/src/components/TerrainSelect.css editor/src/components/Inspector.tsx
git commit -m "feat(editor): terrain dropdown with visual swatches in feature properties"
```

---

### Task 4: Add label priority test to FeatureStack

The label priority was changed to `label || id || terrain || fallback` in the serialize plan. Add a test to prevent regressions.

**Files:**
- Modify: `editor/src/components/FeatureStack.test.tsx`

- [ ] **Step 1: Write test for label priority**

Add to `editor/src/components/FeatureStack.test.tsx`:

```typescript
describe('label display priority', () => {
  const base = { isBase: false, hexIds: [], edgeIds: [], vertexIds: [], tags: [], geometryType: 'hex' as const, segments: [] };

  test('shows label when present', () => {
    const features = [
      { ...base, index: 0, terrain: 'forest', at: '0101', label: 'Woods', id: 'f1' },
    ] as FeatureItem[];
    render(<FeatureStack features={features} terrainColor={() => '#000'} />);
    expect(screen.getByText('Woods')).toBeDefined();
  });

  test('shows id when no label', () => {
    const features = [
      { ...base, index: 0, terrain: 'forest', at: '0101', id: 'river-1' },
    ] as FeatureItem[];
    render(<FeatureStack features={features} terrainColor={() => '#000'} />);
    expect(screen.getByText('river-1')).toBeDefined();
  });

  test('shows terrain when no label or id', () => {
    const features = [
      { ...base, index: 0, terrain: 'forest', at: '0101' },
    ] as FeatureItem[];
    render(<FeatureStack features={features} terrainColor={() => '#000'} />);
    expect(screen.getByText('forest')).toBeDefined();
  });

  test('shows fallback when nothing else', () => {
    const features = [
      { ...base, index: 0, terrain: '', at: '0101' },
    ] as FeatureItem[];
    render(<FeatureStack features={features} terrainColor={() => '#000'} />);
    expect(screen.getByText('Feature 0')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd /Users/psurry/hexagons/hexerei && npx vitest run editor/src/components/FeatureStack.test.tsx`
Expected: PASS (the implementation is already correct)

- [ ] **Step 3: Commit**

```bash
git add editor/src/components/FeatureStack.test.tsx
git commit -m "test(editor): add label priority tests for FeatureStack"
```

---

## Summary

After all tasks:

1. `HexPathOptions` split into input/resolved types — no more TS errors in `idToAtom`/`serialize`
2. @all features show "all" as read-only ID + expanded hex labels in `at` field
3. Atom count hint displayed under `at` field for all features
4. Terrain dropdown uses visual swatches (TerrainChip) matching palette style
5. Label priority (label > id > terrain > fallback) has regression test coverage
