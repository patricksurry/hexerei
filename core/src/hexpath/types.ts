/**
 * Result of a HexPath resolution.
 * A flat list of items that maintains path connectivity via links.
 */
export interface HexPathResult {
    type: 'hex' | 'edge' | 'vertex';
    items: PathItem[];
}

export interface PathItem {
    id: string;
    /**
     * The ID of the next element in the path segment.
     * If undefined, this is the end of a segment or a singleton (filled item).
     */
    next?: string;
    /**
     * The ID of the previous element in the path segment.
     */
    prev?: string;
}
