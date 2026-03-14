import { MeshMap, HexArea, Connection, Edge } from './types.js';
import * as Hex from '../math/hex-math.js';
import type { HexMapLayout } from '../format/types.js';
export interface HexMeshConfig {
    orientation?: Hex.Orientation;
    firstCol?: number;
    firstRow?: number;
    terrain?: Map<string, string>;
    layout?: HexMapLayout;
}
export declare class HexMesh implements MeshMap {
    private _hexes;
    private _edges;
    private _orientation;
    private _firstCol;
    private _firstRow;
    layout: HexMapLayout;
    constructor(validHexes: Hex.Cube[], config?: HexMeshConfig);
    get orientation(): Hex.Orientation;
    get stagger(): number;
    get firstCol(): number;
    get firstRow(): number;
    getHex(id: string): HexArea | undefined;
    getAllHexes(): Iterable<HexArea>;
    /**
     * Partially update attributes for an existing hex.
     */
    updateHex(id: string, attrs: Partial<HexArea>): void;
    getNeighbors(idOrHex: string | HexArea): HexArea[];
    getConnection(fromOrId: string | HexArea, toOrId: string | HexArea): Connection | undefined;
    getEdgeLoop(idOrHex: string | HexArea): Edge[];
}
