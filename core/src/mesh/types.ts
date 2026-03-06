/**
 * Gameplay API Specification - Abstract Map Topology.
 */

export interface Point {
    x: number;
    y: number;
}



/**
 * Represents a discrete area (hex) in the mesh with its attributes.
 */
export interface Area {
    id: string;
    terrain: string;
    props: Record<string, any>;
    label?: string;
    elevation?: number;
}

/**
 * Minimal Mesh interface for HexPath resolution.
 */
export interface Boundary {
    id: string;
    areas: [Area, Area | null];
}

export interface Connection {
    boundary: Boundary;
    from: Area;
    to: Area;
}

/**
 * Minimal Mesh interface for HexPath resolution.
 */
export interface MeshMap {
    // Lookups return Area objects or undefined
    getArea(id: string): Area | undefined;
    getAllAreas(): Iterable<Area>;
    
    // Topology helpers
    getNeighbors(idOrArea: string | Area): Area[];
    getBoundaryLoop(idOrArea: string | Area): Boundary[];
}
