export type GeometryType = 'hex' | 'edge' | 'vertex';

/**
 * Result of a HexPath resolution.
 * A collection of unique identifiers for hexes, edges, or vertices.
 */
export interface HexPathResult {
    type: GeometryType;
    items: string[];
}

/**
 * Metadata for a path item (internal use).
 */
export interface PathItem {
    id: string;
    next?: string;
    prev?: string;
}
