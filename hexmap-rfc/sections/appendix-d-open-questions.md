# Appendix D: Open Questions

Issues to resolve in future revisions:

1. **Multi-board / geomorphic maps.** Panzer Blitz and ASL use
   interchangeable map boards composed into different configurations per
   scenario. The format needs a way to define individual boards and
   compose them — including rotation and offset of coordinates. This
   could be a `boards` section that lists sub-maps with transforms, or
   a composition document that references separate HexMap files.
   **v1.0 encodes single boards only.** Multi-board composition is
   deferred to a future version. The `tile` terminology is reserved
   for this use.

PDS: we should solve in v1.  Most of the map setup (metadata, terrain, grid) would be shared,
perhaps just allow a list of mapboard: { id: defaults: features: extensions: }  ?

2. **Terrain stacking.** Can a hex have multiple terrain types? (e.g.,
   forest + hill, or road passing through a town). Current model: a
   hex has one `terrain` type plus `elevation` plus `tags`. The layered
   features model allows later entries to override, but not stack.
   Should `terrain` be an array? Or is elevation + tags + properties
   sufficient to capture stacking?

PDS: perhaps distinguish a set of base terrains that are mutually
exclusive (last one applied wins) from 'modifier' terrains which
can stack.  e.g. one of forrest, swamp or plains; but several of road, river, fort?

3. **Road junctions.** Some roads fork inside a hex (entering via one
   edge, exiting via two). The path model assumes linear sequences.
   Solutions: allow branching paths, or decompose into multiple paths
   sharing a waypoint.
PDS: decomposition seems fine

4. **Partial hexes.** Real maps have partial hexes at boundaries. Should
   these be explicitly marked, or inferred from the boundary?
PDS: seems more like a rendering concern, unless they have different play
mechanics?  ie. are they regular hexes that are just clipped at the boundary,
are the excluded from the map (invalid) or somehow special?

5. **River/road intersection semantics.** When a road path crosses a
   river edge, is there an implicit bridge? Or must bridges be
   explicitly annotated as vertex features?
PDS: typically a road would be thru hexes, and river along edges,
with bridge as edge terrain.  we shouldn't build any semantics for
how terrains interact.

6. **Stagger naming.** Is `"low"` / `"high"` intuitive enough? Other
   candidates: `"indent-first"` / `"indent-second"`, or describe the
   visual pattern with a small diagram in the spec. (Diagrams are now
   included in Section 4.3; the naming question remains open.)
PDS: ya, i don't think it's intuitive, which should brainstorm alternatives

7. **Coordinate label patterns.** The `XXYY` / `AY` pattern system is
   simple but limited. Does it cover all real-world wargame labeling
   schemes? What about systems like "hex 3-1204" (board 3, hex 1204)?
   Multi-board notation is deferred to v2.
PDS: let's collect a set of real-world examples and review.  i
think there might also be different alpha counting schems,
e.g. A .. Z, AA, BB, CC, ... vs A .. Z, AA, AB, AC ...
eg. excel style base-26 vs repeating A .., AA ..., AAA ...
in general could use an invertible u/v/w <=> label function but don't really want that complexity

8. **Compact edge notation.** Rivers with many edges are still verbose
   even with `edge_path`. The geometry expression language (Appendix C)
   addresses this for v2.
PDS: yes we should solve for a version of appendix C

9. **Feature ordering guarantees.** The spec says "later entries override."
   Should implementations also support explicit priority/z-order for
   cases where document order isn't the desired precedence?
PDS: worth exploring, but maybe back-references and labeled feature groups would be enough?
seems like there is lots of prior art for how to do stuff like that in other structured doc types
