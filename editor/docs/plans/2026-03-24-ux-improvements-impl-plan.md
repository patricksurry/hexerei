# Editor UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the editor from "functional prototype" to "polished, discoverable tool" by fixing bugs, completing the sandtable visual identity, improving discoverability, and refining interaction patterns.

**Architecture:** Changes are primarily in the editor UI layer (`editor/src/`). No changes to `@hexmap/core` or `@hexmap/canvas` libraries except where noted for the segment-aware highlight rendering. All CSS changes use the existing design token system. New components are small and focused.

**Tech Stack:** React, TypeScript, Vitest, CSS custom properties, Canvas 2D

**Design Spec:** `editor/docs/plans/2026-03-24-ux-review.md`

**Test runner:** `cd editor && npx vitest run` (or specific file: `npx vitest run src/components/StatusBar.test.tsx`)

**Deferred (separate discussions):**
- first_col/first_row interaction with @all and orientation
- Zoom performance deep-dive (may become its own phase)
- Edge/vertex hit-testing in pointy orientations (needs investigation in @hexmap/canvas library)
- Merge features command (future feature)
- Canvas hover glow on hex-under-cursor (polish — add after core UX is solid)
- Live label preview in NewMapDialog (depends on first_col/first_row resolution)

---

## Phase 1: Bug Fixes

Foundational fixes that everything else builds on. No visual changes — just correctness.

### Task 1.1: Fix undefined CSS variables in NewMapDialog

**Files:**
- Modify: `editor/src/components/NewMapDialog.css`
- Modify: `editor/src/components/Inspector.css:182`

The NewMapDialog and Inspector reference CSS variables (`--bg-panel`, `--bg-input`, `--bg-hover`, `--border-color`) that don't exist in any theme file. Replace with design-system equivalents.

- [ ] **Step 1: Fix NewMapDialog.css variables**

In `NewMapDialog.css`, replace:
- Line 15: `--bg-panel` → `--bg-elevated`
- Line 20: `--border-color` → `--border-subtle`
- Line 49: `--bg-input` → `--bg-surface`
- Line 50: `--border-color` → `--border-focus`
- Line 77: `--bg-hover` → `--bg-elevated`

- [ ] **Step 2: Fix Inspector.css variable**

In `Inspector.css` line 182, replace `--bg-panel` → `--bg-elevated` in the `.terrain-color-chip.active` box-shadow.

- [ ] **Step 3: Verify visually**

Run: `cd editor && npm run dev`
Open browser, create a new map. Verify the dialog has visible background, borders, and form inputs.

- [ ] **Step 4: Commit**

```bash
git add editor/src/components/NewMapDialog.css editor/src/components/Inspector.css
git commit -m "fix(editor): replace undefined CSS variables with design-system tokens"
```

### Task 1.2: Fix "Loading..." state on dialog cancel

**Files:**
- Modify: `editor/src/App.tsx:569`
- Modify: `editor/src/components/Inspector.tsx:29-34`

When NewMapDialog is canceled with no prior map loaded, the inspector shows "Loading..." and the app is stuck. Fix: show a welcome/empty state instead.

- [ ] **Step 1: Write failing test**

Add to `editor/src/App.test.tsx`:

```typescript
test('canceling new map dialog without existing map shows empty state, not Loading', async () => {
  // App starts with dialog open (no model)
  // Cancel the dialog
  // Inspector should NOT show "Loading..."
});
```

The exact test depends on how App.test.tsx is structured — match the existing pattern. The key assertion: after cancel, "Loading..." should not be in the document.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd editor && npx vitest run src/App.test.tsx`

- [ ] **Step 3: Fix Inspector empty state**

In `Inspector.tsx`, replace the `if (!model)` block (lines 29-34) with a welcome message instead of "Loading...":

```tsx
if (!model)
  return (
    <div className="inspector">
      <div className="inspector-header">INSPECTOR</div>
      <div className="inspector-content">
        <p className="placeholder-text">No map loaded</p>
        <p className="placeholder-text">Press Cmd+N to create or Cmd+O to open</p>
      </div>
    </div>
  );
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd editor && npx vitest run src/App.test.tsx`

- [ ] **Step 5: Commit**

```bash
git add editor/src/components/Inspector.tsx editor/src/App.test.tsx
git commit -m "fix(editor): show empty state instead of 'Loading...' when no map loaded"
```

### Task 1.3: Fix zoom display to show meaningful percentage

**Files:**
- Modify: `editor/src/canvas/CanvasHost.tsx`
- Modify: `editor/src/App.tsx:546`
- Modify: `editor/src/components/StatusBar.test.tsx`

The zoom value from `CanvasHost` is a raw pixels-per-world-unit scale factor (e.g., 23.847), not a percentage. The StatusBar appends `%` and shows excessive decimal precision (e.g., "23.847%"). We need to compute a meaningful percentage relative to the initial fit-to-extent zoom and round to integer.

- [ ] **Step 1: Investigate zoom semantics**

Read `CanvasHost.tsx` to understand:
- What `onZoomChange(zoom)` sends (line 169 in `fitExtent`, line 257 after wheel)
- What a "100%" zoom should mean (the fit-to-extent zoom level)

The initial fit zoom (from `fitExtent()`) is the baseline. The displayed percentage should be `Math.round((currentZoom / fitZoom) * 100)`.

- [ ] **Step 2: Store initial zoom as baseline**

In `CanvasHost.tsx`, add a ref to track the fit zoom:

```typescript
const fitZoomRef = useRef<number>(1);
```

In `fitExtent()`, after computing zoom (line 141-153), store it:

```typescript
fitZoomRef.current = zoom;
```

Update `onZoomChange` calls to send percentage instead of raw value:

```typescript
// In fitExtent (line 169):
if (onZoomChange) onZoomChange(100);

// In handleWheel (line 257):
if (onZoomChange) onZoomChange(Math.round((viewportRef.current.zoom / fitZoomRef.current) * 100));
```

- [ ] **Step 3: Round in App.tsx**

In `App.tsx` line 546, the value is now already an integer percentage. Ensure it's passed through:

```tsx
zoom={zoom}
```

(No change needed if already passing the state directly.)

- [ ] **Step 4: Run tests**

Run: `cd editor && npx vitest run src/components/StatusBar.test.tsx`

- [ ] **Step 5: Commit**

```bash
git add editor/src/canvas/CanvasHost.tsx editor/src/App.tsx
git commit -m "fix(editor): display zoom as percentage relative to fit-to-extent baseline"
```

### Task 1.4: Fix canvas aspect ratio on window resize

**Files:**
- Modify: `editor/src/canvas/CanvasHost.tsx`

The canvas CSS sets `width: 100%; height: 100%` but the viewport dimensions (`vp.width`, `vp.height`) are only set during `fitExtent()`. When the window resizes, the CSS stretches the canvas bitmap, distorting the aspect ratio.

- [ ] **Step 1: Add ResizeObserver to CanvasHost**

In `CanvasHost.tsx`, add a ResizeObserver that updates viewport dimensions and re-renders:

```typescript
useEffect(() => {
  const container = containerRef.current;
  if (!container) return;

  const observer = new ResizeObserver((entries) => {
    const { width, height } = entries[0].contentRect;
    if (width > 0 && height > 0) {
      viewportRef.current = {
        ...viewportRef.current,
        width,
        height,
      };
      requestAnimationFrame(render);
    }
  });

  observer.observe(container);
  return () => observer.disconnect();
}, [model]);
```

Place this after the existing `useEffect` blocks (around line 180).

- [ ] **Step 2: Verify manually**

Run: `cd editor && npm run dev`
Resize the browser window. The map should maintain proper aspect ratio and not stretch.

- [ ] **Step 3: Commit**

```bash
git add editor/src/canvas/CanvasHost.tsx
git commit -m "fix(editor): maintain canvas aspect ratio on window resize via ResizeObserver"
```

### Task 1.5: Fix hardcoded canvas theme values

**Files:**
- Modify: `editor/src/canvas/CanvasHost.tsx:79-90`

The `render()` function in CanvasHost has hardcoded theme values that don't match the sandtable spec. The theme object should read from the CSS custom properties defined in `theme-sandtable.css`.

- [ ] **Step 1: Create theme resolver utility**

Create `editor/src/canvas/resolve-theme.ts`:

```typescript
import { CanvasTheme } from './draw';

export function resolveCanvasTheme(): CanvasTheme {
  const style = getComputedStyle(document.documentElement);
  const get = (prop: string) => style.getPropertyValue(prop).trim();
  const getNum = (prop: string, fallback: number) => {
    const v = parseFloat(get(prop));
    return isNaN(v) ? fallback : v;
  };

  return {
    background: get('--bg-canvas') || '#080C12',
    gridStroke: get('--canvas-grid-stroke') || 'rgba(0, 180, 220, 0.18)',
    gridLineWidth: getNum('--canvas-grid-line-width', 0.75),
    terrainOpacity: getNum('--canvas-terrain-opacity', 0.6),
    labelColor: get('--canvas-label-color') || 'rgba(0, 180, 220, 0.35)',
    labelGlow: get('--text-glow') || null,
    selectionGlow: getNum('--canvas-selection-glow', 8),
    hoverGlow: getNum('--canvas-hover-glow', 4),
    featureLabelColor: get('--text-primary') || '#E6EDF3',
    featureLabelShadow: 'rgba(0,0,0,0.8)',
  };
}
```

- [ ] **Step 2: Use resolved theme in CanvasHost (cached)**

In `CanvasHost.tsx`, resolve the theme once and cache it — `render()` is called on every mouse move and wheel event, so `getComputedStyle` on every frame would be wasteful.

```typescript
import { resolveCanvasTheme } from './resolve-theme';

// Outside render(), as a ref that updates on theme change:
const canvasThemeRef = useRef(resolveCanvasTheme());

// Re-resolve when the theme CSS class changes (detected via the model/highlights deps):
useEffect(() => {
  canvasThemeRef.current = resolveCanvasTheme();
}, []);  // Also re-resolve on theme change — listen for class mutations or pass theme prop

// Inside render():
const theme = canvasThemeRef.current;
```

To handle theme switching (`>theme sandtable` / `>theme classic`), add the theme name as a prop to CanvasHost or re-resolve in the existing render-trigger effect. The simplest approach: add `theme` to the CanvasHost props and re-resolve in the effect that fires on prop changes.

- [ ] **Step 3: Verify visually**

Run dev server. The canvas should now use the sandtable colors (deep navy background, teal grid lines, teal labels) instead of the hardcoded gray values.

- [ ] **Step 4: Commit**

```bash
git add editor/src/canvas/resolve-theme.ts editor/src/canvas/CanvasHost.tsx
git commit -m "fix(editor): resolve canvas theme from CSS custom properties instead of hardcoded values"
```

---

## Phase 2: Visual Identity Completion

Apply the sandtable design system consistently across all components.

### Task 2.1: Restyle NewMapDialog with sandtable system

**Files:**
- Modify: `editor/src/components/NewMapDialog.css`

Now that the CSS variables are fixed (Task 1.1), apply the full sandtable treatment.

- [ ] **Step 1: Update dialog overlay**

```css
.new-map-dialog-overlay {
  background: rgba(0, 0, 0, 0.7); /* darker backdrop */
}
```

- [ ] **Step 2: Update dialog panel**

```css
.new-map-dialog {
  background: var(--bg-elevated);
  border: 1px solid var(--border-accent);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5), 0 0 1px var(--accent-hex-glow);
}

.new-map-dialog h2 {
  color: var(--accent-hex);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
```

- [ ] **Step 3: Update form controls**

```css
.dialog-row input,
.dialog-row select {
  background: var(--bg-surface);
  border: 1px solid var(--border-focus);
  color: var(--text-primary);
}

.dialog-row input:focus,
.dialog-row select:focus {
  border-color: var(--accent-hex);
  outline: none;
  box-shadow: 0 0 0 1px var(--accent-hex-glow);
}
```

- [ ] **Step 4: Update button styling**

```css
.dialog-actions .btn-primary {
  background: var(--accent-hex);
  box-shadow: 0 0 8px var(--accent-hex-glow);
}

.dialog-actions .btn-secondary {
  color: var(--text-secondary);
  border: 1px solid var(--border-subtle);
}
```

- [ ] **Step 5: Commit**

```bash
git add editor/src/components/NewMapDialog.css
git commit -m "style(editor): apply sandtable design system to NewMapDialog"
```

### Task 2.2: Clean up Inspector inline style overrides

**Files:**
- Modify: `editor/src/components/Inspector.tsx`
- Modify: `editor/src/components/Inspector.css`

Every `<h3 className="inspector-header">` inside `inspector-content` has an inline style `style={{ padding: '0 0 8px 0', marginBottom: '12px', fontSize: '10px' }}`. These should use a CSS class.

- [ ] **Step 1: Add section-header class to CSS**

Add to `Inspector.css`:

```css
.inspector-section-header {
  padding: 0 0 8px 0;
  margin-bottom: 0;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--accent-hex);
  letter-spacing: 0.1em;
  border-bottom: 1px solid var(--border-accent);
}
```

- [ ] **Step 2: Replace all inline styles in Inspector.tsx**

Find every `<h3 className="inspector-header" style={{ padding: '0 0 8px 0', marginBottom: '12px', fontSize: '10px' }}>` and replace with `<h3 className="inspector-section-header">`. There are approximately 14 instances (lines 44, 222, 275, 329, 368, 412, 478, 517, 573, 612, 631, 683, 695, 722, 741).

- [ ] **Step 3: Run tests**

Run: `cd editor && npx vitest run src/components/Inspector.test.tsx`

- [ ] **Step 4: Commit**

```bash
git add editor/src/components/Inspector.tsx editor/src/components/Inspector.css
git commit -m "refactor(editor): replace inline styles with CSS class for inspector section headers"
```

### Task 2.3: Rename "Starter Palette" to "Terrain Palette"

**Files:**
- Modify: `editor/src/components/NewMapDialog.tsx:209`
- Modify: `editor/src/components/NewMapDialog.test.tsx:137`

- [ ] **Step 1: Update label**

In `NewMapDialog.tsx` line 209, change the label text from `Starter Palette:` to `Terrain Palette:`.

- [ ] **Step 2: Update test**

In `NewMapDialog.test.tsx` line 137, change `screen.getByLabelText('Starter Palette:')` to `screen.getByLabelText('Terrain Palette:')`.

- [ ] **Step 3: Run tests**

Run: `cd editor && npx vitest run src/components/NewMapDialog.test.tsx`

- [ ] **Step 4: Commit**

```bash
git add editor/src/components/NewMapDialog.tsx editor/src/components/NewMapDialog.test.tsx
git commit -m "fix(editor): rename 'Starter Palette' to 'Terrain Palette'"
```

### Task 2.4: Fix Feature Stack "+" button visual separation

**Files:**
- Modify: `editor/src/components/FeatureStack.css`
- Modify: `editor/src/components/FeatureStack.tsx:40-46`

The `+` button runs into the "FEATURE STACK" heading text.

- [ ] **Step 1: Update header CSS for flex layout**

Add to `FeatureStack.css`:

```css
.feature-stack-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.feature-stack-header .btn-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
  background: transparent;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
}

.feature-stack-header .btn-icon:hover {
  color: var(--accent-hex);
  border-color: var(--accent-hex);
  box-shadow: 0 0 4px var(--accent-hex-glow);
}
```

- [ ] **Step 2: Add tooltip to button**

In `FeatureStack.tsx`, add a title attribute to the button (line 42):

```tsx
<button
  className="btn-icon"
  aria-label="Add feature"
  title="Add empty feature"
  onClick={() => dispatch?.({ type: 'addFeature', feature: { at: '' } })}
>
  +
</button>
```

- [ ] **Step 3: Run tests**

Run: `cd editor && npx vitest run src/components/FeatureStack.test.tsx`

- [ ] **Step 4: Commit**

```bash
git add editor/src/components/FeatureStack.css editor/src/components/FeatureStack.tsx
git commit -m "style(editor): visually separate '+' button from Feature Stack heading"
```

### Task 2.5: Improve feature stack path contrast

**Files:**
- Modify: `editor/src/components/FeatureStack.tsx:82`

The `at` expression in the feature stack uses inline `rgba(0, 180, 220, 0.5)` which is too dim for path features.

- [ ] **Step 1: Remove inline color and use CSS**

In `FeatureStack.tsx` line 82, remove the inline style and rely on the CSS class:

```tsx
<div className="feature-at font-mono truncate">
```

(Remove the `style={{ color: 'rgba(0, 180, 220, 0.5)' }}` attribute.)

- [ ] **Step 2: Update CSS with better contrast**

In `FeatureStack.css`, update `.feature-at`:

```css
.feature-at {
  font-size: var(--font-size-xs);
  color: rgba(0, 180, 220, 0.7);
}
```

- [ ] **Step 3: Run tests**

Run: `cd editor && npx vitest run src/components/FeatureStack.test.tsx`

- [ ] **Step 4: Commit**

```bash
git add editor/src/components/FeatureStack.tsx editor/src/components/FeatureStack.css
git commit -m "style(editor): improve feature stack path expression contrast"
```

### Task 2.6: Fix linear hex terrain rendering (path only, no fill)

**Files:**
- Modify: `editor/src/canvas/draw.ts:102-115`

Path terrain (e.g. roads) currently renders both the hex fill AND the path line. It should only render the path line so it can visually stack with other terrain. The path should also be thicker.

- [ ] **Step 1: Verify the issue**

Check `scene.ts` to understand how path terrain hexes are added to `scene.hexagons` vs `scene.pathTerrain`. If path terrain hexes appear in both arrays, we need to skip the fill for path-flagged hexes.

Read the buildScene function in `canvas/src/scene.ts` to understand the data flow.

- [ ] **Step 2: Increase path line width**

In `draw.ts` lines 102-115, increase the path line width from 3 to 5:

```typescript
ctx.lineWidth = 5;
```

- [ ] **Step 3: Verify visually**

Create a map with road terrain, draw some roads. Verify they render as lines only without hex fills behind them. If fills still appear, the fix needs to happen in `scene.ts` to exclude path-terrain hexes from the hexagon fill pass.

- [ ] **Step 4: Commit**

```bash
git add editor/src/canvas/draw.ts
git commit -m "style(editor): thicken path terrain lines and ensure no redundant fill"
```

### Task 2.7: Add favicon

**Files:**
- Create: `editor/public/favicon.svg`
- Modify: `editor/index.html`

- [ ] **Step 1: Create SVG favicon**

Create `editor/public/favicon.svg` — a single hexagon outline in accent cyan:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <polygon points="16,2 28,9 28,23 16,30 4,23 4,9"
    fill="none" stroke="#00D4FF" stroke-width="2.5"/>
</svg>
```

- [ ] **Step 2: Add link to index.html**

In `editor/index.html`, add inside `<head>`:

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

- [ ] **Step 3: Verify**

Run dev server, check browser tab shows the cyan hex icon.

- [ ] **Step 4: Commit**

```bash
git add editor/public/favicon.svg editor/index.html
git commit -m "feat(editor): add cyan hexagon favicon matching sandtable identity"
```

---

## Phase 3: Discoverability

Make the editor learnable for new users.

### Task 3.1: Empty state / welcome screen

**Files:**
- Create: `editor/src/components/WelcomeScreen.tsx`
- Create: `editor/src/components/WelcomeScreen.css`
- Modify: `editor/src/App.tsx`

When no map is loaded, show a welcome view in the canvas area instead of a blank canvas.

- [ ] **Step 1: Write test**

Create `editor/src/components/WelcomeScreen.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import { WelcomeScreen } from './WelcomeScreen';

test('renders create and open buttons', () => {
  const onNew = vi.fn();
  const onOpen = vi.fn();
  render(<WelcomeScreen onNewMap={onNew} onOpenMap={onOpen} />);
  expect(screen.getByText(/create new map/i)).toBeInTheDocument();
  expect(screen.getByText(/open existing map/i)).toBeInTheDocument();
});

test('calls onNewMap when create button clicked', () => {
  const onNew = vi.fn();
  render(<WelcomeScreen onNewMap={onNew} onOpenMap={() => {}} />);
  fireEvent.click(screen.getByText(/create new map/i));
  expect(onNew).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd editor && npx vitest run src/components/WelcomeScreen.test.tsx`

- [ ] **Step 3: Implement WelcomeScreen**

Create `editor/src/components/WelcomeScreen.tsx`:

```tsx
import './WelcomeScreen.css';

interface WelcomeScreenProps {
  onNewMap: () => void;
  onOpenMap: () => void;
}

export const WelcomeScreen = ({ onNewMap, onOpenMap }: WelcomeScreenProps) => (
  <div className="welcome-screen">
    <div className="welcome-content">
      <h1 className="welcome-title">hexerei</h1>
      <p className="welcome-subtitle">Spatial IDE for hex maps</p>
      <div className="welcome-actions">
        <button className="welcome-btn" onClick={onNewMap}>
          Create New Map
          <span className="welcome-shortcut">Cmd+N</span>
        </button>
        <button className="welcome-btn" onClick={onOpenMap}>
          Open Existing Map
          <span className="welcome-shortcut">Cmd+O</span>
        </button>
      </div>
      <div className="welcome-hints">
        <span>Cmd+K Command Bar</span>
        <span>Cmd+S Save</span>
        <span>Cmd+Z Undo</span>
      </div>
    </div>
  </div>
);
```

Create `editor/src/components/WelcomeScreen.css` with sandtable styling:

```css
.welcome-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: var(--bg-canvas);
}

.welcome-content {
  text-align: center;
  max-width: 400px;
}

.welcome-title {
  font-family: var(--font-mono);
  font-size: 32px;
  font-weight: 300;
  color: var(--accent-hex);
  letter-spacing: 0.15em;
  text-shadow: 0 0 20px var(--accent-hex-glow);
  margin: 0 0 8px;
}

.welcome-subtitle {
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  margin: 0 0 32px;
}

.welcome-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 32px;
}

.welcome-btn {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: var(--font-size-md);
  cursor: pointer;
  transition: all 150ms ease;
}

.welcome-btn:hover {
  border-color: var(--accent-hex);
  box-shadow: 0 0 8px var(--accent-hex-glow);
}

.welcome-shortcut {
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.welcome-hints {
  display: flex;
  gap: 16px;
  justify-content: center;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
  font-family: var(--font-mono);
}
```

- [ ] **Step 4: Wire into App.tsx**

In `App.tsx`, conditionally render the WelcomeScreen instead of the CanvasHost when `model` is null:

```tsx
canvas={
  model ? (
    <CanvasHost ... />
  ) : (
    <WelcomeScreen
      onNewMap={() => setShowNewMapDialog(true)}
      onOpenMap={() => fileInputRef.current?.click()}
    />
  )
}
```

- [ ] **Step 5: Run tests**

Run: `cd editor && npx vitest run`

- [ ] **Step 6: Commit**

```bash
git add editor/src/components/WelcomeScreen.tsx editor/src/components/WelcomeScreen.css editor/src/components/WelcomeScreen.test.tsx editor/src/App.tsx
git commit -m "feat(editor): add welcome screen when no map is loaded"
```

### Task 3.2: Command bar contextual placeholder text

**Files:**
- Modify: `editor/src/components/CommandBar.tsx`
- Modify: `editor/src/App.tsx`

- [ ] **Step 1: Add placeholder prop to CommandBar**

In `CommandBar.tsx`, add a `placeholder` prop to the interface and use it instead of the hardcoded string at line 125:

```tsx
interface CommandBarProps {
  // ... existing props
  placeholder?: string;
}

// In the input element:
placeholder={placeholder || 'Type a HexPath, or > for commands, / to search, @ to jump…'}
```

- [ ] **Step 2: Pass contextual placeholder from App.tsx**

In `App.tsx`, compute the placeholder based on selection state:

```tsx
const commandBarPlaceholder = useMemo(() => {
  if (selection.type === 'hex') return `Add features at ${selection.label}, or > for commands…`;
  if (selection.type === 'feature' && model) {
    const f = model.features[selection.indices[0]];
    return f ? `Editing ${f.label || f.terrain || 'feature'}, or > for commands…` : undefined;
  }
  return undefined;
}, [selection, model]);
```

Pass it: `<CommandBar ... placeholder={commandBarPlaceholder} />`

- [ ] **Step 3: Run tests**

Run: `cd editor && npx vitest run src/components/CommandBar.test.tsx`

- [ ] **Step 4: Commit**

```bash
git add editor/src/components/CommandBar.tsx editor/src/App.tsx
git commit -m "feat(editor): add contextual placeholder text to command bar"
```

### Task 3.3: Keyboard shortcut overlay via >shortcuts command

**Files:**
- Modify: `editor/src/App.tsx` (add command handler)
- Create: `editor/src/components/ShortcutsOverlay.tsx`
- Create: `editor/src/components/ShortcutsOverlay.css`

- [ ] **Step 1: Write test**

Create `editor/src/components/ShortcutsOverlay.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { ShortcutsOverlay } from './ShortcutsOverlay';

test('renders shortcut list', () => {
  render(<ShortcutsOverlay onClose={() => {}} />);
  expect(screen.getByText(/Cmd\+N/)).toBeInTheDocument();
  expect(screen.getByText(/Cmd\+K/)).toBeInTheDocument();
});

test('closes on Escape', () => {
  const onClose = vi.fn();
  render(<ShortcutsOverlay onClose={onClose} />);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalled();
});
```

- [ ] **Step 2: Implement ShortcutsOverlay**

Create `ShortcutsOverlay.tsx` — a modal overlay listing all shortcuts in a two-column grid. Style with sandtable design system (dark overlay, accent-colored headings, monospace shortcut keys). Use the same overlay pattern as NewMapDialog.

Include all shortcuts from `useKeyboardShortcuts.ts`: Cmd+N, Cmd+O, Cmd+S, Cmd+K, Cmd+1/2/0, Cmd+Z, Cmd+Shift+Z, Cmd+D, Delete, Tab, Escape, Arrow keys.

- [ ] **Step 3: Wire into App.tsx**

Add state: `const [showShortcuts, setShowShortcuts] = useState(false);`

In command handler (around line 363), add:

```typescript
} else if (cmd === 'shortcuts' || cmd === 'keys' || cmd === 'help') {
  setShowShortcuts(true);
}
```

Render after the NewMapDialog:

```tsx
{showShortcuts && <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />}
```

- [ ] **Step 4: Run tests**

Run: `cd editor && npx vitest run`

- [ ] **Step 5: Commit**

```bash
git add editor/src/components/ShortcutsOverlay.tsx editor/src/components/ShortcutsOverlay.css editor/src/components/ShortcutsOverlay.test.tsx editor/src/App.tsx
git commit -m "feat(editor): add >shortcuts command for keyboard shortcut overlay"
```

### Task 3.4: Paint mode floating badge

**Files:**
- Create: `editor/src/components/PaintBadge.tsx`
- Create: `editor/src/components/PaintBadge.css`
- Modify: `editor/src/App.tsx`

When paint mode is active, show a floating badge near the top-left of the canvas area with the terrain color, name, and an "X" to exit.

- [ ] **Step 1: Write test**

Create `editor/src/components/PaintBadge.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { PaintBadge } from './PaintBadge';

test('renders terrain name and exit button', () => {
  render(<PaintBadge terrainKey="forest" terrainColor="#2d6a1e" onExit={() => {}} />);
  expect(screen.getByText('forest')).toBeInTheDocument();
  expect(screen.getByLabelText('Exit paint mode')).toBeInTheDocument();
});

test('calls onExit when X clicked', () => {
  const onExit = vi.fn();
  render(<PaintBadge terrainKey="forest" terrainColor="#2d6a1e" onExit={onExit} />);
  fireEvent.click(screen.getByLabelText('Exit paint mode'));
  expect(onExit).toHaveBeenCalled();
});
```

- [ ] **Step 2: Implement PaintBadge**

Small floating component positioned absolutely in the canvas container:

```tsx
import './PaintBadge.css';

interface PaintBadgeProps {
  terrainKey: string;
  terrainColor: string;
  onExit: () => void;
}

export const PaintBadge = ({ terrainKey, terrainColor, onExit }: PaintBadgeProps) => (
  <div className="paint-badge">
    <div className="paint-badge-chip" style={{ backgroundColor: terrainColor }} />
    <span className="paint-badge-label">PAINT: {terrainKey}</span>
    <button className="paint-badge-exit" aria-label="Exit paint mode" onClick={onExit}>×</button>
  </div>
);
```

Style with sandtable design system — dark background, accent border, positioned at top-left of canvas area.

- [ ] **Step 3: Wire into App.tsx**

Render the PaintBadge inside or next to the canvas slot when `paintState` is non-null. Pass `onExit={() => setPaintState(null)}`.

- [ ] **Step 4: Run tests**

Run: `cd editor && npx vitest run`

- [ ] **Step 5: Commit**

```bash
git add editor/src/components/PaintBadge.tsx editor/src/components/PaintBadge.css editor/src/components/PaintBadge.test.tsx editor/src/App.tsx
git commit -m "feat(editor): add floating paint mode badge with exit button"
```

### Task 3.5: Paint mode terrain chip tooltip

**Files:**
- Modify: `editor/src/components/Inspector.tsx:68-74`

- [ ] **Step 1: Add title attribute to terrain color chip**

In `Inspector.tsx`, the terrain color chip (around line 68) already has `title="Click to paint with this terrain"`. Verify this is present and update to be more descriptive:

```tsx
title={isPaintActive ? 'Click to exit paint mode' : 'Click to paint, double-click to edit'}
```

- [ ] **Step 2: Commit**

```bash
git add editor/src/components/Inspector.tsx
git commit -m "feat(editor): improve terrain chip tooltip for paint mode discoverability"
```

---

## Phase 4: Inspector & Palette UX

### Task 4.1: Collapsible inspector sections

**Files:**
- Modify: `editor/src/components/Inspector.tsx`
- Modify: `editor/src/components/Inspector.css`

- [ ] **Step 1: Write test**

Add to `Inspector.test.tsx`:

```typescript
test('section headers are clickable to collapse', () => {
  // Render inspector with a model
  // Click on "MAP METADATA" header
  // Verify the section content is hidden
  // Click again to expand
  // Verify content is visible
});
```

- [ ] **Step 2: Create CollapsibleSection component**

Create an inline component or extract to a small file. A `<details>/<summary>` element is the simplest approach:

```tsx
const CollapsibleSection = ({ title, children, defaultOpen = true }: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => (
  <details className="inspector-section" open={defaultOpen}>
    <summary className="inspector-section-header">{title}</summary>
    <div className="inspector-section-body">{children}</div>
  </details>
);
```

- [ ] **Step 3: Replace all inspector sections**

Replace every `<section className="inspector-section"><h3 ...>TITLE</h3>...content...</section>` pattern with `<CollapsibleSection title="TITLE">...content...</CollapsibleSection>`.

- [ ] **Step 4: Style the disclosure triangle**

Add to `Inspector.css`:

```css
.inspector-section-header {
  cursor: pointer;
  list-style: none; /* remove default triangle */
  user-select: none;
}

.inspector-section-header::before {
  content: '▸';
  display: inline-block;
  margin-right: 6px;
  font-size: 8px;
  color: var(--text-muted);
  transition: transform 150ms ease;
}

details[open] > .inspector-section-header::before {
  transform: rotate(90deg);
}

/* Safari compat */
.inspector-section-header::-webkit-details-marker {
  display: none;
}

.inspector-section-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding-top: var(--space-sm);
}
```

- [ ] **Step 5: Run tests**

Run: `cd editor && npx vitest run src/components/Inspector.test.tsx`

- [ ] **Step 6: Commit**

```bash
git add editor/src/components/Inspector.tsx editor/src/components/Inspector.css
git commit -m "feat(editor): make inspector sections collapsible"
```

### Task 4.2: Tabbed terrain sections

**Files:**
- Modify: `editor/src/components/Inspector.tsx`
- Modify: `editor/src/components/Inspector.css`

Group the three terrain sections (HEX, EDGE, VERTEX) under a single section with geometry-typed tabs.

- [ ] **Step 1: Add terrain tab state**

In Inspector, when rendering the metadata view (no selection), add tab state:

```tsx
const [terrainTab, setTerrainTab] = useState<'hex' | 'edge' | 'vertex'>('hex');
```

- [ ] **Step 2: Replace three terrain sections with tabbed interface**

Replace the three `renderTerrainSection()` calls with:

```tsx
<CollapsibleSection title="TERRAIN">
  <div className="terrain-tabs">
    {(['hex', 'edge', 'vertex'] as const).map(geo => (
      <button
        key={geo}
        className={`terrain-tab ${terrainTab === geo ? 'active' : ''} terrain-tab-${geo}`}
        onClick={() => setTerrainTab(geo)}
      >
        {geo}
      </button>
    ))}
  </div>
  {renderTerrainSection(terrainTab, `${terrainTab.toUpperCase()} TERRAIN`, model.terrainDefs(terrainTab))}
</CollapsibleSection>
```

- [ ] **Step 3: Style terrain tabs**

Add to `Inspector.css`:

```css
.terrain-tabs {
  display: flex;
  gap: 2px;
  margin-bottom: var(--space-sm);
}

.terrain-tab {
  flex: 1;
  padding: 4px 8px;
  background: transparent;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
}

.terrain-tab:hover {
  color: var(--text-secondary);
  border-color: var(--border-focus);
}

.terrain-tab.active.terrain-tab-hex {
  color: var(--accent-hex);
  border-color: var(--accent-hex);
  background: rgba(0, 212, 255, 0.08);
}

.terrain-tab.active.terrain-tab-edge {
  color: var(--accent-edge);
  border-color: var(--accent-edge);
  background: rgba(255, 68, 255, 0.08);
}

.terrain-tab.active.terrain-tab-vertex {
  color: var(--accent-vertex);
  border-color: var(--accent-vertex);
  background: rgba(255, 221, 0, 0.08);
}
```

- [ ] **Step 4: Run tests**

Run: `cd editor && npx vitest run src/components/Inspector.test.tsx`

- [ ] **Step 5: Commit**

```bash
git add editor/src/components/Inspector.tsx editor/src/components/Inspector.css
git commit -m "feat(editor): group terrain sections into geometry-typed tabs"
```

### Task 4.3: Normalize base layer display in feature stack

**Files:**
- Modify: `editor/src/components/FeatureStack.tsx`
- Modify: `editor/src/components/FeatureStack.css`

Remove the special "Base Layer" labeling and pinning. Show the base feature like any other, labeled by its `at` expression (typically `@all`).

- [ ] **Step 1: Update label logic**

In `FeatureStack.tsx` lines 51-55, change the label computation:

```tsx
const label =
  feature.label ||
  feature.terrain ||
  feature.id ||
  `Feature ${feature.index}`;
```

Remove the special `feature.isBase ? 'Base Layer' : ...` branch. The base feature will now show its terrain name (e.g., "clear") like any other feature.

- [ ] **Step 2: Remove base layer CSS pinning**

In `FeatureStack.css`, remove or simplify the `[data-base="true"]` rule (lines 46-51). Remove `order: 9999` and `margin-top: auto` — let it appear in natural stack order.

Keep a subtle visual distinction:

```css
.feature-item[data-base="true"] {
  opacity: 0.8;
}
```

- [ ] **Step 3: Run tests**

Run: `cd editor && npx vitest run src/components/FeatureStack.test.tsx`

- [ ] **Step 4: Commit**

```bash
git add editor/src/components/FeatureStack.tsx editor/src/components/FeatureStack.css
git commit -m "refactor(editor): normalize base layer display in feature stack"
```

### Task 4.4: Orientation thumbnail button bar

**Files:**
- Create: `editor/src/components/OrientationPicker.tsx`
- Create: `editor/src/components/OrientationPicker.css`
- Modify: `editor/src/components/Inspector.tsx`
- Modify: `editor/src/components/NewMapDialog.tsx`

Replace the orientation dropdown with a 2x2 grid of hex-thumbnail buttons.

- [ ] **Step 1: Write test**

Create `editor/src/components/OrientationPicker.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { OrientationPicker } from './OrientationPicker';

test('renders four orientation options', () => {
  render(<OrientationPicker value="flat-down" onChange={() => {}} />);
  expect(screen.getAllByRole('button')).toHaveLength(4);
});

test('calls onChange with selected orientation', () => {
  const onChange = vi.fn();
  render(<OrientationPicker value="flat-down" onChange={onChange} />);
  fireEvent.click(screen.getByTitle('pointy-right'));
  expect(onChange).toHaveBeenCalledWith('pointy-right');
});

test('marks current value as selected', () => {
  render(<OrientationPicker value="pointy-right" onChange={() => {}} />);
  const btn = screen.getByTitle('pointy-right');
  expect(btn.classList.contains('active')).toBe(true);
});
```

- [ ] **Step 2: Implement OrientationPicker**

Create `OrientationPicker.tsx` with a 2x2 grid. Each button contains a small inline SVG showing 3 hexes in the correct orientation. Use the sandtable accent color for the selected state.

The four orientations:
- `flat-down`: flat tops, offset rows going down
- `flat-up`: flat tops, offset rows going up
- `pointy-right`: pointy tops, offset columns going right
- `pointy-left`: pointy tops, offset columns going left

- [ ] **Step 3: Wire into Inspector and NewMapDialog**

Replace the orientation `<select>` in both components with `<OrientationPicker>`.

- [ ] **Step 4: Run all tests**

Run: `cd editor && npx vitest run`

- [ ] **Step 5: Commit**

```bash
git add editor/src/components/OrientationPicker.tsx editor/src/components/OrientationPicker.css editor/src/components/OrientationPicker.test.tsx editor/src/components/Inspector.tsx editor/src/components/NewMapDialog.tsx
git commit -m "feat(editor): replace orientation dropdown with visual thumbnail picker"
```

### Task 4.5: Origin thumbnail button bar

**Files:**
- Create: `editor/src/components/OriginPicker.tsx`
- Create: `editor/src/components/OriginPicker.css`
- Modify: `editor/src/components/Inspector.tsx`
- Modify: `editor/src/components/NewMapDialog.tsx`

Same pattern as Task 4.4 — replace the origin dropdown with a 2x2 grid of buttons showing the origin position (dot/arrow in corner). The four options: top-left, top-right, bottom-left, bottom-right.

- [ ] **Step 1: Write test**

Create `editor/src/components/OriginPicker.test.tsx` following the same pattern as `OrientationPicker.test.tsx`.

- [ ] **Step 2: Implement OriginPicker**

Small 2x2 grid with arrow/dot SVGs showing which corner is the origin. Accent-colored for selected state.

- [ ] **Step 3: Wire into Inspector and NewMapDialog**

Replace the origin `<select>` in both components. Note: Inspector currently doesn't expose origin at all — add it to the LAYOUT section.

- [ ] **Step 4: Run tests**

Run: `cd editor && npx vitest run`

- [ ] **Step 5: Commit**

```bash
git add editor/src/components/OriginPicker.tsx editor/src/components/OriginPicker.css editor/src/components/OriginPicker.test.tsx editor/src/components/Inspector.tsx editor/src/components/NewMapDialog.tsx
git commit -m "feat(editor): replace origin dropdown with visual thumbnail picker"
```

### Task 4.6: Inspector label vs. data contrast audit

**Files:**
- Modify: `editor/src/components/Inspector.tsx`
- Modify: `editor/src/components/Inspector.css`

The sandtable spec requires read-only data values to use `--text-primary` (bright) while labels use `--text-secondary`. Audit all inspector views and fix inconsistencies.

- [ ] **Step 1: Audit current contrast**

In Inspector.tsx, check the hex view, edge view, and vertex view. Ensure:
- Labels (`<label>`) use `--text-secondary` (already set via `.inspector-row label`)
- Data values (`<span>`) use `--text-primary` (already set via `.inspector-row span`)
- The neighbor grid values, contributing features list items, and meeting hexes are bright

- [ ] **Step 2: Fix any inconsistencies**

Most likely already correct via CSS, but verify and fix any inline styles that override the pattern.

- [ ] **Step 3: Commit**

```bash
git add editor/src/components/Inspector.tsx editor/src/components/Inspector.css
git commit -m "style(editor): ensure consistent label/data contrast in inspector"
```

---

## Phase 5: Paint & Authoring Flow

### Task 5.1: Separate features per paint session

**Files:**
- Modify: `editor/src/App.tsx:278-304`

Currently `handlePaintClick` searches for an existing feature with the same terrain and merges into it. Change to always create a new feature per paint session.

- [ ] **Step 1: Modify paint click handler**

In `App.tsx`, the `handlePaintClick` function (lines 262-305): when `targetFeatureIndex` is null (new paint session), skip the search loop (lines 283-289) and go straight to creating a new feature. The `targetFeatureIndex` in `paintState` will then track subsequent clicks within the same session.

```typescript
const handlePaintClick = (hit: HitResult, shiftKey: boolean) => {
  if (!paintState || !model || hit.type === 'none') return;
  if (hit.type !== paintState.geometry) return;

  let atomId = '';
  if (hit.type === 'hex') atomId = hit.label;
  else if (hit.type === 'edge') atomId = boundaryIdToHexPath(hit.boundaryId, model);
  else if (hit.type === 'vertex') atomId = vertexIdToHexPath(hit.vertexId, model);

  const token = shiftKey ? `- ${atomId}` : atomId;

  const targetIndex = paintState.targetFeatureIndex;

  if (targetIndex !== null) {
    // Continue adding to current session's feature
    const feature = model.features[targetIndex];
    const newAt = feature.at ? `${feature.at} ${token}` : token;
    dispatch({ type: 'updateFeature', index: targetIndex, changes: { at: newAt } });
  } else {
    // New paint session — always create new feature
    dispatch({ type: 'addFeature', feature: { at: token, terrain: paintState.terrainKey } });
    setPaintState({ ...paintState, targetFeatureIndex: model.features.length });
  }
};
```

- [ ] **Step 2: Reset targetFeatureIndex on paint activation**

This is already the case — `onPaintActivate` sets `targetFeatureIndex: null` (App.tsx line 532). But also reset when re-clicking the same terrain chip (toggling paint off and back on). Verify the existing behavior: clicking the chip when already painting that terrain exits paint mode, clicking again starts a fresh session with `targetFeatureIndex: null`.

- [ ] **Step 3: Run tests**

Run: `cd editor && npx vitest run`

- [ ] **Step 4: Commit**

```bash
git add editor/src/App.tsx
git commit -m "feat(editor): create separate feature per paint session instead of merging"
```

### Task 5.2: Command bar sync during painting with comma separators

**Files:**
- Modify: `editor/src/App.tsx`

When painting adds hexes to a feature, the command bar should update to show the feature's current `at` expression.

- [ ] **Step 1: Update command value after paint**

In `handlePaintClick`, after the dispatch, update the command bar:

```typescript
// After dispatch in both branches:
const updatedAt = targetIndex !== null
  ? `${model.features[targetIndex].at} ${token}`
  : token;
setCommandValue(updatedAt);
```

- [ ] **Step 2: Use comma separators in display**

When setting the command value from a feature's `at` expression (both in paint sync and in `handleSelectFeature`), format with comma separators. Add a utility:

```typescript
// In utils or inline:
const formatHexPathDisplay = (at: string): string =>
  at.replace(/\s+(?=[A-Za-z0-9])/g, ', ').replace(/,\s*-/g, ' -');
```

Apply in `handleSelectFeature` (line 465) and in paint sync.

- [ ] **Step 3: Run tests**

Run: `cd editor && npx vitest run`

- [ ] **Step 4: Commit**

```bash
git add editor/src/App.tsx
git commit -m "feat(editor): sync command bar during painting with comma-separated HexPath display"
```

### Task 5.3: Off-map click safety

**Files:**
- Modify: `editor/src/App.tsx:262-268`

Clicking off-map (void space) during paint mode crashes with "Invalid hex ID: VOID". Guard against this.

- [ ] **Step 1: Add guard for 'none' hit type**

In `handlePaintClick` (App.tsx line 263), the guard `hit.type === 'none'` already returns early. The crash likely comes from the hit-test returning a result with `type: 'hex'` but invalid ID. Add a guard:

```typescript
if (hit.type === 'hex' && !model.mesh.getHex(hit.hexId)) return;
```

Also guard edge and vertex similarly.

- [ ] **Step 2: Verify the crash doesn't reproduce**

Run dev server, enter paint mode, click off the map grid. Should silently do nothing.

- [ ] **Step 3: Commit**

```bash
git add editor/src/App.tsx
git commit -m "fix(editor): guard against off-map clicks in paint mode"
```

### Task 5.4: Single-click to paint, double-click to edit terrain

**Files:**
- Modify: `editor/src/components/Inspector.tsx:62-74`

Change terrain chip interaction: single-click activates paint, double-click opens the edit form.

- [ ] **Step 1: Change click handlers on terrain row**

In `Inspector.tsx`, update the terrain row header and chip click handlers:

```tsx
<div
  className="terrain-row-header"
  onDoubleClick={() =>
    setExpandedTerrain(isExpanded ? null : { key, geometry })
  }
  onClick={() => {
    // Single click on the row header activates paint
    onPaintActivate?.(isPaintActive ? null : key, geometry);
  }}
>
  <div
    className={`terrain-color-chip ${isPaintActive ? 'active' : ''}`}
    style={{ backgroundColor: def.color }}
    title={isPaintActive ? 'Click to exit paint mode' : 'Click to paint, double-click to edit'}
  />
```

Remove the separate `onClick` and `e.stopPropagation()` on the color chip — the row itself handles paint activation now.

- [ ] **Step 2: Run tests**

Run: `cd editor && npx vitest run src/components/Inspector.test.tsx`

- [ ] **Step 3: Commit**

```bash
git add editor/src/components/Inspector.tsx
git commit -m "feat(editor): single-click terrain to paint, double-click to edit properties"
```

---

## Phase 6: Canvas & Rendering Polish

### Task 6.1: Segment-aware feature selection highlights

**Files:**
- Investigate: `canvas/src/scene.ts` (the `@hexmap/canvas` library)

When a feature is selected, the dotted connecting line currently links all hexes as a single path. It should only connect hexes within contiguous HexPath segments.

- [ ] **Step 1: Investigate scene.ts path line rendering**

Read `canvas/src/scene.ts` to understand how `scene.pathLines` are built from feature selections. The fix needs to happen in the `buildScene` function where it constructs the path connecting selected hexes.

- [ ] **Step 2: Parse feature `at` into segments**

The feature's `at` string contains space-separated segments. Each contiguous run (e.g., `a2-a6`) should have a connecting line. Isolated atoms (e.g., `b9`, `c3`) should not be connected to each other.

This likely requires changes to the `@hexmap/canvas` library's `buildScene` to accept segment boundary information, or to parse the `at` expression to determine which hexes are contiguous.

- [ ] **Step 3: Implement and test**

This is a more involved change since it crosses the library boundary. Implement in `canvas/src/scene.ts`, test in `canvas/src/scene.test.ts`.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(canvas): segment-aware path lines for feature selection highlights"
```

### Task 6.2: Hex-shaped terrain chips

**Files:**
- Create: `editor/src/components/TerrainChip.tsx`
- Create: `editor/src/components/TerrainChip.css`
- Modify: `editor/src/components/Inspector.tsx`
- Modify: `editor/src/components/FeatureStack.tsx`

Replace 12x12 square color chips with small hex-shaped chips that reflect the geometry type.

- [ ] **Step 1: Write test**

Create `editor/src/components/TerrainChip.test.tsx`:

```typescript
import { render } from '@testing-library/react';
import { TerrainChip } from './TerrainChip';

test('renders hex geometry as filled hexagon', () => {
  const { container } = render(<TerrainChip color="#2d6a1e" geometry="hex" />);
  expect(container.querySelector('svg polygon')).toBeInTheDocument();
});

test('renders edge geometry as line', () => {
  const { container } = render(<TerrainChip color="#0044cc" geometry="edge" />);
  expect(container.querySelector('svg line')).toBeInTheDocument();
});

test('renders vertex geometry as dot', () => {
  const { container } = render(<TerrainChip color="#FFD600" geometry="vertex" />);
  expect(container.querySelector('svg circle')).toBeInTheDocument();
});
```

- [ ] **Step 2: Implement TerrainChip**

Create `TerrainChip.tsx` — a small inline SVG component that renders:
- `hex`: filled hexagon shape (16x16)
- `edge`: a colored line with tick marks (16x16)
- `vertex`: a filled circle (16x16)

All with the sandtable glow effect via SVG filter.

- [ ] **Step 3: Replace chips in Inspector and FeatureStack**

Replace the `<div className="terrain-color-chip" style={{ backgroundColor }}` divs with `<TerrainChip>` components, passing the terrain color and geometry type.

- [ ] **Step 4: Run tests**

Run: `cd editor && npx vitest run`

- [ ] **Step 5: Commit**

```bash
git add editor/src/components/TerrainChip.tsx editor/src/components/TerrainChip.css editor/src/components/TerrainChip.test.tsx editor/src/components/Inspector.tsx editor/src/components/FeatureStack.tsx
git commit -m "feat(editor): hex-shaped terrain chips reflecting geometry type"
```

### Task 6.3: Drag-to-reorder features in stack

**Files:**
- Modify: `editor/src/components/FeatureStack.tsx`
- Modify: `editor/src/components/FeatureStack.css`
- Modify: `editor/src/App.tsx`

Enable drag-and-drop reordering in the feature stack. This is important for the "features override in stack order" model.

- [ ] **Step 1: Investigate MapCommand support**

Check if the `@hexmap/canvas` library has a `reorderFeature` or `moveFeature` command type. If not, it needs to be added.

- [ ] **Step 2: Implement drag handlers**

Uncomment and implement the drag handle (FeatureStack.tsx line 73). Use HTML5 drag-and-drop or a lightweight approach:

```tsx
<div
  className="feature-drag-handle"
  draggable
  onDragStart={(e) => {
    e.dataTransfer.setData('text/plain', String(feature.index));
  }}
>
  ⋮⋮
</div>
```

Add `onDragOver` and `onDrop` handlers on the feature list to calculate the drop position and dispatch a reorder command.

- [ ] **Step 3: Style drag feedback**

Add CSS for drag state:

```css
.feature-item.drag-over {
  border-top: 2px solid var(--accent-hex);
}

.feature-drag-handle {
  color: var(--text-muted);
  cursor: grab;
  font-size: 14px;
  line-height: 1;
}

.feature-drag-handle:active {
  cursor: grabbing;
}
```

- [ ] **Step 4: Run tests**

Run: `cd editor && npx vitest run`

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(editor): drag-to-reorder features in stack"
```

---

## Phase 7: Dialog Improvements

### Task 7.1: Editable title in NewMapDialog

**Files:**
- Modify: `editor/src/components/NewMapDialog.tsx`
- Modify: `editor/src/components/NewMapDialog.test.tsx`

Currently the title is hardcoded to "New Map" in the generated YAML. Add a title input.

- [ ] **Step 1: Write test**

Add to `NewMapDialog.test.tsx`:

```typescript
it('includes custom title in generated YAML', () => {
  const onCreateMap = vi.fn();
  render(<NewMapDialog onCreateMap={onCreateMap} onCancel={() => {}} />);

  const titleInput = screen.getByLabelText('Title:');
  fireEvent.change(titleInput, { target: { value: 'Battle for Moscow' } });

  fireEvent.click(screen.getByText('Create'));
  const yaml = onCreateMap.mock.calls[0][0];
  expect(yaml).toContain('title: "Battle for Moscow"');
});
```

- [ ] **Step 2: Add title state and input**

In `NewMapDialog.tsx`, add:

```tsx
const [title, setTitle] = useState('New Map');
```

Add a title input as the first field in the dialog:

```tsx
<div className="dialog-row">
  <label>
    Title:
    <input type="text" value={title} onChange={e => setTitle(e.target.value)} />
  </label>
</div>
```

Update `handleCreate` to use the title variable in the YAML:

```typescript
yaml += `metadata:\n  title: "${title}"\n`;
```

- [ ] **Step 3: Run tests**

Run: `cd editor && npx vitest run src/components/NewMapDialog.test.tsx`

- [ ] **Step 4: Commit**

```bash
git add editor/src/components/NewMapDialog.tsx editor/src/components/NewMapDialog.test.tsx
git commit -m "feat(editor): add editable title field to NewMapDialog"
```

### Task 7.2: Dialog field grouping

**Files:**
- Modify: `editor/src/components/NewMapDialog.tsx`
- Modify: `editor/src/components/NewMapDialog.css`

Group the flat list of fields into logical sections with headings.

- [ ] **Step 1: Add section structure to dialog**

Wrap fields in groups with heading labels:

```tsx
<div className="dialog-section">
  <h3 className="dialog-section-title">Grid</h3>
  <div className="dialog-row">
    {/* Width + Height */}
  </div>
  <div className="dialog-row">
    {/* Orientation picker + Origin picker */}
  </div>
</div>

<div className="dialog-section">
  <h3 className="dialog-section-title">Terrain</h3>
  <div className="dialog-row">
    {/* Terrain Palette + Base Terrain */}
  </div>
</div>
```

- [ ] **Step 2: Style section headings**

Add to `NewMapDialog.css`:

```css
.dialog-section {
  margin-bottom: 16px;
}

.dialog-section-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--accent-hex);
  letter-spacing: 0.1em;
  margin: 0 0 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-accent);
}
```

- [ ] **Step 3: Run tests**

Run: `cd editor && npx vitest run src/components/NewMapDialog.test.tsx`

- [ ] **Step 4: Commit**

```bash
git add editor/src/components/NewMapDialog.tsx editor/src/components/NewMapDialog.css
git commit -m "style(editor): group NewMapDialog fields into logical sections"
```

---

## Summary

| Phase | Tasks | Focus |
|-------|-------|-------|
| 1 | 1.1–1.5 | Bug fixes (CSS vars, Loading state, zoom, resize, theme) |
| 2 | 2.1–2.7 | Visual identity (dialog, inspector, stack, path, favicon) |
| 3 | 3.1–3.5 | Discoverability (welcome, placeholders, shortcuts, paint badge, tooltips) |
| 4 | 4.1–4.6 | Inspector UX (collapsible, tabs, base layer, orientation, origin, contrast) |
| 5 | 5.1–5.4 | Paint flow (separate features, sync, safety, click semantics) |
| 6 | 6.1–6.3 | Canvas polish (segment highlights, hex chips, drag reorder) |
| 7 | 7.1–7.2 | Dialog improvements (title, field grouping) |

**Total: 30 tasks across 7 phases.**

**Notes:**
- Escape key chaining (spec 7a) is already implemented correctly — the current code chains paint exit → command clear → selection clear
- Click-to-deselect on empty canvas (spec 7b) is already implemented — `handleHit` with `type: 'none'` calls `clearSelection()`
