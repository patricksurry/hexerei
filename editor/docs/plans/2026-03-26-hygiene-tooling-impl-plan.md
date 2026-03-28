# Hygiene & Build Tooling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Strengthen the build pipeline to automatically detect and prevent "code smells," duplicated logic, unused exports, and architectural boundary violations. This is critical for maintaining a clean, DRY, and SOLID codebase in a multi-agent environment.

**Architecture:** We will implement a "Guardrail & Garbage Collection" strategy. Guardrails prevent bad code from entering (linting, complexity, boundaries); Garbage Collection finds and removes rot (unused code, duplication).

---

## File Structure

| Tool | Responsibility | Rule Source |
|------|----------------|-------------|
| `biome` | Unified Lint/Format | `biome.json` (Root) |
| `jscpd` | Copy-Paste Detection | `.jscpd.json` (Root) |
| `knip` | Unused exports/deps | `knip.json` (Root) |
| `dependency-cruiser` | Arch Boundaries | `.dependency-cruiser.js` (Root) |
| `ls-lint` | File naming hygiene | `.ls-lint.yml` (Root) |
| `vitest-coverage` | Code coverage | `vitest.workspace.ts` |
| `stryker` | Mutation testing | `stryker.config.json` |

---

### Task 1: Infrastructure Setup

Install all hygiene and test quality tools at the monorepo root.

- [ ] **Step 1: Install dependencies**

```bash
npm install -D @biomejs/biome jscpd knip dependency-cruiser ls-lint
npm install -D @vitest/coverage-v8 @stryker-mutator/core @stryker-mutator/vitest-runner @stryker-mutator/typescript-checker
```

- [ ] **Step 2: Initialize Biome**

```bash
npx biome init
```

Configure `biome.json` to enforce strict complexity and correctness rules (Cognitive Complexity, no-duplicate-imports, etc.).

- [ ] **Step 3: Configure jscpd**

Create `.jscpd.json`:
```json
{
  "threshold": 5,
  "reporters": ["console", "html"],
  "ignore": ["**/node_modules/**", "**/dist/**", "**/tests/**", "**/test/**", "**/*.test.ts"],
  "absolute": true
}
```

- [ ] **Step 4: Configure knip**
- [ ] **Step 4: Configure knip**

Create `knip.json`:
```json
{
  "$schema": "https://unpkg.com/knip@5/schema.json",
  "workspaces": {
    ".": {},
    "core": {},
    "canvas": {},
    "editor": {}
  }
}
```

- [ ] **Step 5: Configure Test Quality (Coverage)**

Update `vitest.workspace.ts` to include coverage thresholds:
```typescript
import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  'core',
  'canvas',
  'editor',
  {
    test: {
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        thresholds: {
          lines: 80,
          functions: 80,
          branches: 70,
          statements: 80
        }
      }
    }
  }
])
```

- [ ] **Step 6: Configure Mutation Testing (Stryker)**

Create `stryker.config.json` (targeting `core` for the first phase):
```json
{
  "$schema": "https://schema.stryker-mutator.io/stryker-config.schema.json",
  "packageManager": "npm",
  "reporters": ["html", "clear-text", "progress"],
  "testRunner": "vitest",
  "coverageAnalysis": "perTest",
  "mutate": ["core/src/**/*.ts", "!core/src/**/*.test.ts"],
  "checkers": ["typescript"],
  "tsconfigFile": "tsconfig.base.json"
}
```

- [ ] **Step 7: Configure dependency-cruiser**

Define boundaries:
- `core` cannot depend on anything.
- `canvas` depends on `core`.
- `editor` depends on `canvas` and `core`.


---

### Task 2: Port & Consolidate

Migrate existing lint/format rules to the new unified system and remove redundant configurations.

- [ ] **Step 1: Replace Prettier/ESLint with Biome (Gradual or Atomic)**

Update `package.json` scripts to use `biome check --apply .`.

- [ ] **Step 2: File Naming Enforcer**

Configure `ls-lint` to ensure all files use `kebab-case`.

---

### Task 3: The "Big Clean"

Run the tools for the first time and fix existing smells.

- [ ] **Step 1: Detect Duplication**
Run `npx jscpd .` and consolidate any duplicated logic (e.g., hex math, coordinate formatting) into `@hexmap/core`.

- [ ] **Step 2: Find Unused Code**
Run `npx knip` and remove unused exports, files, and dependencies.

- [ ] **Step 3: Validate Boundaries**
Run `npx depcruise src --config .dependency-cruiser.js` and fix any layering violations.

---

### Task 4: Governance & Agent Protocol

Ensure every agent (and human) follows the new hygiene rules.

- [ ] **Step 1: Centralize Hygiene Script**

Update root `package.json`:
```json
"scripts": {
  "hygiene": "biome check . && jscpd . && knip && ls-lint",
  "hygiene:fix": "biome check --apply . && jscpd . && knip && ls-lint"
}
```

- [ ] **Step 2: Update AGENTS.md**

Add a **Section 4: Hygiene Mandates**:
- "All changes MUST pass `npm run hygiene`."
- "No new copy-pasted code above 50 tokens."
- "Strict `kebab-case` for all new files."
- "Minimal API surface area; use `knip` to find leaked exports."

- [ ] **Step 3: Final Validation**

Run the full hygiene suite and confirm a "Clean" state.
