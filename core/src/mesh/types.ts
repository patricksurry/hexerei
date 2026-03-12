/**
 * Gameplay API Specification - Abstract Map Topology.
 */


/**
 * Represents a discrete hex in the mesh with its attributes.
 */
export interface HexArea {
    id: string;
    terrain: string;
    props: Record<string, any>;
    label?: string;
    elevation?: number;
}

/**
 * Represents the edge between two hexes.
 */
export interface Edge {
    id: string;
    hexes: [HexArea, HexArea | null];
}

/**
 * Represents a vertex where hexes meet.
 */
export interface Vertex {
    id: string;
    hexes: HexArea[];
}

export interface Connection {
    edge: Edge;
    from: HexArea;
    to: HexArea;
}

/**
 * Minimal Mesh interface for HexPath resolution.
 */
export interface MeshMap {
    getHex(id: string): HexArea | undefined;
    getAllHexes(): Iterable<HexArea>;
    
    // Topology helpers
    getNeighbors(idOrHex: string | HexArea): HexArea[];
    getEdgeLoop(idOrHex: string | HexArea): Edge[];

    // Metadata
    layout: any;
}
