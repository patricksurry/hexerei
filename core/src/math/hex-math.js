/**
 * Pure mathematical functions for Hexagonal Grids using Cube Coordinates.
 * Based on Red Blob Games algorithms.
 */
export const DIRECTIONS = [
    { q: 1, r: -1, s: 0 }, // 0: NE (Flat), E (Pointy)
    { q: 1, r: 0, s: -1 }, // 1: SE (Flat), NE (Pointy)
    { q: 0, r: 1, s: -1 }, // 2: S (Flat), NW (Pointy)
    { q: -1, r: 1, s: 0 }, // 3: SW (Flat), W (Pointy)
    { q: -1, r: 0, s: 1 }, // 4: NW (Flat), SW (Pointy)
    { q: 0, r: -1, s: 1 }, // 5: N (Flat), SE (Pointy)
];
export const DIRECTION_NAMES = {
    flat: ['ne', 'se', 's', 'sw', 'nw', 'n'],
    pointy: ['e', 'se', 'sw', 'w', 'nw', 'ne']
};
export function directionIndex(name, top) {
    return DIRECTION_NAMES[top].indexOf(name.toLowerCase());
}
export function directionName(index, top) {
    const arr = DIRECTION_NAMES[top];
    return arr[((index % 6) + 6) % 6];
}
export function createHex(q, r, s) {
    const sVal = s ?? (-q - r);
    if (Math.abs(q + r + sVal) > 0.001)
        throw new Error(`Invalid cube coords: ${q},${r},${sVal}`);
    return { q, r, s: sVal };
}
export function hexAdd(a, b) {
    return { q: a.q + b.q, r: a.r + b.r, s: a.s + b.s };
}
export function hexNeighbor(hex, direction) {
    const dir = DIRECTIONS[(direction % 6 + 6) % 6];
    return hexAdd(hex, dir);
}
export function hexId(hex) {
    return `${hex.q},${hex.r},${hex.s}`;
}
export function hexFromId(id) {
    const parts = id.split(',').map(Number);
    if (parts.length !== 3)
        throw new Error(`Invalid hex ID: ${id}`);
    return createHex(parts[0], parts[1], parts[2]);
}
/**
 * Returns a canonical ID for the boundary between two hexes.
 * Sorts the hex IDs to ensure (A,B) gives same ID as (B,A).
 */
export function getCanonicalBoundaryId(a, b, dirFromA) {
    if (!b) {
        if (dirFromA === undefined)
            throw new Error("Direction required for map edge boundary ID");
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
export function getCanonicalVertexId(hex, corner) {
    const n1 = hexNeighbor(hex, corner);
    const n2 = hexNeighbor(hex, (corner + 1) % 6);
    const ids = [hexId(hex), hexId(n1), hexId(n2)].sort();
    return ids.join('^');
}
export function orientationTop(o) {
    return o.startsWith('flat') ? 'flat' : 'pointy';
}
var Stagger;
(function (Stagger) {
    Stagger[Stagger["Odd"] = 1] = "Odd";
    Stagger[Stagger["Even"] = -1] = "Even"; // Even-Q or Even-R
})(Stagger || (Stagger = {}));
export function orientationStagger(o) {
    return (o === 'flat-down' || o === 'pointy-right') ? Stagger.Odd : Stagger.Even;
}
export function defaultNudge(o) {
    return (o === 'flat-down' || o === 'pointy-right') ? 1 : -1;
}
export function offsetToCube(col, row, orientation = 'flat-down') {
    const stagger = orientationStagger(orientation);
    const top = orientationTop(orientation);
    if (top === 'flat') {
        const q = col;
        let r;
        if (stagger === Stagger.Odd) {
            r = row - (col - (col & 1)) / 2;
        }
        else {
            r = row - (col + (col & 1)) / 2;
        }
        return createHex(q, r, -q - r);
    }
    else {
        const r = row;
        let q;
        if (stagger === Stagger.Odd) {
            q = col - (row - (row & 1)) / 2;
        }
        else {
            q = col - (row + (row & 1)) / 2;
        }
        return createHex(q, r, -q - r);
    }
}
export function cubeToOffset(cube, orientation = 'flat-down') {
    const stagger = orientationStagger(orientation);
    const top = orientationTop(orientation);
    if (top === 'flat') {
        const col = cube.q;
        let row;
        if (stagger === Stagger.Odd) {
            row = cube.r + (cube.q - (cube.q & 1)) / 2;
        }
        else {
            row = cube.r + (cube.q + (cube.q & 1)) / 2;
        }
        return { x: col, y: row };
    }
    else {
        const row = cube.r;
        let col;
        if (stagger === Stagger.Odd) {
            col = cube.q + (cube.r - (cube.r & 1)) / 2;
        }
        else {
            col = cube.q + (cube.r + (cube.r & 1)) / 2;
        }
        return { x: col, y: row };
    }
}
export function createRectangularGrid(cols, rows, orientation = 'flat-down', firstCol = 0, firstRow = 0) {
    const hexes = [];
    for (let c = firstCol; c < firstCol + cols; c++) {
        for (let r = firstRow; r < firstRow + rows; r++) {
            hexes.push(offsetToCube(c, r, orientation));
        }
    }
    return hexes;
}
export function hexToPixel(hex, size, orientation = 'flat') {
    if (orientation === 'flat') {
        const x = size * (3 / 2 * hex.q);
        const y = size * (Math.sqrt(3) / 2 * hex.q + Math.sqrt(3) * hex.r);
        return { x, y };
    }
    else {
        const x = size * (Math.sqrt(3) * hex.q + Math.sqrt(3) / 2 * hex.r);
        const y = size * (3 / 2 * hex.r);
        return { x, y };
    }
}
export function pixelToHex(point, size, orientation = 'flat') {
    let q, r;
    if (orientation === 'flat') {
        q = (2 / 3 * point.x) / size;
        r = (-1 / 3 * point.x + Math.sqrt(3) / 3 * point.y) / size;
    }
    else {
        q = (Math.sqrt(3) / 3 * point.x - 1 / 3 * point.y) / size;
        r = (2 / 3 * point.y) / size;
    }
    return hexRound({ q, r, s: -q - r });
}
export function hexCorners(center, size, orientation = 'flat') {
    const corners = [];
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
export function hexEdgeMidpoints(center, size, orientation = 'flat') {
    const corners = hexCorners(center, size, orientation);
    const midpoints = [];
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
export function hexDistance(a, b) {
    return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.s - b.s)) / 2;
}
export function isAdjacent(a, b) {
    return hexDistance(a, b) === 1;
}
export function hexLerp(a, b, t) {
    return createHex(a.q * (1 - t) + b.q * t, a.r * (1 - t) + b.r * t, a.s * (1 - t) + b.s * t);
}
export function hexRound(cube) {
    let q = Math.round(cube.q);
    let r = Math.round(cube.r);
    let s = Math.round(cube.s);
    const qDiff = Math.abs(q - cube.q);
    const rDiff = Math.abs(r - cube.r);
    const sDiff = Math.abs(s - cube.s);
    if (qDiff > rDiff && qDiff > sDiff) {
        q = -r - s;
    }
    else if (rDiff > sDiff) {
        r = -q - s;
    }
    else {
        s = -q - r;
    }
    return {
        q: q === 0 ? 0 : q,
        r: r === 0 ? 0 : r,
        s: s === 0 ? 0 : s
    };
}
export function hexLine(a, b, nudge = 1) {
    const dist = hexDistance(a, b);
    const results = [];
    const eps = 1e-6;
    for (let i = 0; i <= dist; i++) {
        const t = dist === 0 ? 0 : i / dist;
        const frac = hexLerp(a, b, t);
        const biased = {
            q: frac.q + eps * nudge, // coefficient +1
            s: frac.s + 2 * eps * nudge, // coefficient +2  (s = v = diagonal axis)
            r: frac.r - 3 * eps * nudge, // coefficient −3  (r = w = row-like axis)
        };
        results.push(hexRound(biased));
    }
    return results;
}
export function parseBoundaryId(id) {
    const parts = id.split('|');
    if (parts.length === 3 && parts[1] === 'VOID') {
        return { hexA: hexFromId(parts[0]), hexB: null, direction: parseInt(parts[2], 10) };
    }
    if (parts.length === 2 && parts[1].startsWith('VOID/')) {
        return { hexA: hexFromId(parts[0]), hexB: null, direction: parseInt(parts[1].split('/')[1], 10) };
    }
    if (parts.length === 2 && parts[1].startsWith('dir/')) {
        return { hexA: hexFromId(parts[0]), hexB: null, direction: parseInt(parts[1].split('/')[1], 10) };
    }
    return { hexA: hexFromId(parts[0]), hexB: hexFromId(parts[1]) };
}
export function parseVertexId(id) {
    const parts = id.split('^');
    return parts.map(hexFromId);
}
export function formatHexLabel(hex, labelFormat, orientation, firstCol = 1, firstRow = 1) {
    const offset = cubeToOffset(hex, orientation);
    const colStr = String(offset.x).padStart(2, '0');
    const rowStr = String(offset.y).padStart(2, '0');
    return `${colStr}${rowStr}`;
}
export function vertexPoint(hex, corner, size, orientation) {
    const center = hexToPixel(hex, size, orientation);
    const corners = hexCorners(center, size, orientation);
    return corners[corner % 6];
}
export function edgeEndpoints(hex, direction, size, orientation) {
    const corner1 = orientation === 'flat' ? (direction + 5) % 6 : (direction + 4) % 6;
    const corner2 = (corner1 + 1) % 6;
    return [
        vertexPoint(hex, corner1, size, orientation),
        vertexPoint(hex, corner2, size, orientation)
    ];
}
