export type GeometryType = 'hex' | 'edge' | 'vertex';

/**
 * Result of a HexPath resolution.
 * A collection of unique identifiers for hexes, edges, or vertices.
 */
export interface HexPathResult {
    type: GeometryType;
    items: string[];       // deduplicated set of all resolved IDs
    path?: string[];       // traversal order, preserving repeated visits (for line drawing)
    segments?: string[][]; // ordered segments, split at jumps/keywords/excludes
}

/**
 * Metadata for a path item (internal use).
 */
export interface PathItem {
    id: string;
    next?: string;
    prev?: string;
}
