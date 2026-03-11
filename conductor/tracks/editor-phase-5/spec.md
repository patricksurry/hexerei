# Editor Phase 5 Specification

## Goals
1. Fix three confirmed bugs: partial edge/vertex input crash, hex label scaling/position, and `bfm.yaml` RFC compliance.
2. Deliver five UX improvements: selection/CommandBar synchronization, path segment visualization, feature labels on canvas, feature grouping prep, and improved feature introspection.

## Core Correctness (Tier A)
- **A1. Partial Input Safety**: Incomplete edge/vertex expressions (e.g., `0605.`) should return null instead of a partial ID to prevent React render crashes.
- **A2. Label Scaling & Position**: Hex labels should grow with zoom (no 16px cap) and be positioned near the top of the hex to clear the center for potential counters.
- **A3. RFC Compliance**: Update `bfm.yaml` to use RFC-compliant syntax (`orientation`, flat-string `at` values, etc.).

## UX Polish (Tier B)
- **B1. Selection Sync**: Populate the CommandBar with the selection's `at` expression (feature) or HexPath token (edge/vertex) when clicked on canvas/stack.
- **B2. Path Visualization**: Draw dashed lines connecting hex centers in path order when a sequential HexPath is in the CommandBar.
- **B3. Feature Labels**: Render labels for non-base features (cities, rivers, fortifications) at their hex cluster centroids with an outline for legibility.

## Future Considerations (Tier C)
- **C1. Feature Grouping**: Prepare FeatureStack for larger maps by grouping by terrain or explicit tags (deferred to next phase).
- **C2. Edge/Vertex Highlights**: Selection of features with edge/vertex `at` values should highlight the respective geometries (deferred to next phase).
