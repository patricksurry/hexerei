/**
 * Pure mathematical functions for Hexagonal Grids using Cube Coordinates.
 * Based on Red Blob Games algorithms.
 */
export type Cube = {
    q: number;
    r: number;
    s: number;
};
export declare const DIRECTIONS: Cube[];
export declare const DIRECTION_NAMES: {
    flat: string[];
    pointy: string[];
};
export declare function directionIndex(name: string, top: 'flat' | 'pointy'): number;
export declare function directionName(index: number, top: 'flat' | 'pointy'): string;
export declare function createHex(q: number, r: number, s?: number): Cube;
export declare function hexAdd(a: Cube, b: Cube): Cube;
export declare function hexNeighbor(hex: Cube, direction: number): Cube;
export declare function hexId(hex: Cube): string;
export declare function hexFromId(id: string): Cube;
/**
 * Returns a canonical ID for the boundary between two hexes.
 * Sorts the hex IDs to ensure (A,B) gives same ID as (B,A).
 */
export declare function getCanonicalBoundaryId(a: Cube, b: Cube | null, dirFromA?: number): string;
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
export declare function getCanonicalVertexId(hex: Cube, corner: number): string;
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
export declare function orientationTop(o: Orientation): HexOrientation;
declare enum Stagger {
    Odd = 1,// Odd-Q or Odd-R
    Even = -1
}
export declare function orientationStagger(o: Orientation): Stagger;
export declare function defaultNudge(o: Orientation): 1 | -1;
export declare function offsetToCube(col: number, row: number, orientation?: Orientation): Cube;
export declare function cubeToOffset(cube: Cube, orientation?: Orientation): Point;
export declare function createRectangularGrid(cols: number, rows: number, orientation?: Orientation, firstCol?: number, firstRow?: number): Cube[];
export interface Point {
    x: number;
    y: number;
}
export type HexOrientation = 'flat' | 'pointy';
export declare function hexToPixel(hex: Cube, size: number, orientation?: HexOrientation): Point;
export declare function pixelToHex(point: Point, size: number, orientation?: HexOrientation): Cube;
export declare function hexCorners(center: Point, size: number, orientation?: HexOrientation): Point[];
export declare function hexEdgeMidpoints(center: Point, size: number, orientation?: HexOrientation): Point[];
export declare function hexDistance(a: Cube, b: Cube): number;
export declare function isAdjacent(a: Cube, b: Cube): boolean;
export declare function hexLerp(a: Cube, b: Cube, t: number): Cube;
export declare function hexRound(cube: Cube): Cube;
export declare function hexLine(a: Cube, b: Cube, nudge?: 1 | -1): Cube[];
export declare function parseBoundaryId(id: string): {
    hexA: Cube;
    hexB: Cube | null;
    direction?: number;
};
export declare function parseVertexId(id: string): Cube[];
export declare function formatHexLabel(hex: Cube, labelFormat: string, orientation: Orientation, firstCol?: number, firstRow?: number): string;
export declare function vertexPoint(hex: Cube, corner: number, size: number, orientation: HexOrientation): Point;
export declare function edgeEndpoints(hex: Cube, direction: number, size: number, orientation: HexOrientation): [Point, Point];
export {};
