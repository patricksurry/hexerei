import * as Hex from '../math/hex-math.js';
import { MeshMap } from '../mesh/types.js';
import { HexPathResult } from './types.js';
export interface HexPathOptions {
    labelFormat?: string;
    orientation: Hex.Orientation;
    firstCol?: number;
    firstRow?: number;
    context?: Map<string, string[]>;
}
export declare class HexPath {
    private mesh;
    private options;
    constructor(mesh: MeshMap, options?: Partial<HexPathOptions>);
    /**
     * Resolves a HexPath string into a structured result.
     */
    resolve(path: string): HexPathResult;
    /** Purely syntactic check — does NOT call resolveAtom */
    private isAtomLike;
    private tokenize;
    private resolveAtom;
    private resolveEdge;
    private resolveVertex;
    private getCubeFromId;
    private formatId;
    private inferType;
    private resolveShortestPath;
    private fill;
    private isPointInPolygon;
    private parseDirection;
}
