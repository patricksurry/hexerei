# Orientation Unification Implementation Plan (Hard Cutover)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unify grid orientation and path nudging under a single `orientation` key, introducing a `~` operator for deterministic tie-breaking and strict compass direction validation. **Backward compatibility is NOT required.**

**Architecture:** Replace the orthogonal `hex_top` and `stagger` properties with a single `orientation` property (values: `flat-down`, `flat-up`, `pointy-right`, `pointy-left`). Derive hex line tie-breaking bias (nudge) from this orientation using an epsilon shift, and allow users to flip it per segment via the `~` prefix.

**Tech Stack:** TypeScript, Node.js, JSON Schema, Vitest, React

---

### Task 1: RFC Spec Updates

**Files:**
- Modify: `rfc/sections/02-conventions.md`
- Modify: `rfc/sections/04-data-model.md`
- Modify: `rfc/sections/06-hexpath.md`
- Modify: `rfc/sections/07-geometry.md`
- Modify: `rfc/sections/11-json-schema.md`
- Modify: `rfc/sections/appendix-b-clock.md`
- Modify: `rfc/README.md`
- Modify: `rfc/examples/snippets/layout.yaml`
- Modify: `rfc/examples/minimal.json`

**Step 1: Write the failing test**
*(No automated tests for markdown specs. Proceed to implementation.)*

**Step 2: Run test to verify it fails**
N/A

**Step 3: Write minimal implementation**
Apply manual updates to replace `hex_top` and `stagger` terminology with `orientation`. Add documentation for the `~` operator, strict compass validation rules, and clock notations. Remove any references to legacy fields.

**Step 4: Run test to verify it passes**
N/A

**Step 5: Commit**

```bash
git add rfc/sections/ rfc/README.md rfc/examples/
git commit -m "docs(rfc): unify orientation, replace nudge with ~, clarify directions"
```

### Task 2: Update JSON Schema and Tests

**Files:**
- Create: `rfc/tests/samples/valid/pointy.json`
- Create: `rfc/tests/samples/invalid/old_hex_top.json`
- Modify: `rfc/tests/samples/valid/minimal.json`
- Modify: `rfc/tests/samples/valid/snippets.json`
- Modify: `rfc/tests/schema_tests/invalid_enum.yaml`
- Modify: `rfc/hexmap.schema.json`

**Step 1: Write the failing test**

```bash
cat << 'EOF' > rfc/tests/samples/valid/pointy.json
{
  "layout": {
    "orientation": "pointy-right",
    "all": []
  }
}
EOF

cat << 'EOF' > rfc/tests/samples/invalid/old_hex_top.json
{
  "layout": {
    "hex_top": "flat",
    "all": []
  }
}
EOF
```

Edit `rfc/tests/samples/valid/minimal.json` and `rfc/tests/samples/valid/snippets.json` to replace `hex_top` and `stagger` with `"orientation": "flat-down"`. Edit `rfc/tests/schema_tests/invalid_enum.yaml` to test an invalid orientation value.

**Step 2: Run test to verify it fails**

Run: `cd rfc && python run_schema_tests.py`
Expected: FAIL due to schema missing `orientation`.

**Step 3: Write minimal implementation**

Edit `rfc/hexmap.schema.json`:
- Remove `hex_top` and `stagger` from `layout.properties`.
- Add `"orientation": { "type": "string", "enum": ["flat-down", "flat-up", "pointy-right", "pointy-left"] }`.
- Update `layout.required` to include `orientation` instead of `hex_top`.

**Step 4: Run test to verify it passes**

Run: `cd rfc && python run_schema_tests.py`
Expected: PASS

**Step 5: Commit**

```bash
git add rfc/tests/ rfc/hexmap.schema.json
git commit -m "test(rfc): update JSON schema and tests for orientation field"
```

### Task 3: Core hex-math types

**Files:**
- Modify: `core/src/math/hex-math.ts`
- Modify: `core/src/math/hex-math.test.ts`

**Step 1: Write the failing test**

Edit `core/src/math/hex-math.test.ts` to add tests for `orientationTop`, `orientationStagger`, and `defaultNudge`. Update existing grid creation tests to use `Orientation` values instead of `Stagger`.

```typescript
describe('Orientation helpers', () => {
  it('maps flat-down correctly', () => {
    expect(orientationTop('flat-down')).toBe('flat');
    expect(orientationStagger('flat-down')).toBe(Stagger.Odd);
    expect(defaultNudge('flat-down')).toBe(1);
  });
  // Add other 3 orientation test blocks...
});
```

**Step 2: Run test to verify it fails**

Run: `cd core && npx vitest run src/math/hex-math.test.ts`
Expected: FAIL because helpers don't exist.

**Step 3: Write minimal implementation**

Edit `core/src/math/hex-math.ts`:
- Add `Orientation` type.
- Implement `orientationTop`, `orientationStagger`, `defaultNudge`.
- Remove `Stagger` from exported API if possible (keep internal if needed for now).
- Update `offsetToCube`, `cubeToOffset`, `createRectangularGrid` to use `Orientation` directly (breaking change).

**Step 4: Run test to verify it passes**

Run: `cd core && npx vitest run src/math/hex-math.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add core/src/math/hex-math.ts core/src/math/hex-math.test.ts
git commit -m "feat(core): add Orientation type and decomposers"
```

### Task 4: Core hexLine nudge

**Files:**
- Modify: `core/src/math/hex-math.ts`
- Modify: `core/src/math/hex-math.test.ts`

**Step 1: Write the failing test**

Edit `core/src/math/hex-math.test.ts` to add symmetry tests for `hexLine` with `nudge`.

```typescript
describe('hexLine with nudge', () => {
  it('exhibits reversal symmetry', () => {
    const a = { q: 0, r: 0, s: 0 };
    const b = { q: 1, r: -2, s: 1 };
    expect(hexLine(a, b, 1)).toEqual(hexLine(b, a, 1).reverse());
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd core && npx vitest run src/math/hex-math.test.ts`
Expected: FAIL or TS error on nudge parameter missing.

**Step 3: Write minimal implementation**

Edit `core/src/math/hex-math.ts` to add `nudge: 1 | -1 = 1` to `hexLine`. Use an epsilon shift on the interpolated coordinates before rounding.

**Step 4: Run test to verify it passes**

Run: `cd core && npx vitest run src/math/hex-math.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add core/src/math/hex-math.ts core/src/math/hex-math.test.ts
git commit -m "feat(core): add nudge parameter to hexLine"
```

### Task 5: Core HexPath validations

**Files:**
- Modify: `core/src/hexpath/hex-path.ts`
- Modify: `core/src/hexpath/hex-path.test.ts`

**Step 1: Write the failing test**

Edit `core/src/hexpath/hex-path.test.ts` to test invalid direction rejections for flat and pointy. Update `HexPathOptions` to use `orientation: Orientation` and remove `stagger`/`hexTop`.

**Step 2: Run test to verify it fails**

Run: `cd core && npx vitest run src/hexpath/hex-path.test.ts`
Expected: FAIL due to interface change and missing validation.

**Step 3: Write minimal implementation**

Edit `core/src/hexpath/hex-path.ts`:
- Update `HexPathOptions` to use `orientation: Orientation`.
- Remove legacy options.
- Update `parseDirection` to check orientation logic and throw an error for invalid directions.

**Step 4: Run test to verify it passes**

Run: `cd core && npx vitest run src/hexpath/hex-path.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add core/src/hexpath/hex-path.ts core/src/hexpath/hex-path.test.ts
git commit -m "feat(core): enforce valid directions by orientation"
```

### Task 6: Core HexPath ~ Operator

**Files:**
- Modify: `core/src/hexpath/hex-path.ts`
- Modify: `core/src/hexpath/hex-path.test.ts`

**Step 1: Write the failing test**

Edit `core/src/hexpath/hex-path.test.ts` to add tests for the `~` prefix resolving to flipped nudge vs non-flipped nudge on an ambiguous path. Add tests for `*` step prefix parsing.

**Step 2: Run test to verify it fails**

Run: `cd core && npx vitest run src/hexpath/hex-path.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

Edit `core/src/hexpath/hex-path.ts` to tokenize `~` and pass the flipped nudge to `hexLine` during `resolve()`. Support `*` steps in token stream.

**Step 4: Run test to verify it passes**

Run: `cd core && npx vitest run src/hexpath/hex-path.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add core/src/hexpath/hex-path.ts core/src/hexpath/hex-path.test.ts
git commit -m "feat(core): implement ~ prefix operator and * steps"
```

### Task 7: Loader & Mesh Update

**Files:**
- Modify: `core/src/format/loader.ts`
- Modify: `core/src/format/loader.test.ts`
- Modify: `core/src/mesh/hex-mesh.ts`

**Step 1: Write the failing test**

Edit `core/src/format/loader.test.ts` to test loading a document with `orientation: flat-down`. Remove any tests for legacy `hex_top` or `stagger` loading.

**Step 2: Run test to verify it fails**

Run: `cd core && npx vitest run src/format/loader.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

Edit `core/src/format/loader.ts` to parse `orientation` only. Remove `hex_top` and `stagger` parsing.
Edit `core/src/mesh/hex-mesh.ts` to replace `_stagger` with `_orientation`. Remove legacy getters.

**Step 4: Run test to verify it passes**

Run: `cd core && npx vitest run src/format/loader.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add core/src/format/loader.ts core/src/mesh/hex-mesh.ts core/src/format/loader.test.ts
git commit -m "feat(core): update loader and mesh to use orientation (hard cutover)"
```

### Task 8: Map files migration

**Files:**
- Modify: `maps/definitions/battle-for-moscow.hexmap.yaml`
- Modify: `editor/public/maps/battle-for-moscow.hexmap.yaml`
- Modify: `renderer/demo/public/battle-for-moscow.hexmap.yaml`

**Step 1: Write the failing test**
N/A

**Step 2: Run test to verify it fails**
N/A

**Step 3: Write minimal implementation**
Edit map files to replace `hex_top` and `stagger` with `orientation: flat-up`.

**Step 4: Run test to verify it passes**
N/A

**Step 5: Commit**

```bash
git add maps/definitions/ editor/public/maps/ renderer/demo/public/
git commit -m "chore: migrate map files to use orientation field"
```

### Task 9: Editor updates

**Files:**
- Modify: `editor/src/model/map-model.ts`
- Modify: `editor/src/model/scene.ts`
- Modify: `editor/src/components/Inspector.tsx`
- Modify: `editor/src/model/hit-test.ts`
- Modify: `editor/src/canvas/CanvasHost.tsx`

**Step 1: Write the failing test**

Run `tsc` to verify breakages when we change the interfaces.

**Step 2: Run test to verify it fails**

Run: `cd editor && npm run tsc`
Expected: FAIL (after interface change).

**Step 3: Write minimal implementation**
Edit `editor/src/model/map-model.ts` to replace `hexTop`/`stagger` in `GridConfig` with `orientation: Orientation`. Remove getter fallbacks. Update `scene.ts`, `hit-test.ts`, and `CanvasHost.tsx` to use `orientationTop`.
Edit `editor/src/components/Inspector.tsx` to replace the "Hex Top" and "Stagger" display with a single "Orientation" label.

**Step 4: Run test to verify it passes**

Run: `cd editor && npm run tsc && npx vitest run`
Expected: PASS

**Step 5: Commit**

```bash
git add editor/src/
git commit -m "feat(editor): update editor for unified orientation"
```

### Task 10: Renderer updates

**Files:**
- Modify: `renderer/src/index.ts`
- Modify: `renderer/src/renderer.test.ts`

**Step 1: Write the failing test**
N/A

**Step 2: Run test to verify it fails**

Run: `cd renderer && npm run tsc`

**Step 3: Write minimal implementation**
Edit `renderer/src/index.ts` to parse `orientation` from the layout only. Remove backward compatibility for `stagger`/`hex_top`. Update renderer math to use helpers.

**Step 4: Run test to verify it passes**

Run: `cd renderer && npm run tsc && npx vitest run`
Expected: PASS

**Step 5: Commit**

```bash
git add renderer/src/
git commit -m "feat(renderer): update renderer for orientation"
```

### Task 11: Cleanup & Spec Merge

**Files:**
- Modify: `core/src/index.ts`
- Modify: `core/src/math/hex-math.ts`

**Step 1: Write the failing test**
N/A

**Step 2: Run test to verify it fails**
N/A

**Step 3: Write minimal implementation**
Edit `core/src/index.ts` and `core/src/math/hex-math.ts` to completely remove `Stagger` and `HexOrientation` from the public API (keep internal only if strictly necessary for math, otherwise replace). Remove any remaining legacy code paths.

**Step 4: Run test to verify it passes**

Run: `cd core && npm run tsc`
Expected: PASS

**Step 5: Commit**

```bash
git add core/src/
git commit -m "chore: remove deprecated hex math exports and clean up legacy code"
```
