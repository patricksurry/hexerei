/**
 * Pure mathematical functions for Hexagonal Grids using Cube Coordinates.
 * Based on Red Blob Games algorithms.
 */

// Directions: 0=NE, 1=SE, 2=S, 3=SW, 4=NW, 5=N (Flat-top, clockwise from NE)
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
/**
 * Returns a canonical ID for a Vertex (Junction).
 * A vertex touches 3 hexes (in infinite grid).
 * Identified by the 3 hex IDs sorted.
 */
export function getCanonicalVertexId(hex: Cube, corner: number): string {
    const n1 = hexNeighbor(hex, corner);
    const n2 = hexNeighbor(hex, (corner + 1) % 6);
    const ids = [hexId(hex), hexId(n1), hexId(n2)].sort();
    return ids.join('^');
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
export type Orientation = 'flat-down' | 'flat-up' | 'pointy-right' | 'pointy-left';

export function orientationTop(o: Orientation): HexOrientation {
    return o.startsWith('flat') ? 'flat' : 'pointy';
}

enum Stagger {
    Odd = 1, // Odd-Q or Odd-R
    Even = -1 // Even-Q or Even-R
}

export function orientationStagger(o: Orientation): Stagger {
    return (o === 'flat-down' || o === 'pointy-right') ? Stagger.Odd : Stagger.Even;
}

export function defaultNudge(o: Orientation): 1 | -1 {
    return (o === 'flat-down' || o === 'pointy-right') ? 1 : -1;
}

export function offsetToCube(col: number, row: number, orientation: Orientation = 'flat-down'): Cube {
    const stagger = orientationStagger(orientation);
    const top = orientationTop(orientation);

    if (top === 'flat') {
        const q = col;
        let r;
        if (stagger === Stagger.Odd) {
            r = row - (col - (col & 1)) / 2;
        } else {
            r = row - (col + (col & 1)) / 2;
        }
        return createHex(q, r, -q - r);
    } else {
        const r = row;
        let q;
        if (stagger === Stagger.Odd) {
            q = col - (row - (row & 1)) / 2;
        } else {
            q = col - (row + (row & 1)) / 2;
        }
        return createHex(q, r, -q - r);
    }
}

export function cubeToOffset(cube: Cube, orientation: Orientation = 'flat-down'): Point {
    const stagger = orientationStagger(orientation);
    const top = orientationTop(orientation);

    if (top === 'flat') {
        const col = cube.q;
        let row;
        if (stagger === Stagger.Odd) {
            row = cube.r + (cube.q - (cube.q & 1)) / 2;
        } else {
            row = cube.r + (cube.q + (cube.q & 1)) / 2;
        }
        return { x: col, y: row };
    } else {
        const row = cube.r;
        let col;
        if (stagger === Stagger.Odd) {
            col = cube.q + (cube.r - (cube.r & 1)) / 2;
        } else {
            col = cube.q + (cube.r + (cube.r & 1)) / 2;
        }
        return { x: col, y: row };
    }
}

export function createRectangularGrid(cols: number, rows: number, orientation: Orientation = 'flat-down', firstCol: number = 0, firstRow: number = 0): Cube[] {
    const hexes: Cube[] = [];
    for (let c = firstCol; c < firstCol + cols; c++) {
        for (let r = firstRow; r < firstRow + rows; r++) {
            hexes.push(offsetToCube(c, r, orientation));
        }
    }
    return hexes;
}

export interface Point { x: number, y: number }

export type HexOrientation = 'flat' | 'pointy';

export function hexToPixel(hex: Cube, size: number, orientation: HexOrientation = 'flat'): Point {
    if (orientation === 'flat') {
        const x = size * (3 / 2 * hex.q);
        const y = size * (Math.sqrt(3) / 2 * hex.q + Math.sqrt(3) * hex.r);
        return { x, y };
    } else {
        const x = size * (Math.sqrt(3) * hex.q + Math.sqrt(3) / 2 * hex.r);
        const y = size * (3 / 2 * hex.r);
        return { x, y };
    }
}

export function pixelToHex(point: Point, size: number, orientation: HexOrientation = 'flat'): Cube {
    let q: number, r: number;
    if (orientation === 'flat') {
        q = (2 / 3 * point.x) / size;
        r = (-1 / 3 * point.x + Math.sqrt(3) / 3 * point.y) / size;
    } else {
        q = (Math.sqrt(3) / 3 * point.x - 1 / 3 * point.y) / size;
        r = (2 / 3 * point.y) / size;
    }
    return hexRound({ q, r, s: -q - r });
}

export function hexCorners(center: Point, size: number, orientation: HexOrientation = 'flat'): Point[] {
    const corners: Point[] = [];
    for (let i = 0; i < 6; i++) {
        const angle_deg = orientation === 'flat' ? 60 * i : 60 * i + 30;
        const angle_rad = Math.PI / 180 * angle_deg;
        corners.push({
            x: center.x + size * Math.cos(angle_rad),
            y: center.y + size * Math.sin(angle_rad)
        });
    }
    return corners;
}

export function hexEdgeMidpoints(center: Point, size: number, orientation: HexOrientation = 'flat'): Point[] {
    const corners = hexCorners(center, size, orientation);
    const midpoints: Point[] = [];
    for (let i = 0; i < 6; i++) {
        const c1 = corners[i];
        const c2 = corners[(i + 1) % 6];
        midpoints.push({
            x: (c1.x + c2.x) / 2,
            y: (c1.y + c2.y) / 2
        });
    }
    return midpoints;
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

    return {
        q: q === 0 ? 0 : q,
        r: r === 0 ? 0 : r,
        s: s === 0 ? 0 : s
    };
}

export function hexLine(a: Cube, b: Cube): Cube[] {
    const dist = hexDistance(a, b);
    const results: Cube[] = [];
    for (let i = 0; i <= dist; i++) {
        results.push(hexRound(hexLerp(a, b, dist === 0 ? 0 : i / dist)));
    }
    return results;
}
