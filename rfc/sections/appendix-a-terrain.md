# Appendix A: Conventional Terrain Vocabulary (Non-Normative)

The following terrain type identifiers are RECOMMENDED for broad interoperability.
These conventions are drawn from traditional hex-based wargames and board games across various eras and scales.
Maps are not required to use these exact identifiers, but following these conventions improves data interchange.

## Hex terrain types

| Identifier | Name | Typical games |
|------------|------|---------------|
| `clear` | Clear / Open | All |
| `forest` | Forest / Woods | All |
| `light_woods` | Light Woods / Orchard | Tactical |
| `rough` | Rough / Broken | Many |
| `swamp` | Swamp / Marsh | Many |
| `mountain` | Mountain | Operational+ |
| `desert` | Desert | North Africa / Sci-Fi |
| `city` | City / Town | All |
| `major_city` | Major City | Operational+ |
| `village` | Village | Tactical |
| `water` | Water / Lake | Many |
| `ocean` | Ocean / Sea | Naval, coastal |
| `farmland` | Farmland / Fields | Tactical |
| `bocage` | Bocage | WWII / Tactical |
| `major_river` | Major River (hex-filling) | Operational+ |

## Edge terrain types

| Identifier | Name | Directed? | Typical games |
|------------|------|-----------|---------------|
| `river` | River | no | Most |
| `major_river` | Major / Wide River | no | Operational+ |
| `stream` | Stream / Creek | no | Tactical |
| `cliff` | Cliff / Escarpment | **yes** | Many |
| `slope` | Slope / Elevation Change | **yes** | Tactical |
| `wall` | Wall (stone, etc.) | no | Tactical |
| `hedge` | Hedge | no | Tactical |
| `bocage` | Bocage (edge) | no | WWII / Tactical |
| `ford` | Ford | no | Many |
| `impassable` | Impassable Hexside | no | Various |

## Vertex terrain types

| Identifier | Name | Typical games |
|------------|------|---------------|
| `bridge` | Bridge | Many |
| `ford` | Ford | Many |
| `crossroads` | Crossroads | Tactical |

## Linear Features (Roads, Rivers, etc.)

Linear features can be represented using either hex or edge geometry. The choice of geometry determines the feature's physical location on the map:

1. **Hex-centered paths**: Features that pass through the center of hexes (e.g., roads, railroads). These are represented as **Hex Collections**.
2. **Edge-based paths**: Features that follow the boundaries between hexes (e.g., rivers, streams). These are represented as **Edge Collections**.

Recommended identifiers for linear features:

| Identifier | Name | Recommended Geometry |
|------------|------|----------------------|
| `road` | Road (primary) | Hex |
| `secondary_road` | Secondary Road / Track | Hex |
| `trail` | Trail | Hex or Edge |
| `railroad` | Railroad | Hex |
| `river` | River / Stream | Edge |
| `major_river` | Major River | Hex or Edge |
| `canal` | Canal | Hex or Edge |
