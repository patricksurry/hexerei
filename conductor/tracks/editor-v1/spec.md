# Specification: HexMap Editor V1

## Functional Requirements
- **Web-based UI:** Vite + React + TS.
- **Sidebar:** Accordion sections for Metadata, Layout, Terrain, and Features.
- **Viewport:** SVG-based map rendering using `@hexmap/renderer`.
- **Live Feedback:** Instant path highlighting when focusing/editing `at` fields.
- **YAML Sync:** Two-way sync between structured Sidebar and raw YAML view.

## Constraints
- **Client-Side:** Must work entirely in the browser.
- **Local Linkage:** Use existing `@hexmap/core` and `@hexmap/renderer`.
- **Minimal Initial Design:** Stick to colors and basic shapes before icons/images.

## Success Criteria
1. Can load a basic YAML map definition.
2. Viewport displays the hex grid and basic terrain colors.
3. Sidebar fields update the document state.
4. Typing a valid HexPath in a feature highlights the hexes in the viewport.
5. Can download the resulting YAML file.
