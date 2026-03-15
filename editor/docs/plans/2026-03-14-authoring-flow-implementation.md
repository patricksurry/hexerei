# Authoring Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the authoring loop — users can create, edit, and delete features through the Inspector, with undo/redo, backed by the command-based mutation layer.

**Architecture:** All mutations flow through `MapCommand` → `executeCommand()` → `CommandHistory`. The UX layer dispatches commands and subscribes to state. `HexMapDocument` provides comment-preserving YAML mutation methods. `MapModel` is rebuilt from the mutated document after each command.

**Tech Stack:** TypeScript, Vitest, React 18, `yaml` library (CST-preserving), `@hexmap/core`, `@hexmap/canvas`

**Design docs:**
- [Authoring UX Workshop](2026-03-10-authoring-ux-workshop.md)
- [API Surface Design](2026-03-12-api-surface-design.md)
- [Visual Identity](2026-03-11-visual-identity-sandtable.md)

---

## Pre-flight: Current State

- 198 tests pass across core/canvas/editor
- `MapCommand` type and `CommandHistory` class exist but `executeCommand()` is a stub
- `undo()`/`redo()` are stubs returning `null`
- `buildScene()` takes 5 positional args; `SceneOptions` interface exists but isn't consumed — CanvasHost uses `as any` cast, silently dropping highlights at runtime
- `HexMapDocument` has `addFeature()` and `setMetadata()` but no `deleteFeature()`, `updateFeature()`, `reorderFeature()`, or `getFeatures()`
- `MapModel` reaches into raw YAML AST via `doc.raw.get()` instead of using typed accessors
- Inspector and FeatureStack accept `dispatch` prop but never use it

---

## Task 1: HexMapDocument — Add Missing Mutation Methods

The command executor needs document-level methods for all five command types. Currently `HexMapDocument` only has `addFeature()` and `setMetadata()`/`setLayout()`.

**Files:**
- Modify: `core/src/format/document.ts:70-75`
- Modify: `core/src/format/document.test.ts`

**Step 1: Write failing tests for getFeatures, deleteFeature, updateFeature, reorderFeature**

```typescript
// In document.test.ts, add to existing describe block:

test('getFeatures returns all features as typed array', () => {
  const doc = new HexMapDocument(SAMPLE_YAML_WITH_FEATURES);
  const features = doc.getFeatures();
  expect(features).toHaveLength(2);
  expect(features[0].at).toBe('@all');
  expect(features[1].terrain).toBe('forest');
});

test('deleteFeature removes feature at index', () => {
  const doc = new HexMapDocument(SAMPLE_YAML_WITH_FEATURES);
  const deleted = doc.deleteFeature(1);
  expect(deleted.terrain).toBe('forest');
  expect(doc.getFeatures()).toHaveLength(1);
  // Verify YAML round-trips correctly
  const reparsed = new HexMapDocument(doc.toString());
  expect(reparsed.getFeatures()).toHaveLength(1);
});

test('updateFeature merges partial changes', () => {
  const doc = new HexMapDocument(SAMPLE_YAML_WITH_FEATURES);
  doc.updateFeature(1, { label: 'Dark Forest', elevation: 3 });
  const features = doc.getFeatures();
  expect(features[1].label).toBe('Dark Forest');
  expect(features[1].elevation).toBe(3);
  expect(features[1].terrain).toBe('forest'); // unchanged fields preserved
});

test('reorderFeature moves feature from one index to another', () => {
  const doc = new HexMapDocument(SAMPLE_YAML_WITH_FEATURES);
  doc.reorderFeature(1, 0);
  const features = doc.getFeatures();
  expect(features[0].terrain).toBe('forest');
  expect(features[1].at).toBe('@all');
});
```

Use this test fixture (add near top of test file if not already present):

```typescript
const SAMPLE_YAML_WITH_FEATURES = `
hexmap: "1.0"
layout:
  orientation: flat-down
  all: "0101 0201"
terrain:
  hex:
    clear:
      style: { color: "#ffffff" }
    forest:
      style: { color: "#00ff00" }
features:
  - at: "@all"
    terrain: clear
  - at: "0201"
    terrain: forest
    label: "Target"
`;
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run core/src/format/document.test.ts -v`
Expected: FAIL — `getFeatures`, `deleteFeature`, `updateFeature`, `reorderFeature` are not defined

**Step 3: Implement the methods**

Add to `core/src/format/document.ts`, inside the `HexMapDocument` class:

```typescript
/**
 * Get all features as a typed array.
 */
getFeatures(): Feature[] {
    const featuresNode = this.doc.get('features');
    if (!featuresNode) return [];
    return (featuresNode as any).toJSON() as Feature[];
}

/**
 * Delete a feature by index. Returns the deleted feature.
 */
deleteFeature(index: number): Feature {
    const features = this.getFeatures();
    if (index < 0 || index >= features.length) {
        throw new RangeError(`Feature index ${index} out of bounds (${features.length} features)`);
    }
    const deleted = features[index];
    this.doc.deleteIn(['features', index]);
    return deleted;
}

/**
 * Update a feature by index with partial changes.
 */
updateFeature(index: number, changes: Partial<Feature>): void {
    const features = this.getFeatures();
    if (index < 0 || index >= features.length) {
        throw new RangeError(`Feature index ${index} out of bounds (${features.length} features)`);
    }
    for (const [key, value] of Object.entries(changes)) {
        if (value === undefined) {
            this.doc.deleteIn(['features', index, key]);
        } else {
            this.doc.setIn(['features', index, key], value);
        }
    }
}

/**
 * Reorder a feature from one index to another.
 */
reorderFeature(fromIndex: number, toIndex: number): void {
    const features = this.getFeatures();
    if (fromIndex < 0 || fromIndex >= features.length || toIndex < 0 || toIndex >= features.length) {
        throw new RangeError(`Feature index out of bounds`);
    }
    if (fromIndex === toIndex) return;
    const feature = this.deleteFeature(fromIndex);
    // After deletion, adjust target index
    const adjustedTo = toIndex > fromIndex ? toIndex : toIndex;
    // Re-insert at the target position
    const featuresSeq = this.doc.get('features') as any;
    featuresSeq.items.splice(adjustedTo, 0, this.doc.createNode(feature));
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run core/src/format/document.test.ts -v`
Expected: PASS

**Step 5: Commit**

```
feat(core): add getFeatures, deleteFeature, updateFeature, reorderFeature to HexMapDocument
```

---

## Task 2: HexMapDocument — Add Terrain Vocabulary Methods

The left panel (Phase 6D) and the Inspector terrain dropdown need to read/write terrain definitions. Add these now so the command layer can use them.

**Files:**
- Modify: `core/src/format/document.ts`
- Modify: `core/src/format/document.test.ts`

**Step 1: Write failing tests**

```typescript
test('getTerrain returns terrain vocabulary', () => {
  const doc = new HexMapDocument(SAMPLE_YAML_WITH_FEATURES);
  const terrain = doc.getTerrain();
  expect(terrain.hex).toBeDefined();
  expect(terrain.hex!['clear']).toBeDefined();
  expect(terrain.hex!['clear'].style?.color).toBe('#ffffff');
});

test('setTerrainType adds a new terrain definition', () => {
  const doc = new HexMapDocument(SAMPLE_YAML_WITH_FEATURES);
  doc.setTerrainType('hex', 'swamp', { style: { color: '#336633' } });
  const terrain = doc.getTerrain();
  expect(terrain.hex!['swamp'].style?.color).toBe('#336633');
});

test('deleteTerrainType removes a terrain definition', () => {
  const doc = new HexMapDocument(SAMPLE_YAML_WITH_FEATURES);
  doc.deleteTerrainType('hex', 'forest');
  const terrain = doc.getTerrain();
  expect(terrain.hex!['forest']).toBeUndefined();
  expect(terrain.hex!['clear']).toBeDefined();
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run core/src/format/document.test.ts -v`
Expected: FAIL

**Step 3: Implement the methods**

Add to `HexMapDocument`:

```typescript
import type { TerrainVocabulary, TerrainTypeDef } from './types.js';

/**
 * Get the full terrain vocabulary.
 */
getTerrain(): TerrainVocabulary {
    const terrainNode = this.doc.get('terrain');
    if (!terrainNode) return {};
    return (terrainNode as any).toJSON() as TerrainVocabulary;
}

/**
 * Set (add or update) a terrain type definition.
 */
setTerrainType(geometry: 'hex' | 'edge' | 'vertex', key: string, def: TerrainTypeDef): void {
    if (!this.doc.has('terrain')) {
        this.doc.set('terrain', this.doc.createNode({}));
    }
    if (!this.doc.hasIn(['terrain', geometry])) {
        this.doc.setIn(['terrain', geometry], this.doc.createNode({}));
    }
    this.doc.setIn(['terrain', geometry, key], def);
}

/**
 * Delete a terrain type definition.
 */
deleteTerrainType(geometry: 'hex' | 'edge' | 'vertex', key: string): void {
    if (this.doc.hasIn(['terrain', geometry, key])) {
        this.doc.deleteIn(['terrain', geometry, key]);
    }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run core/src/format/document.test.ts -v`
Expected: PASS

**Step 5: Commit**

```
feat(core): add terrain vocabulary read/write methods to HexMapDocument
```

---

## Task 3: MapModel — Add Rebuild-from-Document Factory

`executeCommand()` needs to rebuild `MapModel` after mutating the document. Currently `MapModel.load()` only accepts a YAML string. We need a method that takes an existing `HexMapDocument` and rebuilds the model without re-parsing YAML, and that also eliminates the `doc.raw.get()` usage.

**Files:**
- Modify: `canvas/src/model.ts:40-132`
- Modify: `canvas/src/model.test.ts`

**Step 1: Write failing test**

```typescript
import { HexMapDocument } from '@hexmap/core';

test('MapModel.fromDocument rebuilds model from a HexMapDocument', () => {
  const doc = new HexMapDocument(MOCK_YAML);
  const model = MapModel.fromDocument(doc);
  expect(model.metadata.title).toBe('Test Map');
  expect(model.features).toHaveLength(2);
  expect(model.features[1].label).toBe('Target');
});

test('MapModel.fromDocument reflects document mutations', () => {
  const doc = new HexMapDocument(MOCK_YAML);
  doc.addFeature({ at: '0101', terrain: 'forest', label: 'New' });
  const model = MapModel.fromDocument(doc);
  expect(model.features).toHaveLength(3);
  expect(model.features[2].label).toBe('New');
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run canvas/src/model.test.ts -v`
Expected: FAIL — `MapModel.fromDocument` is not a function

**Step 3: Implement `fromDocument`**

Add to `MapModel` in `canvas/src/model.ts`:

```typescript
/**
 * Rebuild a MapModel from an existing HexMapDocument.
 * Used by the command executor after mutations.
 */
static fromDocument(doc: HexMapDocument): MapModel {
    const mesh = HexMapLoader.load(doc.toString());
    const model = new MapModel(doc, mesh);
    model._yaml = doc.toString();
    return model;
}
```

**Step 4: Refactor constructor to use typed accessors instead of `doc.raw.get()`**

Replace the terrain-loading block (around lines 59-71) with:

```typescript
// Terrain definitions — use typed accessor
this._terrainDefs = new Map();
const terrainVocab = doc.getTerrain();
const hexTerrain = terrainVocab.hex ?? {};
for (const [key, def] of Object.entries(hexTerrain)) {
    this._terrainDefs.set(key, {
        key,
        name: def.name ?? key,
        color: def.style?.color ?? '#888888',
        properties: def.properties as Record<string, any> | undefined
    });
}
```

Replace the feature-loading block (around lines 84-123) with:

```typescript
// Features — use typed accessor
this._hexToFeatures = new Map<string, FeatureItem[]>();
const featureList = doc.getFeatures();
this._features = featureList.map((f, idx) => {
    let hexIds: string[] = [];
    if (f.at) {
        try {
            const result = meshHexPath.resolve(f.at);
            if (result.type === 'hex') {
                hexIds = result.items;
            }
        } catch (e) {
            console.warn(`MapModel: Failed to resolve feature at index ${idx}`, e);
        }
    }

    const featureItem: FeatureItem = {
        index: idx,
        terrain: f.terrain ?? '',
        label: f.label,
        id: f.id,
        tags: typeof f.tags === 'string' ? f.tags.split(/\s+/).filter(Boolean) : [],
        at: f.at,
        isBase: f.at === '@all',
        hexIds,
        elevation: f.elevation,
        properties: f.properties,
        side: f.side
    };

    for (const hid of hexIds) {
        if (!this._hexToFeatures.has(hid)) {
            this._hexToFeatures.set(hid, []);
        }
        this._hexToFeatures.get(hid)!.push(featureItem);
    }

    return featureItem;
});
```

This eliminates all `doc.raw.get()` calls from the constructor.

**Step 5: Run all tests to verify nothing broke**

Run: `npx vitest run canvas/ -v`
Expected: PASS (all canvas tests)

**Step 6: Commit**

```
refactor(canvas): add MapModel.fromDocument(), replace raw YAML access with typed accessors
```

---

## Task 4: Implement `executeCommand()`

The core mutation function — apply a command to state, return new state + inverse.

**Files:**
- Modify: `canvas/src/command.ts:21-31`
- Modify: `canvas/src/command.test.ts`

**Step 1: Write failing tests for all 5 command types**

Replace the single test in `command.test.ts` with:

```typescript
import { describe, it, expect } from 'vitest';
import { executeCommand, MapCommand, MapState } from './command.js';
import { MapModel } from './model.js';
import { HexMapDocument } from '@hexmap/core';

const MOCK_YAML = `
hexmap: "1.0"
layout:
  orientation: flat-down
  all: "0101 0201"
terrain:
  hex:
    clear: { style: { color: "#ffffff" } }
    forest: { style: { color: "#00ff00" } }
features:
  - at: "@all"
    terrain: clear
  - at: "0201"
    terrain: forest
    label: "Target"
`;

function makeState(): MapState {
  const doc = new HexMapDocument(MOCK_YAML);
  const model = MapModel.fromDocument(doc);
  return { document: doc, model };
}

describe('executeCommand', () => {
  it('addFeature appends feature and inverse is deleteFeature', () => {
    const state = makeState();
    const cmd: MapCommand = { type: 'addFeature', feature: { at: '0101', terrain: 'forest', label: 'New' } };
    const result = executeCommand(cmd, state);
    expect(result.state.model.features).toHaveLength(3);
    expect(result.state.model.features[2].label).toBe('New');
    expect(result.inverse.type).toBe('deleteFeature');
  });

  it('deleteFeature removes feature and inverse is addFeature', () => {
    const state = makeState();
    const cmd: MapCommand = { type: 'deleteFeature', index: 1 };
    const result = executeCommand(cmd, state);
    expect(result.state.model.features).toHaveLength(1);
    expect(result.inverse.type).toBe('addFeature');
    if (result.inverse.type === 'addFeature') {
      expect(result.inverse.feature.label).toBe('Target');
    }
  });

  it('updateFeature modifies fields and inverse restores them', () => {
    const state = makeState();
    const cmd: MapCommand = { type: 'updateFeature', index: 1, changes: { label: 'Dark Forest' } };
    const result = executeCommand(cmd, state);
    expect(result.state.model.features[1].label).toBe('Dark Forest');
    expect(result.inverse.type).toBe('updateFeature');
    if (result.inverse.type === 'updateFeature') {
      expect(result.inverse.changes.label).toBe('Target');
    }
  });

  it('reorderFeature moves feature and inverse restores order', () => {
    const state = makeState();
    const cmd: MapCommand = { type: 'reorderFeature', fromIndex: 1, toIndex: 0 };
    const result = executeCommand(cmd, state);
    expect(result.state.model.features[0].terrain).toBe('forest');
    expect(result.inverse.type).toBe('reorderFeature');
    if (result.inverse.type === 'reorderFeature') {
      expect(result.inverse.fromIndex).toBe(0);
      expect(result.inverse.toIndex).toBe(1);
    }
  });

  it('setMetadata updates field and inverse restores it', () => {
    const state = makeState();
    const cmd: MapCommand = { type: 'setMetadata', key: 'title', value: 'New Title' };
    const result = executeCommand(cmd, state);
    expect(result.state.model.metadata.title).toBe('New Title');
    expect(result.inverse.type).toBe('setMetadata');
  });

  it('state is not mutated — original state unchanged', () => {
    const state = makeState();
    const originalFeatureCount = state.model.features.length;
    executeCommand({ type: 'addFeature', feature: { at: '0101' } }, state);
    expect(state.model.features.length).toBe(originalFeatureCount);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run canvas/src/command.test.ts -v`
Expected: FAIL — stub doesn't mutate state

**Step 3: Implement `executeCommand`**

Replace the stub in `canvas/src/command.ts`:

```typescript
import { HexMapDocument, type HexMapMetadata, type Feature } from '@hexmap/core';
import { MapModel } from './model.js';

// ... (keep MapCommand, MapState, CommandResult type definitions unchanged)

export function executeCommand(command: MapCommand, state: MapState): CommandResult {
    // Clone document via YAML round-trip to avoid mutating original
    const doc = new HexMapDocument(state.document.toString());
    let inverse: MapCommand;

    switch (command.type) {
        case 'addFeature': {
            doc.addFeature(command.feature);
            const newFeatures = doc.getFeatures();
            inverse = { type: 'deleteFeature', index: newFeatures.length - 1 };
            break;
        }
        case 'deleteFeature': {
            const deleted = doc.deleteFeature(command.index);
            inverse = { type: 'addFeature', feature: deleted };
            break;
        }
        case 'updateFeature': {
            // Capture current values for inverse
            const currentFeatures = doc.getFeatures();
            const current = currentFeatures[command.index];
            const previousValues: Partial<Feature> = {};
            for (const key of Object.keys(command.changes) as (keyof Feature)[]) {
                previousValues[key] = current[key] as any;
            }
            doc.updateFeature(command.index, command.changes);
            inverse = { type: 'updateFeature', index: command.index, changes: previousValues };
            break;
        }
        case 'reorderFeature': {
            doc.reorderFeature(command.fromIndex, command.toIndex);
            inverse = { type: 'reorderFeature', fromIndex: command.toIndex, toIndex: command.fromIndex };
            break;
        }
        case 'setMetadata': {
            const previousValue = doc.getMetadata()[command.key];
            doc.setMetadata(command.key, command.value as any);
            inverse = { type: 'setMetadata', key: command.key, value: previousValue };
            break;
        }
    }

    const model = MapModel.fromDocument(doc);
    return { state: { document: doc, model }, inverse };
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run canvas/src/command.test.ts -v`
Expected: PASS

**Step 5: Commit**

```
feat(canvas): implement executeCommand with real document mutation and inverse generation
```

---

## Task 5: Implement `undo()` and `redo()`

**Files:**
- Modify: `canvas/src/history.ts:22-23`
- Modify: `canvas/src/history.test.ts`

**Step 1: Write failing tests**

Replace the single test in `history.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { CommandHistory } from './history.js';
import { MapModel } from './model.js';
import { HexMapDocument } from '@hexmap/core';
import type { MapState, MapCommand } from './command.js';

const MOCK_YAML = `
hexmap: "1.0"
layout:
  orientation: flat-down
  all: "0101 0201"
terrain:
  hex:
    clear: { style: { color: "#ffffff" } }
    forest: { style: { color: "#00ff00" } }
features:
  - at: "@all"
    terrain: clear
  - at: "0201"
    terrain: forest
    label: "Target"
`;

function makeState(): MapState {
  const doc = new HexMapDocument(MOCK_YAML);
  const model = MapModel.fromDocument(doc);
  return { document: doc, model };
}

describe('CommandHistory', () => {
  it('starts with no undo/redo and not dirty', () => {
    const history = new CommandHistory(makeState());
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
    expect(history.isDirty).toBe(false);
  });

  it('execute makes canUndo true and isDirty true', () => {
    const history = new CommandHistory(makeState());
    history.execute({ type: 'addFeature', feature: { at: '0101', terrain: 'forest' } });
    expect(history.canUndo).toBe(true);
    expect(history.isDirty).toBe(true);
    expect(history.currentState.model.features).toHaveLength(3);
  });

  it('undo restores previous state', () => {
    const history = new CommandHistory(makeState());
    history.execute({ type: 'addFeature', feature: { at: '0101', terrain: 'forest' } });
    const undoneState = history.undo();
    expect(undoneState).not.toBeNull();
    expect(undoneState!.model.features).toHaveLength(2);
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(true);
  });

  it('redo re-applies undone command', () => {
    const history = new CommandHistory(makeState());
    history.execute({ type: 'addFeature', feature: { at: '0101', terrain: 'forest' } });
    history.undo();
    const redoneState = history.redo();
    expect(redoneState).not.toBeNull();
    expect(redoneState!.model.features).toHaveLength(3);
    expect(history.canRedo).toBe(false);
  });

  it('execute after undo clears redo stack', () => {
    const history = new CommandHistory(makeState());
    history.execute({ type: 'addFeature', feature: { at: '0101', terrain: 'forest' } });
    history.undo();
    history.execute({ type: 'addFeature', feature: { at: '0201', terrain: 'clear', label: 'Other' } });
    expect(history.canRedo).toBe(false);
  });

  it('markSaved resets isDirty', () => {
    const history = new CommandHistory(makeState());
    history.execute({ type: 'addFeature', feature: { at: '0101', terrain: 'forest' } });
    expect(history.isDirty).toBe(true);
    history.markSaved();
    expect(history.isDirty).toBe(false);
  });

  it('undo past saved point makes isDirty true again', () => {
    const history = new CommandHistory(makeState());
    history.execute({ type: 'addFeature', feature: { at: '0101', terrain: 'forest' } });
    history.markSaved();
    history.undo();
    expect(history.isDirty).toBe(true);
  });

  it('undo returns null when nothing to undo', () => {
    const history = new CommandHistory(makeState());
    expect(history.undo()).toBeNull();
  });

  it('redo returns null when nothing to redo', () => {
    const history = new CommandHistory(makeState());
    expect(history.redo()).toBeNull();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run canvas/src/history.test.ts -v`
Expected: FAIL — `undo()` returns `null`, state not restored

**Step 3: Implement undo/redo**

Replace the `CommandHistory` class in `canvas/src/history.ts`:

```typescript
import { executeCommand, type MapCommand, type MapState } from './command.js';

export class CommandHistory {
  private undoStack: { command: MapCommand; inverse: MapCommand }[] = [];
  private redoStack: { command: MapCommand; inverse: MapCommand }[] = [];
  private _currentState: MapState;
  private savedState: MapState;

  constructor(initialState: MapState) {
    this._currentState = initialState;
    this.savedState = initialState;
  }

  get currentState(): MapState { return this._currentState; }

  execute(command: MapCommand): MapState {
    const result = executeCommand(command, this._currentState);
    this.undoStack.push({ command, inverse: result.inverse });
    this.redoStack = [];
    this._currentState = result.state;
    return this._currentState;
  }

  undo(): MapState | null {
    const entry = this.undoStack.pop();
    if (!entry) return null;
    const result = executeCommand(entry.inverse, this._currentState);
    this.redoStack.push({ command: entry.command, inverse: result.inverse });
    this._currentState = result.state;
    return this._currentState;
  }

  redo(): MapState | null {
    const entry = this.redoStack.pop();
    if (!entry) return null;
    const result = executeCommand(entry.command, this._currentState);
    this.undoStack.push({ command: entry.command, inverse: result.inverse });
    this._currentState = result.state;
    return this._currentState;
  }

  get canUndo(): boolean { return this.undoStack.length > 0; }
  get canRedo(): boolean { return this.redoStack.length > 0; }
  get isDirty(): boolean { return this._currentState !== this.savedState; }

  markSaved(): void { this.savedState = this._currentState; }
}
```

Note: `currentState` is now a private field (`_currentState`) exposed via a getter, per the API design spec.

**Step 4: Run tests to verify they pass**

Run: `npx vitest run canvas/src/history.test.ts -v`
Expected: PASS

**Step 5: Run all canvas tests**

Run: `npx vitest run canvas/ -v`
Expected: PASS

**Step 6: Commit**

```
feat(canvas): implement undo/redo in CommandHistory
```

---

## Task 6: Fix `buildScene()` to Accept `SceneOptions`

The `SceneOptions` interface exists but `buildScene()` still takes 5 positional args. CanvasHost calls it with an options object via `as any`, which means highlights and segmentPath are silently dropped at runtime.

**Files:**
- Modify: `canvas/src/scene.ts:70-76`
- Modify: `canvas/src/scene.test.ts` (update call sites)
- Modify: `editor/src/canvas/CanvasHost.tsx:85`

**Step 1: Write a test that uses the options-object API**

Add to `scene.test.ts`:

```typescript
it('buildScene accepts SceneOptions object', () => {
  const hl: SceneHighlight = {
    type: 'hex',
    hexIds: [Hex.hexId(Hex.offsetToCube(1, 1, 'flat-down'))],
    color: '#00D4FF',
    style: 'select'
  };
  const scene = buildScene(model, vp, { highlights: [hl] });
  expect(scene.highlights).toHaveLength(1);
  expect(scene.highlights[0].color).toBe('#00D4FF');
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run canvas/src/scene.test.ts -v`
Expected: FAIL — third arg treated as `background` string, highlight not rendered

**Step 3: Change `buildScene` signature**

In `canvas/src/scene.ts`, replace the function signature:

```typescript
export function buildScene(
  model: MapModel,
  viewport: ViewportState,
  options?: SceneOptions
): Scene {
  const background = options?.background ?? '#141414';
  const highlights = options?.highlights ?? [];
  const segmentPath = options?.segmentPath ?? [];
  // ... rest of function body unchanged
```

**Step 4: Update all existing call sites**

In `canvas/src/scene.test.ts`, the existing test on line 85 calls:
```typescript
const scene = buildScene(model, vp, '#141414', [hl]);
```
Change to:
```typescript
const scene = buildScene(model, vp, { background: '#141414', highlights: [hl] });
```

Update all other `buildScene` calls in tests that pass positional args (check lines 57, 68, 85, 124).

In `editor/src/canvas/CanvasHost.tsx` line 85, remove the `as any` cast:
```typescript
const scene = buildScene(model, vp, { background: theme.background, highlights, segmentPath });
```

**Step 5: Run all tests**

Run: `npx vitest run -v`
Expected: PASS (198 tests, no regressions)

**Step 6: Commit**

```
refactor(canvas): convert buildScene to SceneOptions params-object API
```

---

## Task 7: Add `MapCommand` Types for Layout and Terrain Vocabulary

The UX workshop identified missing command types needed for left-panel editing (Phase 6D). Add them now so the type system is complete.

**Files:**
- Modify: `canvas/src/command.ts` (add command variants)
- Modify: `canvas/src/command.test.ts`

**Step 1: Extend `MapCommand` union type**

In `canvas/src/command.ts`, add to the `MapCommand` union:

```typescript
import type { HexMapDocument, HexMapMetadata, HexMapLayout, Feature, TerrainTypeDef } from '@hexmap/core';

export type MapCommand =
  | { type: 'addFeature'; feature: Feature }
  | { type: 'deleteFeature'; index: number }
  | { type: 'updateFeature'; index: number; changes: Partial<Feature> }
  | { type: 'reorderFeature'; fromIndex: number; toIndex: number }
  | { type: 'setMetadata'; key: keyof HexMapMetadata; value: unknown }
  | { type: 'setLayout'; key: keyof HexMapLayout; value: unknown }
  | { type: 'setTerrainType'; geometry: 'hex' | 'edge' | 'vertex'; key: string; def: TerrainTypeDef }
  | { type: 'deleteTerrainType'; geometry: 'hex' | 'edge' | 'vertex'; key: string }
  ;
```

**Step 2: Write tests for the new command types**

```typescript
it('setLayout updates layout field', () => {
  const state = makeState();
  const result = executeCommand({ type: 'setLayout', key: 'label', value: 'CCRR' }, state);
  expect(result.state.document.getLayout().label).toBe('CCRR');
  expect(result.inverse.type).toBe('setLayout');
});

it('setTerrainType adds terrain definition', () => {
  const state = makeState();
  const result = executeCommand({
    type: 'setTerrainType', geometry: 'hex', key: 'swamp',
    def: { style: { color: '#336633' } }
  }, state);
  expect(result.state.document.getTerrain().hex!['swamp']).toBeDefined();
  expect(result.inverse.type).toBe('deleteTerrainType');
});

it('deleteTerrainType removes terrain definition', () => {
  const state = makeState();
  const result = executeCommand({
    type: 'deleteTerrainType', geometry: 'hex', key: 'forest'
  }, state);
  expect(result.state.document.getTerrain().hex!['forest']).toBeUndefined();
  expect(result.inverse.type).toBe('setTerrainType');
});
```

**Step 3: Implement the new cases in `executeCommand`**

Add to the switch in `executeCommand()`:

```typescript
case 'setLayout': {
    const previousValue = doc.getLayout()[command.key];
    doc.setLayout(command.key, command.value as any);
    inverse = { type: 'setLayout', key: command.key, value: previousValue };
    break;
}
case 'setTerrainType': {
    const terrain = doc.getTerrain();
    const existing = terrain[command.geometry]?.[command.key];
    if (existing) {
        // Updating existing — inverse restores old definition
        inverse = { type: 'setTerrainType', geometry: command.geometry, key: command.key, def: existing };
    } else {
        // Adding new — inverse deletes it
        inverse = { type: 'deleteTerrainType', geometry: command.geometry, key: command.key };
    }
    doc.setTerrainType(command.geometry, command.key, command.def);
    break;
}
case 'deleteTerrainType': {
    const terrain = doc.getTerrain();
    const existing = terrain[command.geometry]?.[command.key];
    if (!existing) {
        inverse = { type: 'deleteTerrainType', geometry: command.geometry, key: command.key };
    } else {
        inverse = { type: 'setTerrainType', geometry: command.geometry, key: command.key, def: existing };
    }
    doc.deleteTerrainType(command.geometry, command.key);
    break;
}
```

**Step 4: Run tests**

Run: `npx vitest run canvas/src/command.test.ts -v`
Expected: PASS

**Step 5: Commit**

```
feat(canvas): add setLayout, setTerrainType, deleteTerrainType command types
```

---

## Task 8: Fix `CanvasHost` — Wire `onNavigate`, Type `onHitTest`

Code review found that `onNavigate` is declared in props but never destructured or wired, and `onHitTest` uses `any` instead of `HitResult`.

**Files:**
- Modify: `editor/src/canvas/CanvasHost.tsx:15-26`

**Step 1: Fix the prop types and destructuring**

In `CanvasHostProps`, change line 20:
```typescript
onHitTest?: (result: HitResult) => void;
```

Import `HitResult` (already imported via `@hexmap/canvas` on line 6 — verify).

In the `forwardRef` destructuring on line 26, add `onNavigate`:
```typescript
({ model, highlights, segmentPath, onZoomChange, onHitTest, onCursorHex, onNavigate }, ref) => {
```

**Step 2: No new tests needed** — this is a type fix and prop wiring. The existing App.test.tsx smoke test will continue to pass.

**Step 3: Run all editor tests**

Run: `npx vitest run editor/ -v`
Expected: PASS

**Step 4: Commit**

```
fix(editor): wire onNavigate prop and type onHitTest as HitResult in CanvasHost
```

---

## Task 9: Inspector — Feature Editing Form

Transform the read-only feature view into an editable form that dispatches `updateFeature` commands.

**Files:**
- Modify: `editor/src/components/Inspector.tsx:46-76`
- Modify: `editor/src/components/Inspector.test.tsx`

**Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Inspector } from './Inspector';
import { Selection, MapModel, MapCommand } from '@hexmap/canvas';

const MOCK_YAML = `
hexmap: "1.0"
layout:
  orientation: flat-down
  all: "0101 0201"
terrain:
  hex:
    clear: { style: { color: "#ffffff" } }
    forest: { style: { color: "#00ff00" } }
features:
  - at: "@all"
    terrain: clear
  - at: "0201"
    terrain: forest
    label: "Target"
`;

describe('Inspector', () => {
  it('renders placeholder when nothing selected', () => {
    const sel: Selection = { type: 'none' };
    render(<Inspector selection={sel} model={null} />);
    expect(screen.getByText(/Loading/i)).toBeDefined();
  });

  it('renders editable form when feature is selected', () => {
    const model = MapModel.load(MOCK_YAML);
    const sel: Selection = { type: 'feature', indices: [1] };
    render(<Inspector selection={sel} model={model} />);
    const labelInput = screen.getByDisplayValue('Target');
    expect(labelInput).toBeDefined();
  });

  it('dispatches updateFeature when label is changed', () => {
    const model = MapModel.load(MOCK_YAML);
    const sel: Selection = { type: 'feature', indices: [1] };
    const dispatched: MapCommand[] = [];
    render(<Inspector selection={sel} model={model} dispatch={(cmd) => dispatched.push(cmd)} />);
    
    const labelInput = screen.getByDisplayValue('Target');
    fireEvent.change(labelInput, { target: { value: 'Dark Forest' } });
    fireEvent.blur(labelInput);
    
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].type).toBe('updateFeature');
    if (dispatched[0].type === 'updateFeature') {
      expect(dispatched[0].changes.label).toBe('Dark Forest');
    }
  });

  it('dispatches deleteFeature when delete button is clicked', () => {
    const model = MapModel.load(MOCK_YAML);
    const sel: Selection = { type: 'feature', indices: [1] };
    const dispatched: MapCommand[] = [];
    render(<Inspector selection={sel} model={model} dispatch={(cmd) => dispatched.push(cmd)} />);
    
    const deleteBtn = screen.getByText('Delete');
    fireEvent.click(deleteBtn);
    
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].type).toBe('deleteFeature');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run editor/src/components/Inspector.test.tsx -v`
Expected: FAIL — no editable inputs rendered, no Delete button

**Step 3: Implement the editable feature form**

Rewrite the `renderFeature` function in `Inspector.tsx`. The component needs to:

1. Destructure `dispatch` from props (currently omitted)
2. Show `<input>` fields for label, id, at, elevation
3. Show `<select>` for terrain (populated from `model.terrainDefs`)
4. Dispatch `updateFeature` on blur for each field
5. Show Delete and Duplicate buttons

```tsx
import { useState, useEffect } from 'react';
import type { MapCommand } from '@hexmap/canvas';
```

Update `InspectorProps`:
```tsx
interface InspectorProps {
  selection: Selection;
  model: MapModel | null;
  onSelectFeature?: (index: number) => void;
  dispatch?: (command: MapCommand) => void;
}
```

Destructure dispatch:
```tsx
export function Inspector({
  selection,
  model,
  onSelectFeature,
  dispatch,
}: InspectorProps) {
```

Replace `renderFeature`:
```tsx
const renderFeature = (indices: number[]) => {
    const featureIndex = indices[0];
    const feature = model.features[featureIndex];
    if (!feature) return <div className="inspector-content">Feature not found</div>;

    if (indices.length > 1) {
        return (
            <div className="inspector-content">
                <section className="inspector-section">
                    <h3 className="inspector-header" style={{ padding: '0 0 8px 0', marginBottom: '12px', fontSize: '10px' }}>MULTIPLE SELECTED</h3>
                    <p className="placeholder-text">{indices.length} features selected</p>
                </section>
                <div className="inspector-actions">
                    <button className="btn-danger" onClick={() => {
                        // Delete in reverse order to preserve indices
                        for (const idx of [...indices].sort((a, b) => b - a)) {
                            dispatch?.({ type: 'deleteFeature', index: idx });
                        }
                    }}>Delete ({indices.length})</button>
                </div>
            </div>
        );
    }

    const handleFieldBlur = (key: string, value: string | number | undefined) => {
        const currentValue = (feature as any)[key];
        if (value !== currentValue) {
            dispatch?.({ type: 'updateFeature', index: featureIndex, changes: { [key]: value || undefined } });
        }
    };

    const terrainKeys = Array.from(model.terrainDefs.keys());

    return (
        <div className="inspector-content">
            <section className="inspector-section">
                <h3 className="inspector-header" style={{ padding: '0 0 8px 0', marginBottom: '12px', fontSize: '10px' }}>FEATURE PROPERTIES</h3>
                <div className="inspector-row">
                    <label>Label</label>
                    <input
                        type="text"
                        className="inspector-input"
                        defaultValue={feature.label || ''}
                        key={`label-${featureIndex}-${feature.label}`}
                        onBlur={(e) => handleFieldBlur('label', e.target.value)}
                    />
                </div>
                <div className="inspector-row">
                    <label>ID</label>
                    <input
                        type="text"
                        className="inspector-input font-mono"
                        defaultValue={feature.id || ''}
                        key={`id-${featureIndex}-${feature.id}`}
                        onBlur={(e) => handleFieldBlur('id', e.target.value)}
                    />
                </div>
                <div className="inspector-row">
                    <label>Terrain</label>
                    <select
                        className="inspector-select"
                        defaultValue={feature.terrain}
                        key={`terrain-${featureIndex}-${feature.terrain}`}
                        onChange={(e) => handleFieldBlur('terrain', e.target.value)}
                    >
                        <option value="">(none)</option>
                        {terrainKeys.map(key => (
                            <option key={key} value={key}>{key}</option>
                        ))}
                    </select>
                </div>
            </section>
            <section className="inspector-section">
                <h3 className="inspector-header" style={{ padding: '0 0 8px 0', marginBottom: '12px', fontSize: '10px' }}>GEOMETRY</h3>
                <div className="inspector-row">
                    <label>At</label>
                    <input
                        type="text"
                        className="inspector-input font-mono"
                        defaultValue={feature.at}
                        key={`at-${featureIndex}-${feature.at}`}
                        onBlur={(e) => handleFieldBlur('at', e.target.value)}
                    />
                </div>
                <div className="inspector-row">
                    <label>Elevation</label>
                    <input
                        type="number"
                        className="inspector-input"
                        defaultValue={feature.elevation ?? ''}
                        key={`elevation-${featureIndex}-${feature.elevation}`}
                        onBlur={(e) => {
                            const val = e.target.value ? Number(e.target.value) : undefined;
                            handleFieldBlur('elevation', val as any);
                        }}
                    />
                </div>
            </section>
            <div className="inspector-actions">
                <button className="btn-secondary" onClick={() => {
                    const features = model.features;
                    const f = features[featureIndex];
                    dispatch?.({ type: 'addFeature', feature: { at: f.at, terrain: f.terrain, label: f.label ? f.label + ' (copy)' : undefined } });
                }}>Duplicate</button>
                <button className="btn-danger" onClick={() => dispatch?.({ type: 'deleteFeature', index: featureIndex })}>Delete</button>
            </div>
        </div>
    );
};
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run editor/src/components/Inspector.test.tsx -v`
Expected: PASS

**Step 5: Run all tests**

Run: `npx vitest run -v`
Expected: PASS

**Step 6: Commit**

```
feat(editor): implement editable Inspector form with dispatch for feature mutations
```

---

## Task 10: Feature Stack — Add Feature Button and Delete via Dispatch

**Files:**
- Modify: `editor/src/components/FeatureStack.tsx`
- Modify: `editor/src/components/FeatureStack.test.tsx`

**Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FeatureStack } from './FeatureStack';
import type { MapCommand } from '@hexmap/canvas';

describe('FeatureStack', () => {
  it('renders empty list', () => {
    const { container } = render(<FeatureStack features={[]} terrainColor={() => '#000'} />);
    expect(container).toBeDefined();
  });

  it('renders [+] button that dispatches addFeature', () => {
    const dispatched: MapCommand[] = [];
    render(<FeatureStack features={[]} terrainColor={() => '#000'} dispatch={(cmd) => dispatched.push(cmd)} />);
    const addBtn = screen.getByLabelText('Add feature');
    fireEvent.click(addBtn);
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].type).toBe('addFeature');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run editor/src/components/FeatureStack.test.tsx -v`
Expected: FAIL — no "Add feature" button

**Step 3: Implement the add button**

In `FeatureStack.tsx`, destructure `dispatch` from props and add a `[+]` button in the header:

```tsx
export function FeatureStack({
  features,
  selectedIndices = [],
  terrainColor,
  onSelect,
  onHover,
  dispatch,
}: FeatureStackProps) {
```

Update the `dispatch` prop type:
```tsx
dispatch?: (command: MapCommand) => void;
```

Add import:
```tsx
import type { FeatureItem, MapCommand } from '@hexmap/canvas';
```

Add button in the header:
```tsx
<div className="feature-stack-header">
    FEATURE STACK
    <button 
        className="btn-icon" 
        aria-label="Add feature"
        onClick={() => dispatch?.({ type: 'addFeature', feature: { at: '' } })}
    >+</button>
</div>
```

**Step 4: Run tests**

Run: `npx vitest run editor/src/components/FeatureStack.test.tsx -v`
Expected: PASS

**Step 5: Commit**

```
feat(editor): add [+] button to FeatureStack for creating features via dispatch
```

---

## Task 11: Hex Inspector — Add Feature Here Button

When a hex is selected, the Inspector should show a `[+ Add Feature Here]` button that creates a new feature at that hex's location.

**Files:**
- Modify: `editor/src/components/Inspector.tsx` (the `renderHex` function)
- Modify: `editor/src/components/Inspector.test.tsx`

**Step 1: Write failing test**

```typescript
it('hex view shows "Add Feature Here" button that dispatches addFeature', () => {
  const model = MapModel.load(MOCK_YAML);
  const hexId = '1,1,-2'; // 0101
  const sel: Selection = { type: 'hex', hexId, label: '0101' };
  const dispatched: MapCommand[] = [];
  render(<Inspector selection={sel} model={model} dispatch={(cmd) => dispatched.push(cmd)} />);
  
  const addBtn = screen.getByText('+ Add Feature Here');
  fireEvent.click(addBtn);
  
  expect(dispatched).toHaveLength(1);
  expect(dispatched[0].type).toBe('addFeature');
  if (dispatched[0].type === 'addFeature') {
    expect(dispatched[0].feature.at).toBe('0101');
  }
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run editor/src/components/Inspector.test.tsx -v`
Expected: FAIL

**Step 3: Implement the button in `renderHex`**

At the bottom of `renderHex`, replace the static `[+ Add Feature Here]` text with:

```tsx
<div className="inspector-actions">
    <button className="btn-primary" onClick={() => {
        dispatch?.({ type: 'addFeature', feature: { at: state.label } });
    }}>+ Add Feature Here</button>
</div>
```

**Step 4: Run tests**

Run: `npx vitest run editor/src/components/Inspector.test.tsx -v`
Expected: PASS

**Step 5: Commit**

```
feat(editor): add "Add Feature Here" button to hex Inspector view
```

---

## Task 12: App — Wire Undo/Redo Keyboard Shortcuts

**Files:**
- Modify: `editor/src/App.tsx` (shortcuts useMemo + dispatch function)
- Modify: `editor/src/hooks/useKeyboardShortcuts.ts:30` (allow `z` through isInput guard)

**Step 1: Add shortcuts to the existing shortcuts map in App.tsx**

In the `shortcuts` useMemo (around line 72):

```typescript
const shortcuts = useMemo(() => ({
    'mod+1': () => setLeftPanelVisible(v => !v),
    'mod+2': () => setRightPanelVisible(v => !v),
    'mod+0': () => canvasHostRef.current?.resetZoom(),
    'mod+k': () => commandBarRef.current?.focus(),
    'mod+z': () => {
        if (history) {
            const newState = history.undo();
            if (newState) setHistory(new CommandHistory(history.currentState));
        }
    },
    'mod+shift+z': () => {
        if (history) {
            const newState = history.redo();
            if (newState) setHistory(new CommandHistory(history.currentState));
        }
    },
    'escape': () => setSelection(clearSelection()),
}), [history]);
```

Note: `mod+shift+z` requires updating `useKeyboardShortcuts` to handle multi-modifier shortcuts. The current parser splits on `+` and checks for `mod` — it would need to also check `shift`.

**Step 2: Update `useKeyboardShortcuts` to support `shift` modifier**

In `useKeyboardShortcuts.ts`, update the handler:

```typescript
const handleKeyDown = (event: KeyboardEvent) => {
    const isMac = navigator.userAgent.includes('Mac');
    const modifier = isMac ? event.metaKey : event.ctrlKey;
    const key = event.key.toLowerCase();

    for (const [shortcut, handler] of Object.entries(shortcuts)) {
        const parts = shortcut.toLowerCase().split('+');
        
        const hasMod = parts.includes('mod');
        const hasShift = parts.includes('shift');
        const mainKey = parts.find(p => p !== 'mod' && p !== 'shift');

        if (hasMod === modifier && hasShift === event.shiftKey && mainKey === key) {
            const isInput = event.target instanceof HTMLInputElement || 
                          event.target instanceof HTMLTextAreaElement;
            
            if (isInput && !['k', 'z'].includes(key)) {
                continue;
            }

            event.preventDefault();
            handler();
        }
      }
    };
```

This also adds `'z'` to the input guard whitelist so Cmd+Z works even when focus is in an input field.

**Step 3: Run all tests**

Run: `npx vitest run -v`
Expected: PASS

**Step 4: Commit**

```
feat(editor): wire Cmd+Z/Cmd+Shift+Z undo/redo shortcuts
```

---

## Task 13: App — Fix Feature Creation Defaults

Per the UX workshop, new features should have no terrain, no label, just an auto-generated id. Currently `handleCommandSubmit` creates features with `terrain: 'clear'` and `label: 'New Feature'`.

**Files:**
- Modify: `editor/src/App.tsx:148`

**Step 1: Update the addFeature command in handleCommandSubmit**

Change line 148 from:
```typescript
const cmd: MapCommand = { type: 'addFeature', feature: { at: value.trim(), terrain: 'clear', label: 'New Feature' } };
```
To:
```typescript
const cmd: MapCommand = { type: 'addFeature', feature: { at: value.trim() } };
```

**Step 2: Run all tests**

Run: `npx vitest run -v`
Expected: PASS

**Step 3: Commit**

```
fix(editor): feature creation defaults to no terrain/label per UX workshop
```

---

## Task 14: Dead Code Cleanup

Address the remaining items from the code review.

**Files:**
- Modify: `editor/src/canvas/draw.ts:17` — remove `showLabels` from `DrawOptions`
- Modify: `editor/src/components/CommandBar.tsx:7-8` — remove `onFocus`/`onBlur` from props
- Modify: `editor/src/components/FeatureStack.tsx:47` — suppress drag handle
- Modify: `canvas/src/model.ts:165-167` — remove `hexIdsForFeature()`

**Step 1: Remove `DrawOptions.showLabels`**

In `draw.ts`, remove `showLabels?: boolean` from the interface and the destructured default. Replace usage:

```typescript
// Line 189: change `if (showLabels && scene.hexagons.length > 0)` to:
if (scene.hexagons.length > 0) {
```

**Step 2: Remove `onFocus`/`onBlur` from CommandBar**

In `CommandBar.tsx`, remove lines 7-8 from `CommandBarProps`, remove from destructuring (lines 22-23), and remove `onFocus` and `onBlur` from the `<input>` element (lines 98-99).

Check `CommandBar.test.tsx` for any test that references `onFocus` — update or remove.

**Step 3: Suppress drag handle**

In `FeatureStack.tsx` line 47, comment out or remove the `⋮⋮` handle:

```tsx
{/* <div className="feature-drag-handle">⋮⋮</div> */}
```

**Step 4: Remove `hexIdsForFeature()`**

In `canvas/src/model.ts`, delete the method at lines 165-167. Search for any remaining call sites (there shouldn't be any — `selection.ts` already uses `model.features[idx].hexIds`).

**Step 5: Run all tests**

Run: `npx vitest run -v`
Expected: PASS

**Step 6: Commit**

```
chore: remove dead code — showLabels, onFocus/onBlur, drag handle, hexIdsForFeature
```

---

## Task 15: Integration Smoke Test

Write a single end-to-end test that exercises the full authoring loop: create → edit → undo → redo → delete.

**Files:**
- Create: `canvas/src/integration.test.ts`

**Step 1: Write the test**

```typescript
import { describe, it, expect } from 'vitest';
import { CommandHistory } from './history.js';
import { MapModel } from './model.js';
import { HexMapDocument } from '@hexmap/core';
import type { MapCommand } from './command.js';

const MOCK_YAML = `
hexmap: "1.0"
layout:
  orientation: flat-down
  all: "0101 0201"
terrain:
  hex:
    clear: { style: { color: "#ffffff" } }
    forest: { style: { color: "#00ff00" } }
features:
  - at: "@all"
    terrain: clear
`;

describe('Authoring loop integration', () => {
  it('create → edit → undo → redo → delete roundtrip', () => {
    const doc = new HexMapDocument(MOCK_YAML);
    const model = MapModel.fromDocument(doc);
    const history = new CommandHistory({ document: doc, model });

    // 1. Create a feature
    history.execute({ type: 'addFeature', feature: { at: '0201', terrain: 'forest' } });
    expect(history.currentState.model.features).toHaveLength(2);
    expect(history.isDirty).toBe(true);

    // 2. Edit the feature
    history.execute({ type: 'updateFeature', index: 1, changes: { label: 'Enchanted Forest' } });
    expect(history.currentState.model.features[1].label).toBe('Enchanted Forest');

    // 3. Undo the edit
    history.undo();
    expect(history.currentState.model.features[1].label).toBeUndefined();

    // 4. Undo the create
    history.undo();
    expect(history.currentState.model.features).toHaveLength(1);

    // 5. Redo the create
    history.redo();
    expect(history.currentState.model.features).toHaveLength(2);

    // 6. Redo the edit
    history.redo();
    expect(history.currentState.model.features[1].label).toBe('Enchanted Forest');

    // 7. Delete the feature
    history.execute({ type: 'deleteFeature', index: 1 });
    expect(history.currentState.model.features).toHaveLength(1);

    // 8. Undo delete restores it
    history.undo();
    expect(history.currentState.model.features).toHaveLength(2);
    expect(history.currentState.model.features[1].label).toBe('Enchanted Forest');

    // 9. YAML round-trip preserves state
    const yaml = history.currentState.document.toString();
    const reparsed = MapModel.load(yaml);
    expect(reparsed.features).toHaveLength(2);
    expect(reparsed.features[1].label).toBe('Enchanted Forest');
  });

  it('setMetadata + undo roundtrip', () => {
    const doc = new HexMapDocument(MOCK_YAML);
    const model = MapModel.fromDocument(doc);
    const history = new CommandHistory({ document: doc, model });

    history.execute({ type: 'setMetadata', key: 'title', value: 'My Map' });
    expect(history.currentState.model.metadata.title).toBe('My Map');

    history.undo();
    expect(history.currentState.model.metadata.title).toBeUndefined();
  });
});
```

**Step 2: Run the test**

Run: `npx vitest run canvas/src/integration.test.ts -v`
Expected: PASS (if all previous tasks completed correctly)

**Step 3: Run full test suite**

Run: `npx vitest run -v`
Expected: All tests pass

**Step 4: Commit**

```
test(canvas): add integration test for full authoring loop roundtrip
```

---

## Summary

| Task | Package | What |
|------|---------|------|
| 1 | core | `HexMapDocument` — getFeatures, deleteFeature, updateFeature, reorderFeature |
| 2 | core | `HexMapDocument` — terrain vocabulary read/write |
| 3 | canvas | `MapModel.fromDocument()` + eliminate `doc.raw.get()` |
| 4 | canvas | Implement `executeCommand()` for all command types |
| 5 | canvas | Implement `undo()`/`redo()` in `CommandHistory` |
| 6 | canvas | Fix `buildScene()` to use `SceneOptions` params-object |
| 7 | canvas | Add `setLayout`, `setTerrainType`, `deleteTerrainType` command types |
| 8 | editor | Wire `onNavigate` prop, type `onHitTest` as `HitResult` |
| 9 | editor | Inspector — editable feature form with dispatch |
| 10 | editor | FeatureStack — [+] add feature button |
| 11 | editor | Inspector hex view — "Add Feature Here" button |
| 12 | editor | Wire Cmd+Z / Cmd+Shift+Z undo/redo |
| 13 | editor | Fix feature creation defaults (no terrain, no label) |
| 14 | all | Dead code removal sweep |
| 15 | canvas | Integration smoke test — full roundtrip |

**Dependency graph:**

```
Task 1 (HexMapDocument methods)
  └→ Task 2 (terrain vocab methods)
      └→ Task 3 (MapModel.fromDocument)
          └→ Task 4 (executeCommand)
              └→ Task 5 (undo/redo)
                  └→ Task 7 (layout + terrain commands)
                      └→ Task 15 (integration test)

Task 6 (buildScene SceneOptions) — independent, can run in parallel with 1-5

Task 8 (CanvasHost fixes) — independent

Tasks 9-11 (Inspector/FeatureStack editing) — depend on Tasks 4-5
Task 12 (undo/redo shortcuts) — depends on Task 5
Task 13 (creation defaults) — independent
Task 14 (dead code) — independent, best done last
```

Tasks 1-5 are sequential (each builds on the previous). Tasks 6, 8, 13, 14 are independent and can be parallelized.
