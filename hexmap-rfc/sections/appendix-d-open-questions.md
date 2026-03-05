# Appendix D: Open Questions

Issues to resolve in future revisions:

1. **Multi-board / geomorphic maps.** Panzer Blitz and ASL use
   interchangeable map boards composed into different configurations per
   scenario. The format needs a way to define individual boards and
   compose them — including rotation and offset of coordinates.
   The current simplification of the `grid` and the use of reserved 
   identifiers like `@all` provides a natural path for this: a master 
   document could compose several `@board-id` collections into a single 
   coordinate space. 

2. **Terrain type constraints.** Should the format support optional
   constraints on terrain (e.g., "forest requires clear base") to allow
   richer validation?

3. **Road junctions.** Some roads fork inside a hex (entering via one
   edge, exiting via two). The current model assumes linear paths.
   Branching paths may need explicit support.

4. **Partial hexes.** Real maps have partial hexes at boundaries. Should
   these be explicitly marked, or inferred from the physical extent?

5. **Coordinate label schemes.** The current fixed-width pattern logic
   cannot parse variable-width schemes (e.g., A-Z followed by AA-QQ).
   A more robust invertible label function may be required.

6. **HexPath tie-breaking rules.** Should the exact pathing algorithm be 
   normative to ensure identical geometry across implementations?

7. **Feature ordering and performance.** For extremely large maps with
   thousands of features, document order overrides may become a
   performance bottleneck. Should we consider a tiled or spatial index
   for features?
