# Appendix C: Open Questions (Non-Normative)

The following areas are candidates for future format revisions or require 
further implementation experience before being formalized in a normative 
specification.

1. **Multi-board / geomorphic maps.** Some wargames use interchangeable 
   map boards (e.g., ASL) sharing a common geometry and vocabulary. 

   - **Proposal (Shared Vocabulary):** A `HexmapLibrary` or `HexmapSystem` 
     object could define shared `terrain_types` and `layout` templates. 
     Individual maps then reference this library and only specify local 
     features.
   - **Proposal (Scenario Composition):** A `Scenario` document could 
     compose multiple boards into a single master coordinate space using 
     cube coordinate offsets and 60-degree rotations.

2. **Variable-width coordinate label schemes.** The current fixed-width 
   pattern logic cannot parse schemes like A-Z followed by AA-QQ. 

   - **Proposal (Sequence Generators):** Extend the `labels` field to accept 
     sequence generators like `columns: "A..ZZ"` (A, B, ..., Z, AA, ..., AZ, 
     BA, ..., ZZ). 
   - **Proposal (Explicit Sequences):** Allow an explicit array of labels for 
     irregular layouts: `columns: ["A", "B", ..., "Z", "AA", ...]`.

3. **Geographic reference naming.** While the `georeference` object 
   captures the key physical mapping parameters, the exact naming and 
   structure for anchoring remains **provisional**. Future refinement 
   is expected to improve alignment with GIS standards (e.g., GeoJSON, 
   WKT) and real-world map data.