# HexPath Infix Connectors Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Evolve the HexPath DSL to use explicit `-`/`~` infix connectors for connected paths, making whitespace default to jumps, and introducing `include`/`exclude` keywords for modal switches.

**Architecture:** We are updating the `HexPath` class in `@hexmap/core` to parse and resolve the new syntax. We need to implement a tokenizer-like loop that treats `-` and `~` as infix connectors, `,` and whitespace as segment separators, and modal keywords `include`/`exclude`/`fill`/`close`. Existing examples and map data will be bulk migrated.

**Tech Stack:** TypeScript, Vitest

---

### Task 1: Update HexPath Parser (Tokenizer and Keywords)

**Files:**
- Modify: `core/src/hexpath/hex-path.ts`
- Modify: `core/src/hexpath/hex-path.test.ts`

**Step 1: Write the failing tests for the new grammar keywords**
Add tests in `hex-path.test.ts` for new keywords: `include`, `exclude`, `close`, `fill` and infix connectors `-`, `~`.
Run: `npm test -- core/src/hexpath/hex-path.test.ts`
Expected: FAIL due to syntax error or incorrect routing.

**Step 2: Update HexPath.resolve() implementation**
In `hex-path.ts`:
- Change the tokenizer regex to extract `-`, `~`, `include`, `exclude`, `close`, `~close`, `fill`, `~fill`.
- Handle whitespace/`,` as segment separators (jumps).
- Use a `pendingConnector` state (`None`, `Standard`, `Flipped`).
- Implement the split logic for `exclude`.
- Implement order preservation and proper modal tracking.

**Step 3: Run test to verify it passes**
Run: `npm test -- core/src/hexpath/hex-path.test.ts`
Expected: PASS (new tests should pass, old ones using old syntax might fail, but wait, we need to migrate the tests in the next step). Actually, just fix `hex-path.ts` and ensure the tests for the *new* logic work.

**Step 4: Commit**
```bash
git add core/src/hexpath/hex-path.ts core/src/hexpath/hex-path.test.ts
git commit -m "feat(core): implement infix connectors and modal keywords for HexPath"
```

### Task 2: Migrate Core Tests to New Syntax

**Files:**
- Modify: `core/src/hexpath/hex-path.test.ts`

**Step 1: Update all test paths in hex-path.test.ts**
Convert paths:
- `"0101 0105"` -> `"0101 - 0105"`
- `"0101 0401 0411 0111 !"` -> `"0101 - 0401 - 0411 - 0111 fill"`
- `+` / `-` modes -> `include` / `exclude`
- Whitespace as jumps.

**Step 2: Run test to verify passes**
Run: `npm test -- core/src/hexpath/hex-path.test.ts`
Expected: PASS

**Step 3: Commit**
```bash
git add core/src/hexpath/hex-path.test.ts
git commit -m "test(core): migrate HexPath tests to new infix syntax"
```

### Task 3: Migrate Maps, Examples and Previews

**Files:**
- Modify: `maps/definitions/*.yaml`
- Modify: `editor/public/maps/*.yaml`
- Modify: `rfc/examples/snippets/*.yaml`
- Modify: `editor/src/model/hex-path-preview.ts`

**Step 1: Write migration script or run bulk replacements**
Create a small Node script or use bash to find-and-replace `at:` hexpath strings in YAMLs according to the conversion rules.

**Step 2: Update hex-path-preview.ts serialization**
Update `editor/src/model/hex-path-preview.ts` to emit `-` for connected paths.

**Step 3: Run all tests**
Run: `npm test`
Expected: PASS

**Step 4: Commit**
```bash
git add .
git commit -m "chore: bulk migrate maps and editor previews to new HexPath syntax"
```

### Task 4: Update Documentation

**Files:**
- Modify: `rfc/sections/06-hexpath.md`

**Step 1: Rewrite section 6**
Update "Connectivity and Operators" to document infix connectors, separator semantics, `include`/`exclude`. Add Formal Evaluation Model.

**Step 2: Update all examples**
Ensure all examples use new syntax.

**Step 3: Commit**
```bash
git add rfc/sections/06-hexpath.md
git commit -m "docs(rfc): update HexPath spec for infix syntax"
```
