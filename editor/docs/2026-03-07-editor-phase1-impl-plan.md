# Editor Phase 1: App Shell & Visual Identity — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the full editor layout skeleton with static data, establishing visual identity, panel hierarchy, and keyboard navigation — validating the IA before wiring real data.

**Architecture:** Vite + React app in `editor/`. CSS custom properties define a design token system consumed by all components. Layout uses CSS Grid for the three-column structure. Each panel is an isolated component with its own data contract (typed props), rendering static mock data in this phase. No `@hexmap/core` dependency yet.

**Tech Stack:** React 19, TypeScript, Vite, Vitest + React Testing Library, CSS custom properties (no framework), JetBrains Mono via `@fontsource/jetbrains-mono`.

## Acceptance Criteria (Phase 1 overall)

- [ ] App renders the full three-column layout with command bar and status bar
- [ ] Feature Stack panel shows mock feature rows with correct visual treatment
- [ ] Inspector panel shows mock feature properties
- [ ] Panels collapse/expand via `Cmd+1` / `Cmd+2` keyboard shortcuts
- [ ] Command bar focuses on `Cmd+K`, clears on `Escape`
- [ ] Canvas area is a styled placeholder (no rendering)
- [ ] Tactical Blueprint color tokens and typography are applied consistently
- [ ] Layout is responsive: panels collapse gracefully below 900px viewport width
- [ ] All components have unit tests covering render and interaction
- [ ] No accessibility violations (semantic HTML, ARIA labels, keyboard navigation)

---

### Task 1: Project Scaffold

**Files:**
- Create: `editor/package.json`
- Create: `editor/tsconfig.json`
- Create: `editor/vite.config.ts`
- Create: `editor/vitest.config.ts`
- Create: `editor/index.html`
- Create: `editor/src/main.tsx`
- Create: `editor/src/App.tsx`
- Create: `editor/src/App.test.tsx`

**Step 1: Initialize the project**

```bash
cd editor
npm init -y
npm install react react-dom
npm install -D typescript vite @vitejs/plugin-react \
  vitest @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event jsdom \
  @types/react @types/react-dom \
  @fontsource/jetbrains-mono
```

Set `package.json` scripts:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

**Step 2: Configure TypeScript**

`editor/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "declaration": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

**Step 3: Configure Vite**

`editor/vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
});
```

**Step 4: Configure Vitest**

`editor/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
});
```

`editor/src/test-setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

**Step 5: Create entry point**

`editor/index.html` — minimal shell that mounts `#root`.

`editor/src/main.tsx` — `createRoot(document.getElementById('root')!).render(<App />)`.

`editor/src/App.tsx` — renders a `<div>` with text "Hexerei Editor". No layout yet.

**Step 6: Write the first test**

`editor/src/App.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { App } from './App';

test('renders without crashing', () => {
  render(<App />);
  expect(screen.getByText(/hexerei/i)).toBeInTheDocument();
});
```

**Step 7: Run test to verify it passes**

```bash
cd editor && npx vitest run
```

Expected: 1 test PASS.

**Step 8: Commit**

```bash
git add editor/
git commit -m "Editor: scaffold Vite + React + Vitest project"
```

---

### Task 2: Design Tokens & Global Styles

**Files:**
- Create: `editor/src/tokens.css`
- Create: `editor/src/reset.css`
- Create: `editor/src/styles.css`
- Modify: `editor/src/main.tsx` (import styles)
- Create: `editor/src/tokens.test.tsx`

**Step 1: Write the failing test**

`editor/src/tokens.test.tsx`:
```tsx
import { render } from '@testing-library/react';

test('CSS custom properties are defined on :root', () => {
  // Import the styles
  import('./tokens.css');
  import('./reset.css');
  import('./styles.css');

  render(<div data-testid="probe" />);
  const root = document.documentElement;
  const style = getComputedStyle(root);

  // Verify key tokens exist (non-empty string means defined)
  expect(style.getPropertyValue('--bg-base').trim()).toBeTruthy();
  expect(style.getPropertyValue('--accent-hex').trim()).toBeTruthy();
  expect(style.getPropertyValue('--text-primary').trim()).toBeTruthy();
});
```

**Step 2: Run test — verify it fails**

```bash
cd editor && npx vitest run tokens
```

Expected: FAIL — files don't exist.

**Step 3: Create `tokens.css`**

```css
:root {
  /* Backgrounds */
  --bg-base: #141414;
  --bg-surface: #1C1C1C;
  --bg-elevated: #242424;

  /* Borders */
  --border-subtle: #2A2A2A;
  --border-focus: #3A3A3A;

  /* Text */
  --text-primary: #E8E8E8;
  --text-secondary: #888888;
  --text-muted: #555555;

  /* Accents (geometry-typed) */
  --accent-hex: #00D4FF;
  --accent-edge: #FF3DFF;
  --accent-vertex: #FFD600;
  --accent-command: #00D4FF;

  /* Semantic */
  --color-error: #FF4D4D;
  --color-success: #4DFF88;
  --color-warning: #FFD600;

  /* Typography */
  --font-ui: -apple-system, 'Inter', 'Segoe UI', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, 'Cascadia Code', monospace;
  --font-size-xs: 11px;
  --font-size-sm: 12px;
  --font-size-md: 13px;
  --font-size-lg: 15px;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 24px;

  /* Layout */
  --panel-left-width: 240px;
  --panel-right-width: 280px;
  --command-bar-height: 40px;
  --status-bar-height: 28px;

  /* Radii */
  --radius-sm: 4px;
  --radius-md: 6px;
}
```

**Step 4: Create `reset.css`**

Minimal box-sizing reset, `margin: 0`, `font-family: var(--font-ui)`, `background: var(--bg-base)`, `color: var(--text-primary)` on `body`. Set `#root` to `height: 100vh`.

**Step 5: Create `styles.css`**

Global utility classes only: `.font-mono { font-family: var(--font-mono); }`, `.text-muted { color: var(--text-muted); }`, etc. Keep this minimal — component styles go in CSS modules or co-located CSS files.

**Step 6: Wire imports in `main.tsx`**

```tsx
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import './tokens.css';
import './reset.css';
import './styles.css';
```

**Step 7: Run test — verify it passes**

```bash
cd editor && npx vitest run tokens
```

Expected: PASS.

**Step 8: Commit**

```bash
git add editor/src/tokens.css editor/src/reset.css editor/src/styles.css \
  editor/src/main.tsx editor/src/tokens.test.tsx
git commit -m "Editor: add design tokens, reset, and global styles"
```

---

### Task 3: App Layout Shell

**Files:**
- Create: `editor/src/layout/AppLayout.tsx`
- Create: `editor/src/layout/AppLayout.css`
- Create: `editor/src/layout/AppLayout.test.tsx`
- Modify: `editor/src/App.tsx`

**Step 1: Write the failing test**

`editor/src/layout/AppLayout.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { AppLayout } from './AppLayout';

test('renders all layout regions', () => {
  render(
    <AppLayout
      commandBar={<div>command-bar</div>}
      leftPanel={<div>left-panel</div>}
      canvas={<div>canvas</div>}
      rightPanel={<div>right-panel</div>}
      statusBar={<div>status-bar</div>}
    />
  );

  expect(screen.getByRole('banner')).toBeInTheDocument();       // command bar
  expect(screen.getByRole('main')).toBeInTheDocument();          // canvas
  expect(screen.getByRole('complementary', { name: /features/i })).toBeInTheDocument();
  expect(screen.getByRole('complementary', { name: /inspector/i })).toBeInTheDocument();
  expect(screen.getByRole('contentinfo')).toBeInTheDocument();   // status bar
});

test('hides left panel when leftPanelVisible is false', () => {
  render(
    <AppLayout
      commandBar={<div>command-bar</div>}
      leftPanel={<div>left-panel</div>}
      canvas={<div>canvas</div>}
      rightPanel={<div>right-panel</div>}
      statusBar={<div>status-bar</div>}
      leftPanelVisible={false}
    />
  );

  expect(screen.queryByRole('complementary', { name: /features/i })).not.toBeVisible();
});

test('hides right panel when rightPanelVisible is false', () => {
  render(
    <AppLayout
      commandBar={<div>command-bar</div>}
      leftPanel={<div>left-panel</div>}
      canvas={<div>canvas</div>}
      rightPanel={<div>right-panel</div>}
      statusBar={<div>status-bar</div>}
      rightPanelVisible={false}
    />
  );

  expect(screen.queryByRole('complementary', { name: /inspector/i })).not.toBeVisible();
});
```

**Step 2: Run test — verify it fails**

```bash
cd editor && npx vitest run AppLayout
```

**Step 3: Implement `AppLayout`**

Props contract:
```tsx
interface AppLayoutProps {
  commandBar: React.ReactNode;
  leftPanel: React.ReactNode;
  canvas: React.ReactNode;
  rightPanel: React.ReactNode;
  statusBar: React.ReactNode;
  leftPanelVisible?: boolean;   // default true
  rightPanelVisible?: boolean;  // default true
}
```

The component renders a CSS Grid layout:
```
"command  command  command"  var(--command-bar-height)
"left     canvas   right"   1fr
"status   status   status"  var(--status-bar-height)
```

Grid column widths adapt based on panel visibility: when a panel is hidden, its column collapses to `0`. Use `aria-hidden` and CSS `display: none` or `width: 0; overflow: hidden` for the collapsed panel.

Key design decisions:
- `<header role="banner">` wraps command bar
- `<aside role="complementary" aria-label="Features">` wraps left panel
- `<main>` wraps canvas
- `<aside role="complementary" aria-label="Inspector">` wraps right panel
- `<footer role="contentinfo">` wraps status bar

**Step 4: Create `AppLayout.css`**

Use CSS Grid with custom property references for all dimensions. The layout container is `height: 100vh; overflow: hidden`.

**Step 5: Run tests — verify they pass**

```bash
cd editor && npx vitest run AppLayout
```

**Step 6: Wire into `App.tsx`**

```tsx
import { AppLayout } from './layout/AppLayout';

export function App() {
  return (
    <AppLayout
      commandBar={<div>Omni-Path</div>}
      leftPanel={<div>Feature Stack</div>}
      canvas={<div>Canvas</div>}
      rightPanel={<div>Inspector</div>}
      statusBar={<div>Status</div>}
    />
  );
}
```

**Step 7: Run all tests**

```bash
cd editor && npx vitest run
```

**Step 8: Commit**

```bash
git add editor/src/layout/ editor/src/App.tsx
git commit -m "Editor: add AppLayout with CSS Grid three-column structure"
```

---

### Task 4: Command Bar Component

**Files:**
- Create: `editor/src/components/CommandBar.tsx`
- Create: `editor/src/components/CommandBar.css`
- Create: `editor/src/components/CommandBar.test.tsx`

**Step 1: Write the failing tests**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandBar } from './CommandBar';

test('renders the command bar input', () => {
  render(<CommandBar />);
  expect(screen.getByRole('combobox', { name: /command/i })).toBeInTheDocument();
});

test('calls onFocus when input receives focus', async () => {
  const onFocus = vi.fn();
  render(<CommandBar onFocus={onFocus} />);
  await userEvent.click(screen.getByRole('combobox'));
  expect(onFocus).toHaveBeenCalled();
});

test('calls onChange as user types', async () => {
  const onChange = vi.fn();
  render(<CommandBar onChange={onChange} />);
  await userEvent.type(screen.getByRole('combobox'), '0101');
  expect(onChange).toHaveBeenLastCalledWith('0101');
});

test('calls onClear and blurs on Escape', async () => {
  const onClear = vi.fn();
  render(<CommandBar value="0101" onClear={onClear} />);
  const input = screen.getByRole('combobox');
  await userEvent.click(input);
  await userEvent.keyboard('{Escape}');
  expect(onClear).toHaveBeenCalled();
});

test('displays mode indicator for command mode', () => {
  render(<CommandBar value=">zoom" />);
  expect(screen.getByText(/command/i)).toBeInTheDocument();
});

test('displays mode indicator for search mode', () => {
  render(<CommandBar value="/forest" />);
  expect(screen.getByText(/search/i)).toBeInTheDocument();
});

test('displays mode indicator for path mode by default', () => {
  render(<CommandBar value="0101 3ne" />);
  expect(screen.getByText(/path/i)).toBeInTheDocument();
});
```

**Step 2: Run tests — verify they fail**

**Step 3: Implement `CommandBar`**

Props contract:
```tsx
interface CommandBarProps {
  value?: string;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onClear?: () => void;
  onSubmit?: (value: string) => void;
}
```

Key implementation details:
- `role="combobox"` for the input (will eventually have a dropdown for command/search results)
- Mode detection is pure logic: starts with `>` → command, starts with `/` → search, otherwise → path
- Mode badge rendered as a small chip left of the input text
- Monospace font (`var(--font-mono)`) for the input text
- `Escape` calls `onClear` and blurs
- `Enter` calls `onSubmit`
- Visual: `var(--bg-surface)` background, `var(--accent-command)` focus ring, compact height

**Step 4: Run tests — verify they pass**

**Step 5: Commit**

```bash
git add editor/src/components/CommandBar.*
git commit -m "Editor: add CommandBar with mode detection and keyboard handling"
```

---

### Task 5: Feature Stack Panel

**Files:**
- Create: `editor/src/components/FeatureStack.tsx`
- Create: `editor/src/components/FeatureStack.css`
- Create: `editor/src/components/FeatureStack.test.tsx`
- Create: `editor/src/types.ts`

**Step 1: Define the UI data types**

`editor/src/types.ts` — these are the editor's own view-model types, not coupled to `@hexmap/core`:
```ts
/** A feature as the editor UI sees it */
export interface FeatureItem {
  /** Index in the features array (used as key and for reorder operations) */
  index: number;
  /** Feature id from the hexmap, if present */
  id?: string;
  /** Primary terrain type (first base type) */
  terrain?: string;
  /** Display label */
  label?: string;
  /** Raw HexPath string from the `at` field */
  at: string;
  /** Whether this feature targets @all */
  isBase: boolean;
}

/** What is currently selected in the editor */
export type Selection =
  | { type: 'none' }
  | { type: 'feature'; indices: number[] }
  | { type: 'hex'; id: string }
  | { type: 'edge'; id: string }
  | { type: 'vertex'; id: string };
```

**Step 2: Write the failing tests**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeatureStack } from './FeatureStack';
import type { FeatureItem } from '../types';

const mockFeatures: FeatureItem[] = [
  { index: 0, terrain: 'clear', at: '@all', isBase: true },
  { index: 1, id: 'moscow', terrain: 'major_city', label: 'Moscow', at: '0507', isBase: false },
  { index: 2, terrain: 'forest', at: '0302 0303 0402', isBase: false },
];

test('renders all feature rows', () => {
  render(<FeatureStack features={mockFeatures} />);
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
});

test('displays terrain label and HexPath preview', () => {
  render(<FeatureStack features={mockFeatures} />);
  expect(screen.getByText('Moscow')).toBeInTheDocument();
  expect(screen.getByText('0507')).toBeInTheDocument();
});

test('marks the @all feature as base layer', () => {
  render(<FeatureStack features={mockFeatures} />);
  const items = screen.getAllByRole('listitem');
  expect(items[0]).toHaveAttribute('data-base', 'true');
});

test('calls onSelect when a feature row is clicked', async () => {
  const onSelect = vi.fn();
  render(<FeatureStack features={mockFeatures} onSelect={onSelect} />);
  await userEvent.click(screen.getByText('Moscow'));
  expect(onSelect).toHaveBeenCalledWith([1]);
});

test('calls onHover when mouse enters a feature row', async () => {
  const onHover = vi.fn();
  render(<FeatureStack features={mockFeatures} onHover={onHover} />);
  await userEvent.hover(screen.getAllByRole('listitem')[2]);
  expect(onHover).toHaveBeenCalledWith(2);
});

test('highlights the selected feature', () => {
  render(<FeatureStack features={mockFeatures} selectedIndices={[1]} />);
  const items = screen.getAllByRole('listitem');
  expect(items[1]).toHaveAttribute('aria-selected', 'true');
});
```

**Step 3: Run tests — verify they fail**

**Step 4: Implement `FeatureStack`**

Props contract:
```tsx
interface FeatureStackProps {
  features: FeatureItem[];
  selectedIndices?: number[];
  onSelect?: (indices: number[]) => void;
  onHover?: (index: number | null) => void;
}
```

Key implementation details:
- `<ul role="listbox">` container, `<li role="listitem">` for each feature
- Each row layout: `[color-chip] [label-or-terrain] [at-preview]`
- Color chip: small 12x12 square, color derived from terrain name (use a simple hash-to-hue function for now)
- Label: shows `label` if present, else `terrain`, else `id`, else `"Feature {index}"`
- At preview: truncated monospace, `var(--text-muted)`
- Base layer row (`isBase: true`): `data-base="true"`, slightly different background
- Selected row: `aria-selected="true"`, left border accent, `var(--bg-elevated)` background
- Hover: `var(--bg-elevated)` background, triggers `onHover`
- Mouse leave triggers `onHover(null)`

**Step 5: Run tests — verify they pass**

**Step 6: Commit**

```bash
git add editor/src/types.ts editor/src/components/FeatureStack.*
git commit -m "Editor: add FeatureStack panel with selection and hover"
```

---

### Task 6: Inspector Panel

**Files:**
- Create: `editor/src/components/Inspector.tsx`
- Create: `editor/src/components/Inspector.css`
- Create: `editor/src/components/Inspector.test.tsx`

**Step 1: Write the failing tests**

```tsx
import { render, screen } from '@testing-library/react';
import { Inspector } from './Inspector';
import type { FeatureItem, Selection } from '../types';

const mockFeature: FeatureItem = {
  index: 1, id: 'moscow', terrain: 'major_city',
  label: 'Moscow', at: '0507', isBase: false,
};

test('shows map metadata when nothing is selected', () => {
  render(<Inspector selection={{ type: 'none' }} mapTitle="Battle for Moscow" />);
  expect(screen.getByText('Battle for Moscow')).toBeInTheDocument();
  expect(screen.getByText(/map/i)).toBeInTheDocument();
});

test('shows feature properties when a feature is selected', () => {
  render(
    <Inspector
      selection={{ type: 'feature', indices: [1] }}
      features={[mockFeature]}
    />
  );
  expect(screen.getByText('moscow')).toBeInTheDocument();
  expect(screen.getByText('major_city')).toBeInTheDocument();
  expect(screen.getByText('0507')).toBeInTheDocument();
});

test('shows section headings for feature fields', () => {
  render(
    <Inspector
      selection={{ type: 'feature', indices: [1] }}
      features={[mockFeature]}
    />
  );
  expect(screen.getByText(/terrain/i)).toBeInTheDocument();
  expect(screen.getByText(/at/i)).toBeInTheDocument();
});
```

**Step 2: Run tests — verify they fail**

**Step 3: Implement `Inspector`**

Props contract:
```tsx
interface InspectorProps {
  selection: Selection;
  features?: FeatureItem[];
  mapTitle?: string;
  mapLayout?: { hex_top: string; stagger: string; label: string };
}
```

Key implementation details:
- When `selection.type === 'none'`: show map title, layout summary, and terrain vocabulary placeholder
- When `selection.type === 'feature'`: show a property sheet with labeled rows for each attribute (id, terrain, at, label, elevation, tags). Each value is displayed read-only in this phase (editable in Phase 5). Monospace for `at` and `id` fields.
- When `selection.type === 'hex'` (future): placeholder text "Hex inspection (Phase 3)"
- Visual: Section headings in `var(--text-muted)` uppercase small text. Values in `var(--text-primary)`. Alternating subtle background on rows for readability.

**Step 4: Run tests — verify they pass**

**Step 5: Commit**

```bash
git add editor/src/components/Inspector.*
git commit -m "Editor: add Inspector panel with selection-driven content"
```

---

### Task 7: Status Bar

**Files:**
- Create: `editor/src/components/StatusBar.tsx`
- Create: `editor/src/components/StatusBar.css`
- Create: `editor/src/components/StatusBar.test.tsx`

**Step 1: Write the failing tests**

```tsx
import { render, screen } from '@testing-library/react';
import { StatusBar } from './StatusBar';

test('displays cursor coordinate', () => {
  render(<StatusBar cursor="0507" />);
  expect(screen.getByText('0507')).toBeInTheDocument();
});

test('displays zoom level', () => {
  render(<StatusBar zoom={150} />);
  expect(screen.getByText('150%')).toBeInTheDocument();
});

test('displays map title', () => {
  render(<StatusBar mapTitle="Battle for Moscow" />);
  expect(screen.getByText('Battle for Moscow')).toBeInTheDocument();
});

test('shows dirty indicator when modified', () => {
  render(<StatusBar dirty={true} />);
  expect(screen.getByText(/modified/i)).toBeInTheDocument();
});

test('shows no indicator when clean', () => {
  render(<StatusBar dirty={false} />);
  expect(screen.queryByText(/modified/i)).not.toBeInTheDocument();
});
```

**Step 2: Run tests — verify they fail**

**Step 3: Implement `StatusBar`**

Props contract:
```tsx
interface StatusBarProps {
  cursor?: string;
  zoom?: number;
  mapTitle?: string;
  dirty?: boolean;
}
```

A single horizontal flex row. Each segment separated by `var(--border-subtle)` vertical dividers. Small text (`var(--font-size-xs)`). Cursor and zoom in monospace.

**Step 4: Run tests — verify they pass**

**Step 5: Commit**

```bash
git add editor/src/components/StatusBar.*
git commit -m "Editor: add StatusBar with cursor, zoom, title, and dirty indicator"
```

---

### Task 8: Canvas Placeholder

**Files:**
- Create: `editor/src/components/CanvasPlaceholder.tsx`
- Create: `editor/src/components/CanvasPlaceholder.css`
- Create: `editor/src/components/CanvasPlaceholder.test.tsx`

**Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { CanvasPlaceholder } from './CanvasPlaceholder';

test('renders placeholder with drop target hint', () => {
  render(<CanvasPlaceholder />);
  expect(screen.getByText(/canvas/i)).toBeInTheDocument();
});

test('fills its container', () => {
  const { container } = render(<CanvasPlaceholder />);
  const el = container.firstElementChild as HTMLElement;
  expect(el.style.width || el.className).toBeTruthy();
});
```

**Step 2: Run tests — verify they fail**

**Step 3: Implement `CanvasPlaceholder`**

A full-size div with `var(--bg-base)` background. Centered text in `var(--text-muted)`: "Canvas — Phase 2" with a subtle hex-shaped SVG icon or CSS outline. This is the future home of the `<canvas>` element.

Acceptance criteria for this component:
- Fills 100% of its grid cell
- Does not scroll
- Visually distinct from panels (no surface background)

**Step 4: Run tests — verify they pass**

**Step 5: Commit**

```bash
git add editor/src/components/CanvasPlaceholder.*
git commit -m "Editor: add CanvasPlaceholder for canvas area"
```

---

### Task 9: Keyboard Shortcuts & App State

**Files:**
- Create: `editor/src/hooks/useKeyboardShortcuts.ts`
- Create: `editor/src/hooks/useKeyboardShortcuts.test.ts`
- Modify: `editor/src/App.tsx`
- Modify: `editor/src/App.test.tsx`

**Step 1: Write the failing tests for the hook**

```ts
import { renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

test('calls handler for Cmd+K', async () => {
  const handlers = { 'mod+k': vi.fn() };
  renderHook(() => useKeyboardShortcuts(handlers));
  await userEvent.keyboard('{Meta>}k{/Meta}');
  expect(handlers['mod+k']).toHaveBeenCalled();
});

test('calls handler for Cmd+1', async () => {
  const handlers = { 'mod+1': vi.fn() };
  renderHook(() => useKeyboardShortcuts(handlers));
  await userEvent.keyboard('{Meta>}1{/Meta}');
  expect(handlers['mod+1']).toHaveBeenCalled();
});

test('does not call handler when target is an input', async () => {
  const handlers = { 'mod+k': vi.fn() };
  renderHook(() => useKeyboardShortcuts(handlers));

  const input = document.createElement('input');
  document.body.appendChild(input);
  input.focus();
  await userEvent.keyboard('{Meta>}k{/Meta}');

  // Cmd+K should still fire even from inputs (it's a global shortcut)
  expect(handlers['mod+k']).toHaveBeenCalled();
  document.body.removeChild(input);
});
```

**Step 2: Run tests — verify they fail**

**Step 3: Implement `useKeyboardShortcuts`**

```ts
type ShortcutMap = Record<string, () => void>;

export function useKeyboardShortcuts(shortcuts: ShortcutMap): void
```

- Registers a `keydown` listener on `window`
- Normalizes `mod` to `Meta` on Mac / `Ctrl` on other platforms
- Matches key combinations against the provided map
- Calls `preventDefault()` on matched shortcuts
- Cleans up on unmount

**Step 4: Run tests — verify they pass**

**Step 5: Write the failing integration tests for App**

Update `editor/src/App.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

test('renders all layout regions', () => {
  render(<App />);
  expect(screen.getByRole('banner')).toBeInTheDocument();
  expect(screen.getByRole('main')).toBeInTheDocument();
  expect(screen.getByRole('contentinfo')).toBeInTheDocument();
});

test('Cmd+1 toggles Feature Stack visibility', async () => {
  render(<App />);
  const panel = screen.getByRole('complementary', { name: /features/i });
  expect(panel).toBeVisible();

  await userEvent.keyboard('{Meta>}1{/Meta}');
  expect(panel).not.toBeVisible();

  await userEvent.keyboard('{Meta>}1{/Meta}');
  expect(panel).toBeVisible();
});

test('Cmd+2 toggles Inspector visibility', async () => {
  render(<App />);
  const panel = screen.getByRole('complementary', { name: /inspector/i });
  expect(panel).toBeVisible();

  await userEvent.keyboard('{Meta>}2{/Meta}');
  expect(panel).not.toBeVisible();

  await userEvent.keyboard('{Meta>}2{/Meta}');
  expect(panel).toBeVisible();
});

test('Cmd+K focuses the command bar', async () => {
  render(<App />);
  await userEvent.keyboard('{Meta>}k{/Meta}');
  expect(screen.getByRole('combobox')).toHaveFocus();
});
```

**Step 6: Run tests — verify they fail**

**Step 7: Wire App state**

Update `App.tsx` to manage:
- `leftPanelVisible` (boolean, default true)
- `rightPanelVisible` (boolean, default true)
- `commandBarRef` (ref to focus the input)
- `useKeyboardShortcuts` wired to toggle functions

Feed static mock data to all components:
- `FeatureStack` gets the 3 mock features from Task 5
- `Inspector` gets selection state
- `StatusBar` gets static cursor/zoom/title
- `CommandBar` gets value/onChange

**Step 8: Run all tests — verify they pass**

```bash
cd editor && npx vitest run
```

**Step 9: Commit**

```bash
git add editor/src/hooks/ editor/src/App.tsx editor/src/App.test.tsx
git commit -m "Editor: add keyboard shortcuts and wire App state to all panels"
```

---

### Task 10: Polish & Responsive Behavior

**Files:**
- Create: `editor/src/layout/responsive.test.tsx`
- Modify: `editor/src/layout/AppLayout.css`

**Step 1: Write the failing tests**

```tsx
import { render, screen } from '@testing-library/react';
import { AppLayout } from './AppLayout';

test('panels get aria-label attributes', () => {
  render(
    <AppLayout
      commandBar={<div />} leftPanel={<div />}
      canvas={<div />} rightPanel={<div />} statusBar={<div />}
    />
  );
  expect(screen.getByRole('complementary', { name: /features/i })).toHaveAttribute('aria-label');
  expect(screen.getByRole('complementary', { name: /inspector/i })).toHaveAttribute('aria-label');
});
```

**Step 2: Run test — verify it passes (should already pass from Task 3)**

If it already passes, this task focuses on visual polish:

**Step 3: CSS polish**

- Add smooth transitions for panel collapse/expand (`transition: width 150ms ease, opacity 150ms ease`)
- Add `@media (max-width: 900px)` query that auto-collapses right panel
- Add `@media (max-width: 700px)` query that auto-collapses both panels
- Ensure keyboard shortcuts still toggle panels at any viewport width
- Verify panel divider borders use `var(--border-subtle)`
- Add subtle box-shadow on command bar for visual separation

**Step 4: Run all tests**

```bash
cd editor && npx vitest run
```

**Step 5: Manual visual review**

```bash
cd editor && npm run dev
```

Open in browser. Verify:
- [ ] Dark theme renders correctly
- [ ] JetBrains Mono loads for monospace text
- [ ] Panel proportions feel right
- [ ] Cmd+1, Cmd+2, Cmd+K all work
- [ ] Resizing the browser window collapses panels at breakpoints
- [ ] Feature Stack rows show color chip, label, and at preview
- [ ] Inspector shows different content based on selection
- [ ] Status bar is compact and readable

**Step 6: Commit**

```bash
git add editor/
git commit -m "Editor: polish responsive layout, transitions, and visual refinements"
```

---

## Summary

| Task | Component | Tests | Commit |
|------|-----------|-------|--------|
| 1 | Project scaffold | App renders | scaffold |
| 2 | Design tokens | CSS vars defined | tokens/styles |
| 3 | AppLayout | Regions render, panels hide | layout shell |
| 4 | CommandBar | Focus, type, mode detect, escape | command bar |
| 5 | FeatureStack | Rows render, select, hover, base marker | feature stack |
| 6 | Inspector | Context-sensitive display | inspector |
| 7 | StatusBar | All segments display | status bar |
| 8 | CanvasPlaceholder | Renders, fills space | canvas placeholder |
| 9 | Keyboard + App wiring | Shortcuts toggle panels, focus bar | app state |
| 10 | Responsive polish | Visual verification | polish |

Total: 10 tasks, ~10 commits, each independently testable.

## Core API Notes (for Phase 2)

The current `HexMapLoader` and `HexMesh` are rough drafts. For Phase 2, the editor needs a cleaner API contract from `@hexmap/core`. Key requirements:

1. **`HexMapLoader.load(source: string)`** should return a structured document object (not just a mesh) that preserves the full `features` array, `metadata`, `terrain` vocabulary, and `layout` — not just the computed mesh state. The editor needs both the source data (for the Feature Stack and Inspector) and the computed mesh (for the Canvas).

2. **`HexMesh`** should support `pixelToHex(point, hexSize)` for canvas hit-testing (click → which hex). The current API has `hexToPixel` but not the inverse.

3. **Hex geometry functions** (`hexCorners(hex, size)` → 6 corner points) are needed for canvas rendering. The current `hex-math.ts` has `hexToPixel` for centers but not corner geometry.

4. **Terrain vocabulary** should be queryable: given a terrain key, return its display name and style hints. Currently this data is in the YAML but not surfaced through any API.

These don't block Phase 1 (which uses static mock data), but should be addressed before Phase 2 begins.
