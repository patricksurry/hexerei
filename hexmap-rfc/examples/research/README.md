# Hex Map Research Collection

This directory contains reference images of map boards from diverse hex-and-counter (and related) games. These examples serve to stress-test the **HexMap** schema and provide inspiration for feature support.

## Collected Examples

### 1. Combat Commander: Europe (Tactical)
*   **Filename**: `combat_commander_europe.png`
*   **Scale**: Tactical (Squad/Team level).
*   **Grid**: Hexagonal overlay on illustrated terrain.
*   **Key Features**:
    *   Detailed terrain types (Woods, Buildings, Roads).
    *   Line of Sight (LOS) markings often implicit or explicit.
    *   Multi-hex buildings.

### 2. Holland '44 (Operational)
*   **Filename**: `holland_44.png`
*   **Scale**: Operational (Battalion/Company).
*   **Grid**: Standard Hex.
*   **Key Features**:
    *   **ZOC Bonds**: Terrain and zone of control interactions.
    *   River crossings (Bridges, Ferries).
    *   Polder/Dyke terrain specific to the Netherlands.

### 3. Twilight Imperium 4 (Strategic/Sci-Fi)
*   **Filename**: `twilight_imperium_4.png`
*   **Scale**: Galactic (Systems).
*   **Grid**: Modular Hex Tiles (System Tiles).
*   **Key Features**:
    *   **Reconfigurable Board**: The galaxy is built from individual hex tiles.
    *   Wormholes (Adjacency modifiers).
    *   Planets within hexes (Sub-locations).

### 4. Advanced Squad Leader (Tactical)
*   **Filename**: `advanced_squad_leader.png`
*   **Scale**: Tactical.
*   **Grid**: Geomorphic Map Boards.
*   **Key Features**:
    *   **Geomorphic**: Boards can be arranged in any orientation/combination.
    *   Dense terrain rules (Elevation, LOS obstacles).
    *   building levels (2-story houses).

### 5. The Russian Campaign (Strategic/Operational)
*   **Filename**: `the_russian_campaign.png`
*   **Scale**: Strategic (Corps/Army).
*   **Grid**: Hex (Standard).
*   **Key Features**:
    *   Weather effects (often track-based but affects movement).
    *   Rail lines (Strategic movement).
    *   Vast open spaces (Steppe).

### 6. Memoir '44 (Tactical/Simple)
*   **Filename**: `memoir_44.png`
*   **Scale**: Tactical (Simplified).
*   **Grid**: Large Hexes (Terrain Tiles).
*   **Key Features**:
    *   **Terrain Tiles**: Hex-shaped feature tiles placed on a blank board.
    *   Three distinct sections (Left, Center, Right).
    *   Obstacles (Sandbags, Wire) as separate elements.

## Schema Implications

*   **Modular/Geomorphic Support**: Essential for TI4 and ASL. Our `MeshMap` could support "sub-maps" or "tile placement" logic.
*   **Sub-Hex Locations**: Planets in TI4 or Buildings in ASL imply a need for `features` or `points_of_interest` within a `hex`.
*   **Adjacency Modifiers**: Wormholes (TI4) and Bridges (Holland '44) require robust `Junction` or `Boundary` definitions, or explicit graph edges.
*   **Terrain Layers**: Memoir '44 shows the need for a "Base Board" + "Terrain Overlay" approach.
