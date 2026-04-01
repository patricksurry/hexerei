# Type Consolidation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace inline string unions with shared named types from `@hexmap/core`, and re-export through `@hexmap/canvas` where needed by the editor.

**Architecture:** Define canonical types in core, import them everywhere else. No runtime changes — purely type-level refactor.

**Tech Stack:** TypeScript types only, no new dependencies.

---

## Audit Summary

| Type | Canonical Location | Currently Typed? | Inline Duplicates |
|------|-------------------|-----------------|-------------------|
| `GeometryType` | `core/src/hexpath/types.ts` | Yes, exported | `canvas/src/types.ts:16,27`, `canvas/src/command.ts:19,23` |
| `Orientation` | `core/src/math/hex-math.ts:109` | Yes, exported | None |
| `HexOrientation` | `core/src/math/hex-math.ts:201` | Yes, exported | None |
| `HighlightStyle` | Not defined | No | `canvas/src/types.ts:32` |
| `FeatureSide` | Not defined | No | `core/src/format/types.ts:58`, `canvas/src/types.ts:23` |
| `LayoutOrigin` | Not defined | No | `core/src/format/types.ts:15` |
| `TerrainTypeClass` | Not defined | No | `core/src/format/types.ts:39` |
| `LabelFormat` | Not defined | N/A — user-extensible, stays `string` | — |

### RFC alignment: `side` and `onesided`

Per RFC §4 (data-model.md:201,254):
- **`onesided`**: boolean on the **terrain type definition** — declares the terrain is asymmetric (e.g. cliff)
- **`side`**: attribute on the **feature** — `"left"`, `"right"`, `"both"`, `"in"`, or `"out"`
  - `left`/`right`: relative to edge direction (single edge or path right-hand rule)
  - `in`/`out`: for closed loops (regions)
  - `both`: default, applies to both sides

All 5 values are RFC-specified and correct. The type should be named `FeatureSide`.

---

### Task 1: Define missing named types in core

**Files:**
- Modify: `core/src/format/types.ts`

- [ ] **Step 1: Add `FeatureSide`, `LayoutOrigin`, `TerrainTypeClass` types**

```typescript
// Add before the interfaces that use them:
export type FeatureSide = 'both' | 'in' | 'out' | 'left' | 'right';
export type LayoutOrigin = 'top-left' | 'bottom-left' | 'top-right' | 'bottom-right';
export type TerrainTypeClass = 'base' | 'modifier';
```

- [ ] **Step 2: Update interfaces to reference named types**

In `HexMapLayout`:
```typescript
origin?: LayoutOrigin;
```

In `TerrainTypeDef`:
```typescript
type?: TerrainTypeClass;
```

In `Feature`:
```typescript
side?: FeatureSide;
```

- [ ] **Step 3: Run tests to verify no breakage**

Run: `npx vitest run`
Expected: All pass (type-only change)

- [ ] **Step 4: Commit**

```bash
git add core/src/format/types.ts
git commit -m "refactor(core): extract FeatureSide, LayoutOrigin, TerrainTypeClass named types"
```

---

### Task 2: Define `HighlightStyle` in canvas

**Files:**
- Modify: `canvas/src/types.ts`

- [ ] **Step 1: Add `HighlightStyle` type and use it**

```typescript
export type HighlightStyle = 'select' | 'hover' | 'ghost' | 'dim';
```

Update `SceneHighlight`:
```typescript
style: HighlightStyle;
```

- [ ] **Step 2: Run tests, commit**

---

### Task 3: Replace inline `GeometryType` duplicates in canvas

**Files:**
- Modify: `canvas/src/types.ts`
- Modify: `canvas/src/command.ts`

- [ ] **Step 1: Import `GeometryType` from core**

In `canvas/src/types.ts`:
```typescript
import type { GeometryType } from '@hexmap/core';
```

Replace `'hex' | 'edge' | 'vertex'` in `FeatureItem.geometryType` and `SceneHighlight.type` with `GeometryType`.

- [ ] **Step 2: Update `canvas/src/command.ts`**

Import `GeometryType` and replace inline unions in `setTerrainType` and `deleteTerrainType` command types.

- [ ] **Step 3: Import `FeatureSide` from core in canvas types**

Replace inline `'both' | 'in' | 'out' | 'left' | 'right'` in `FeatureItem.side` with `FeatureSide`.

- [ ] **Step 4: Run tests, commit**

---

### Task 4: Verify editor compiles cleanly

**Files:**
- Check: `editor/src/` (no changes expected — types flow through canvas re-exports)

- [ ] **Step 1: Run full build + tests**

Run: `npx vitest run && npx tsc --noEmit -p editor/tsconfig.json`

- [ ] **Step 2: Commit if any import adjustments needed**

---

## Out of scope

- `LabelFormat` — intentionally `string` (user-extensible format)
- `HitResult.type` / `Selection.type` — these are discriminated unions where `'none'` and `'feature'` extend beyond `GeometryType`; the inline `'hex' | 'edge' | 'vertex'` in each variant is structural, not a reusable type
- Direction names — these are array values in `DIRECTION_NAMES`, not a type used at boundaries
