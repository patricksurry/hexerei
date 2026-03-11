# Visual Identity: Sand Table

**Date:** 2026-03-11
**Purpose:** Concrete design guidelines for evolving the editor's visual identity from "muted dark IDE" to "tactical holographic sand table." Themable architecture, with this as the default theme.

---

## Diagnosis: What's Wrong Now

Looking at the current screenshot against the mood board:

| Problem | Current | Target |
|---------|---------|--------|
| **Canvas background** | #141414 flat black — dead, no depth | Deep navy with subtle gradient or noise — feels like a lit surface |
| **Hex outlines** | #3A3A3A — nearly invisible, low contrast | Luminous teal/cyan hairlines — the grid *glows* |
| **Terrain fills** | Muted olive/khaki at full opacity — feels like a paper map | Slightly desaturated fills at reduced opacity, letting the grid show through |
| **Hex labels** | #888888 monospace — washes out on terrain fills | Brighter, with a subtle text-shadow glow for legibility |
| **Panel backgrounds** | #1C1C1C — indistinguishable from canvas bg | Darker or with a subtle pattern/border treatment that reads as "instrument panel" |
| **Panel text** | #888 secondary, #555 muted — hard to read | Higher contrast: secondary should be legible, muted should still be visible |
| **Selection highlights** | 20% opacity fill + accent border — adequate but flat | Bloom effect: bright core, soft glow halo, color saturates toward white at center |
| **Feature labels** | White with black outline — workable but generic | Accent-colored, with glow, feels like HUD callouts |

---

## Design Principles

1. **The grid is the hero.** Empty-state hexes should feel like a holographic projection — luminous hairline edges on a dark surface. The grid itself is visually interesting, not just a container for terrain.

2. **Light comes from the data.** In a sand table, the surface is dark and the information glows. Colors are additive (like light), not subtractive (like paint). Highlights bloom. Selections radiate.

3. **Terrain is subordinate to structure.** Terrain fills should be visible but not dominant. They tint the hex rather than painting it opaque. The grid lines remain visible through terrain.

4. **Chrome is instrumentation.** Side panels, command bar, and status bar should feel like instrument readouts — high contrast text on dark surfaces, with accent-colored section markers and fine ruling lines.

5. **Themable from the ground up.** All visual decisions flow through CSS custom properties and a small set of canvas-drawing parameters. Swapping the theme file changes the entire feel.

---

## Color System

### Theme: Sand Table (default)

#### Backgrounds

| Token | Current | New | Notes |
|-------|---------|-----|-------|
| `--bg-base` | `#141414` | `#0A0E14` | Deeper, slightly blue-black. The "table surface." |
| `--bg-surface` | `#1C1C1C` | `#0D1117` | Panel backgrounds. Distinct from canvas. |
| `--bg-elevated` | `#242424` | `#151B23` | Hover states, active items, dropdowns. |
| `--bg-canvas` | *(none)* | `#080C12` | New token. Canvas background, darkest surface. |

The slight blue shift gives depth and warmth compared to pure neutral gray. It also means the cyan/teal accents feel native rather than bolted on.

#### Borders & Rules

| Token | Current | New | Notes |
|-------|---------|-----|-------|
| `--border-subtle` | `#2A2A2A` | `#1A2332` | Panel dividers. Slightly blue-tinted. |
| `--border-focus` | `#3A3A3A` | `#2A3A4A` | Input borders, focus rings. |
| `--border-accent` | *(none)* | `rgba(0, 212, 255, 0.25)` | New. Accent-tinted rule lines for section dividers. |

#### Text

| Token | Current | New | Notes |
|-------|---------|-----|-------|
| `--text-primary` | `#E8E8E8` | `#E6EDF3` | Slightly cool-shifted for consistency with blue base. |
| `--text-secondary` | `#888888` | `#8B949E` | **Brighter.** Must be legible on dark surface. |
| `--text-muted` | `#555555` | `#484F58` | Still subdued but visible. Current #555 disappears. |
| `--text-glow` | *(none)* | `rgba(0, 212, 255, 0.6)` | New. For text-shadow glow effects on key labels. |

#### Accents (geometry-typed)

Keep the hue mapping (cyan/magenta/yellow) but push toward higher luminance and add glow variants:

| Token | Current | New | Notes |
|-------|---------|-----|-------|
| `--accent-hex` | `#00D4FF` | `#00D4FF` | Keep — already strong cyan. |
| `--accent-hex-glow` | *(none)* | `rgba(0, 212, 255, 0.4)` | For box-shadow / canvas glow. |
| `--accent-edge` | `#FF3DFF` | `#FF44FF` | Slightly brighter magenta. |
| `--accent-edge-glow` | *(none)* | `rgba(255, 68, 255, 0.4)` | Glow variant. |
| `--accent-vertex` | `#FFD600` | `#FFDD00` | Keep warm yellow. |
| `--accent-vertex-glow` | *(none)* | `rgba(255, 221, 0, 0.4)` | Glow variant. |

#### Semantic

| Token | Current | New |
|-------|---------|-----|
| `--color-error` | `#FF4D4D` | `#F85149` |
| `--color-success` | `#4DFF88` | `#3FB950` |
| `--color-warning` | `#FFD600` | `#D29922` |

---

## Canvas Rendering

This is where the sand table feel lives or dies. These are parameters for `draw.ts`, not CSS.

### Grid Lines (empty state)

```
Grid stroke:       rgba(0, 180, 220, 0.18)    // teal, not gray
Grid line width:   0.75px (at 1x zoom)
```

The grid should glow faintly. At rest, hexes read as a luminous wireframe on dark ground. This is the single biggest change — transforming the hex outlines from "gray borders" to "holographic projection lines."

Optional enhancement: a very subtle radial gradient on the canvas background, slightly lighter at center, creating the impression of a lit surface. Not essential for v1.

### Terrain Fills

```
Fill opacity:      0.55–0.70 (terrain-dependent, not 1.0)
Fill compositing:  draw fill THEN re-stroke grid lines on top
```

Terrain colors tint the hex but the grid line remains visible through (or rather, on top of) the fill. This maintains the "data projected onto grid" feel rather than "colored tiles."

The terrain color palette itself is defined per-map (via the hexmap format's terrain vocabulary), so we don't dictate specific terrain colors here. But we should document that terrain colors work best when slightly desaturated and mid-brightness — the accents and grid should be the brightest elements, not the terrain.

### Hex Coordinate Labels

```
Color:             rgba(0, 180, 220, 0.35)     // teal-tinted, not gray
Font:              monospace (as now)
Shadow:            0 0 4px rgba(0, 180, 220, 0.15)   // subtle glow
```

Labels should feel like they're etched into or projected onto the grid, not stamped on top. Tinting them with the grid color (rather than neutral gray) makes them feel integrated.

### Selection Highlight

The current flat-fill + border works but lacks the bloom quality of the mood board. New approach:

```
Core fill:         accent color at 15% opacity
Border:            accent color at full brightness, 2px
Outer glow:        accent color at 30% opacity, blurred 6-8px beyond the hex edge
                   (via ctx.shadowColor + ctx.shadowBlur on the stroke pass)
```

Canvas 2D `shadowBlur` is the cheapest way to get bloom. Apply it to the selection stroke:

```js
ctx.shadowColor = hl.color;
ctx.shadowBlur = 8;
ctx.strokeStyle = hl.color;
ctx.lineWidth = 2;
ctx.stroke();
ctx.shadowBlur = 0;  // reset
```

For hover, use the same pattern at lower intensity (shadowBlur = 4, fill at 8%).

### Ghost Preview (HexPath)

```
Stroke:            accent color, dashed (as now)
Glow:              shadowBlur = 4, subtle
Fill:              none (keep it wireframe — emphasizes "proposed, not committed")
```

### Edge & Vertex Highlights

```
Edges:             3px line with shadowBlur = 6 in accent-edge color
Vertices:          5px circle with shadowBlur = 6 in accent-vertex color
                   No black outline — let the glow define the shape
```

Drop the black stroke on vertices. The glow replaces it as the visual boundary. Black outlines fight the "light emitting" aesthetic.

### Feature Labels (on canvas)

```
Color:             #E6EDF3 (text-primary, not pure white)
Shadow:            0 0 6px rgba(0, 0, 0, 0.8)    // dark halo for legibility
                   0 0 3px rgba(0, 180, 220, 0.3)  // subtle teal glow
Font weight:       600 (semibold, not bold — less heavy)
```

Alternatively, feature labels could use the *terrain accent color* of their feature, with white reserved for coordinate labels. This would make them feel like HUD callouts (matching the mood board images where different data classes have different colors).

### Path Lines

```
Stroke:            accent color at 60% opacity (subtler than selection)
Dash:              [6, 4] (slightly longer dashes than current [4, 4])
Glow:              shadowBlur = 3
```

---

## Panel Chrome

### General Treatment

Panels should feel like instrument readouts: dark, high-contrast, with fine ruling lines and accent-colored section markers.

**Section headings** (FEATURE STACK, INSPECTOR, etc.):
```css
.panel-heading {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent-hex);          /* teal, not muted gray */
  border-bottom: 1px solid var(--border-accent);
  padding-bottom: 8px;
}
```

Currently these headings are `--text-muted` (#555). Making them accent-colored is the single highest-impact panel change — it gives the panels their HUD character.

**Section dividers**: Use `--border-accent` (teal at 25%) instead of `--border-subtle`. Panels should have a faint teal tint to their ruling lines, connecting them visually to the grid.

### Command Bar

```css
.command-bar {
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-accent);   /* teal rule, not gray */
}

.command-bar:focus-within {
  border-bottom-color: var(--accent-hex);
  box-shadow: 0 1px 8px var(--accent-hex-glow);    /* glow when active */
}
```

The mode badge should be brighter: full accent color text on a slightly more opaque accent background (0.15 instead of 0.1).

### Feature Stack

**Item rows:**
```css
.feature-item {
  border-bottom: 1px solid rgba(0, 180, 220, 0.06);   /* barely-there teal rule */
}

.feature-item:hover {
  background: rgba(0, 180, 220, 0.06);   /* teal tint, not gray elevation */
}

.feature-item.selected {
  background: rgba(0, 212, 255, 0.08);
  border-left: 2px solid var(--accent-hex);
  box-shadow: inset 4px 0 8px rgba(0, 212, 255, 0.1);  /* inner glow on left edge */
}
```

**Color chips**: Add a subtle `box-shadow: 0 0 4px <chipColor>40` to make terrain color chips glow slightly.

### Inspector

**Read-only values**: Use `--text-primary` (not secondary) for actual data values. Labels stay secondary.

**Clickable features** (in the contributing features list): Accent-colored with a glow on hover:
```css
.clickable:hover {
  color: var(--accent-hex);
  text-shadow: 0 0 6px var(--accent-hex-glow);
}
```

**The neighbor grid**: Currently neutral. Could use very faint hex-accent tint on hover to indicate clickability.

### Status Bar

```css
.status-bar {
  background: var(--bg-surface);
  border-top: 1px solid var(--border-accent);
}

.status-segment {
  color: var(--text-secondary);
  border-right: 1px solid var(--border-accent);
}
```

The cursor coordinate and zoom values should be `--text-primary` (bright) — these are primary readouts, not secondary info. The status bar is an instrument panel; its values should be as legible as a flight instrument.

---

## Typography Refinements

No font changes, but adjust weight and spacing:

| Element | Current | New |
|---------|---------|-----|
| Panel headings | 11px bold, #555, 0.05em spacing | 10px 700-weight, accent-colored, 0.1em spacing |
| Inspector labels | 13px, #888 | 12px, #8B949E |
| Inspector values | 13px, #E8E8E8 | 13px, #E6EDF3 (keep bright) |
| Feature Stack label | 12px bold | 12px 600-weight (slightly lighter) |
| Feature Stack `at` | 11px mono, #888 | 11px mono, rgba(0, 180, 220, 0.5) (teal-tinted) |
| Status bar values | 11px, #888 | 11px, #E6EDF3 (promote to primary) |
| Status bar labels | *(none)* | 11px, #8B949E |

The `at` field in the feature stack benefits from teal tinting because it's a HexPath expression — a "code" artifact that belongs to the grid's visual language.

---

## Theming Architecture

### Token Organization

Split `tokens.css` into:

```
tokens/
  base.css          — spacing, typography, radii, layout (theme-independent)
  theme-sandtable.css  — color palette for sand table theme
  theme-paper.css      — future: light theme, traditional map feel
  theme-classic.css    — future: the current muted dark theme, preserved
```

`main.tsx` imports `base.css` + one theme file. Theme switching is a CSS class on `:root` or a dynamic import.

### Canvas Theme Parameters

Canvas drawing can't use CSS variables directly. Define a `CanvasTheme` interface:

```typescript
interface CanvasTheme {
  background: string;
  gridStroke: string;
  gridLineWidth: number;
  terrainOpacity: number;        // 0–1, applied to terrain fills
  labelColor: string;
  labelGlow: string | null;      // null = no glow
  selectionGlow: number;         // shadowBlur radius
  hoverGlow: number;
  featureLabelColor: string;
  featureLabelShadow: string;
}
```

The active `CanvasTheme` is passed to `drawScene()`. The app resolves it from the current CSS theme (reading computed CSS properties at init) or from a static object for performance.

---

## Interaction Glow Effects (canvas)

### Hover

When the mouse moves over a hex (before clicking):

```
Grid line of hovered hex:   accent-hex at 60% opacity, lineWidth 1.5
Fill:                        accent-hex at 5% opacity
Glow:                        shadowBlur = 3
```

Very subtle — a "warming" effect, like the hex is reacting to proximity. Currently hover only works on feature stack items. Extending it to canvas hex-under-cursor would make the grid feel alive.

### Selection

```
Grid line:    accent color, lineWidth 2
Fill:         accent color at 12%
Glow:         shadowBlur = 8
```

Noticeable but not overpowering. The bloom makes it feel like the hex is "activated."

### Multi-select / Feature geometry

When a feature is selected and its hexes are highlighted:

```
Fill:         terrain color at 25% + accent at 8% (additive)
Border:       accent at 80%, lineWidth 1.5
Glow:         shadowBlur = 4
```

Lighter touch than single-hex selection — you see the extent but it doesn't overwhelm.

---

## Implementation Priority

These changes are roughly independent of the authoring-loop work and can be done in parallel or interleaved:

### Pass 1 — Canvas atmosphere (biggest visual impact)

1. Change canvas background to `#080C12`
2. Change grid stroke to `rgba(0, 180, 220, 0.18)`, 0.75px
3. Reduce terrain fill opacity to 0.6 and re-stroke grid on top
4. Add `shadowBlur` glow to selection/hover highlights
5. Tint hex labels teal

### Pass 2 — Panel chrome

1. Update all tokens (backgrounds, borders, text colors)
2. Accent-color panel headings
3. Teal-tinted borders throughout
4. Brighter status bar values
5. Glow on command bar focus

### Pass 3 — Refinements

1. Feature label glow / accent coloring on canvas
2. Color chip glow in feature stack
3. Vertex highlight glow (drop black outline)
4. Hover-glow on canvas hexes (hex-under-cursor)

### Pass 4 — Theming architecture

1. Split tokens into base + theme files
2. Define `CanvasTheme` interface
3. Wire theme selection (CSS class swap + CanvasTheme object)
4. Preserve current look as "classic" theme

---

## Reference: Mood Board Analysis

**Hightopo Military Sand Table** — Deep navy base, cyan/blue holographic grid lines, bright data overlays. The grid itself is the primary visual element; terrain is projected onto it as semi-transparent color fields. Instrument panels at the periphery use high-contrast text on dark chrome.

**Republic Command Center** — Dominant cyan glow. Information radiates light. The display is the brightest thing in the room. Everything is backlit, nothing is front-lit.

**Digital Sand Table (military concept)** — Dark environment with the table as focal point. Bright colored callout labels (red, yellow, cyan) float above the terrain. The hex/grid overlay is visible through terrain, not hidden by it. Peripheral data panels are high-contrast and instrument-like.

**Common threads:** Dark ground, luminous data, additive color (light, not paint), grid-as-structure visible through content, accent colors that bloom and glow, high-contrast readouts in the chrome.
