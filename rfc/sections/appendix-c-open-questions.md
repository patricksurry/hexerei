# Appendix C: Open Questions (Non-Normative)

The following areas are candidates for future format revisions or require 
further implementation experience before being formalized in a normative 
specification.

1. **Multi-board / geomorphic maps.** Some wargames use interchangeable 
   map boards composed into different configurations per scenario. The 
   format needs a way to define individual boards and compose them — 
   including rotation and offset of coordinates. The current 
   simplification of the `layout` and the use of reserved identifiers like 
   `@all` provides a natural path for this: a master document could 
   compose several `@board-id` collections into a single coordinate space.

2. **Variable-width coordinate label schemes.** The current fixed-width 
   pattern logic cannot parse variable-width schemes (e.g., A-Z followed 
   by AA-QQ). Support for A...Z, AA...AZ, BA...BZ as well as 
   A...Z, AA..ZZ, AAA...ZZZ, ... as column (or less likely row) label 
   formats SHOULD be explored to improve flexibility.

3. **Normative HexPath tie-breaking rules.** The exact pathing algorithm 
   MUST be normative to ensure identical geometry across 
   implementations. The current HexPath DSL specification provides basic 
   rules, but more detailed pathing rules may be necessary for complex 
   tie-breaking scenarios.

PDS: above is resolve, or at least in progress

4. **Geographic reference naming.** While the `georef` object captures
   the key physical mapping parameters, the exact naming and structure 
   for anchoring may need refinement for better alignment with existing 
   GIS standards (e.g., GeoJSON, WKT).
