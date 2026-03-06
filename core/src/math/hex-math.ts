/**
 * Pure mathematical functions for Hexagonal Grids using Cube Coordinates.
 * Based on Red Blob Games algorithms.
 */

// Directions: 0=NE, 1=E, 2=SE, 3=SW, 4=W, 5=NW (Flat-top reference)
// NOTE: RFC might imply different winding, checking standard consistent winding is key.
// Let's assume standard CCW or CW? Reference implementation usually picks one.
// Let's use the vectors from standard cube coord systems (q+r+s=0).
// neighbors = [
//    [+1, -1, 0], [+1, 0, -1], [0, +1, -1],
//    [-1, +1, 0], [-1, 0, +1], [0, -1, +1]
// ]
// We need to verify standard mapping to "North/South" etc later.

export type Cube = { q: number, r: number, s: number };

export const DIRECTIONS: Cube[] = [
    { q: 1, r: -1, s: 0 },  // 0
    { q: 1, r: 0, s: -1 },  // 1
    { q: 0, r: 1, s: -1 },  // 2
    { q: -1, r: 1, s: 0 },  // 3
    { q: -1, r: 0, s: 1 },  // 4
    { q: 0, r: -1, s: 1 },  // 5
];

export function createHex(q: number, r: number, s?: number): Cube {
    const sVal = s ?? (-q - r);
    if (Math.abs(q + r + sVal) > 0.001) throw new Error(`Invalid cube coords: ${q},${r},${sVal}`);
    return { q, r, s: sVal };
}

export function hexAdd(a: Cube, b: Cube): Cube {
    return { q: a.q + b.q, r: a.r + b.r, s: a.s + b.s };
}

export function hexNeighbor(hex: Cube, direction: number): Cube {
    const dir = DIRECTIONS[(direction % 6 + 6) % 6];
    return hexAdd(hex, dir);
}

export function hexId(hex: Cube): string {
    return `${hex.q},${hex.r},${hex.s}`;
}

export function hexFromId(id: string): Cube {
    const parts = id.split(',').map(Number);
    if (parts.length !== 3) throw new Error(`Invalid hex ID: ${id}`);
    return createHex(parts[0], parts[1], parts[2]);
}

/**
 * Returns a canonical ID for the boundary between two hexes.
 * Sorts the hex IDs to ensure (A,B) gives same ID as (B,A).
 */
export function getCanonicalBoundaryId(a: Cube, b: Cube | null, dirFromA?: number): string {
    if (!b) {
        if (dirFromA === undefined) throw new Error("Direction required for map edge boundary ID");
        return `${hexId(a)}|VOID|${dirFromA}`;
    }
    const idA = hexId(a);
    const idB = hexId(b);
    return idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`;
}

/**
 * Returns a canonical ID for a Vertex (Junction).
 * A vertex touches 3 hexes (in infinite grid).
 * Identified by the 3 hex IDs sorted.
 * 
 * Note: Map edges / corners might have <3 hexes. 
 * We might need a more robust Vertex coordinate system (e.g. Dual coordinates).
 * 
 * Standard approach: Vertex is consistent relative to a hex. 
 * "Hex + VertexIndex(0..5)".
 * Canonicalize by finding the neighbor hexes and sorting?
 */
export function getVertexId(hex: Cube, corner: number): string {
    // TODO: Implement robust Vertex canonicalization.
    return `${hexId(hex)}@${corner}`; // Placeholder
}

/**
 * Convert Offset coordinates (col, row) to Cube coordinates (q, r, s).
 * Supports Flat-Top, Odd-Q (Stagger-High? Need to check spec).
 * RFC Spec:
 * Flat-top: x = col, z = row - (col - (col&1)) / 2  (for stagger low/odd-q?)
 * Let's implement generic with flags.
 */
/**
 * Standard Offset coordinate systems.
 * "Odd-Q" = Odd columns shoved down. (Stagger Low?)
 * "Even-Q" = Even columns shoved down. (Stagger High? if Odd are up)
 */
export enum Stagger {
    Odd = 1, // Odd-Q
    Even = -1 // Even-Q
}

export function offsetToCube(col: number, row: number, stagger: Stagger = Stagger.Odd): Cube {
    const q = col;
    // Odd-Q: r = row - (col - (col&1)) / 2
    // Even-Q: r = row - (col + (col&1)) / 2
    const offset = stagger === Stagger.Odd ? (col - (col & 1)) : (col + (col & 1));
    const r = row - (offset) / 2;
    return createHex(q, r, -q - r);
}

export function cubeToOffset(hex: Cube, stagger: Stagger = Stagger.Odd): Point {
    const col = hex.q;
    // Odd-Q: row = r + (col - (col&1)) / 2
    // Even-Q: row = r + (col + (col&1)) / 2
    const offset = stagger === Stagger.Odd ? (col - (col & 1)) : (col + (col & 1));
    const row = hex.r + (offset) / 2;
    return { x: col, y: row };
}

export function createRectangularGrid(cols: number, rows: number, stagger: Stagger = Stagger.Odd, firstCol: number = 1, firstRow: number = 1): Cube[] {
    const hexes: Cube[] = [];
    for (let c = firstCol; c < firstCol + cols; c++) {
        for (let r = firstRow; r < firstRow + rows; r++) {
            hexes.push(offsetToCube(c - firstCol, r - firstRow, stagger));
        }
    }
    return hexes;
}

export interface Point { x: number, y: number }

export function hexToPixel(hex: Cube, size: number): Point {
    // Flat-top conversion
    const x = size * (3 / 2 * hex.q);
    const y = size * (Math.sqrt(3) / 2 * hex.q + Math.sqrt(3) * hex.r);
    return { x, y };
}

export function hexDistance(a: Cube, b: Cube): number {
    return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.s - b.s)) / 2;
}

export function isAdjacent(a: Cube, b: Cube): boolean {
    return hexDistance(a, b) === 1;
}

export function hexLerp(a: Cube, b: Cube, t: number): Cube {
    return createHex(
        a.q * (1 - t) + b.q * t,
        a.r * (1 - t) + b.r * t,
        a.s * (1 - t) + b.s * t
    );
}

export function hexRound(cube: Cube): Cube {
    let q = Math.round(cube.q);
    let r = Math.round(cube.r);
    let s = Math.round(cube.s);

    const qDiff = Math.abs(q - cube.q);
    const rDiff = Math.abs(r - cube.r);
    const sDiff = Math.abs(s - cube.s);

    if (qDiff > rDiff && qDiff > sDiff) {
        q = -r - s;
    } else if (rDiff > sDiff) {
        r = -q - s;
    } else {
        s = -q - r;
    }

    return { q, r, s };
}

export function hexLine(a: Cube, b: Cube): Cube[] {
    const dist = hexDistance(a, b);
    const results: Cube[] = [];
    for (let i = 0; i <= dist; i++) {
        results.push(hexRound(hexLerp(a, b, dist === 0 ? 0 : i / dist)));
    }
    return results;
}
