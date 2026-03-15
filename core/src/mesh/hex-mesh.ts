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

export class HexMesh implements MeshMap {
  private _hexes = new Map<string, HexArea>();

  private _edges = new Map<string, Edge>();

  private _orientation: Hex.Orientation;

  private _firstCol: number;

  private _firstRow: number;

  public layout: HexMapLayout;

  constructor(validHexes: Hex.Cube[], config: HexMeshConfig = {}) {
    this.layout = config.layout || { orientation: 'flat-down', all: '@all' };
    this._orientation = config.orientation ?? this.layout.orientation ?? 'flat-down';
    this._firstCol = config.firstCol ?? 1;
    this._firstRow = config.firstRow ?? 1;

    for (const cube of validHexes) {
      const id = Hex.hexId(cube);
      this._hexes.set(id, {
        id,
        terrain: config.terrain?.get(id) ?? 'unknown',
        props: {},
      });
    }
  }

  public get orientation(): Hex.Orientation {
    return this._orientation;
  }

  public get stagger(): number {
    return Hex.orientationStagger(this._orientation);
  }

  public get firstCol(): number {
    return this._firstCol;
  }

  public get firstRow(): number {
    return this._firstRow;
  }

  getHex(id: string): HexArea | undefined {
    return this._hexes.get(id);
  }

  getAllHexes(): Iterable<HexArea> {
    return this._hexes.values();
  }

  /**
   * Partially update attributes for an existing hex.
   */
  updateHex(id: string, attrs: Partial<HexArea>): void {
    const hex = this._hexes.get(id);
    if (hex) {
      Object.assign(hex, attrs);
    }
  }

  getNeighbors(idOrHex: string | HexArea): HexArea[] {
    const id = typeof idOrHex === 'string' ? idOrHex : idOrHex.id;
    const cube = Hex.hexFromId(id);
    const neighbors: HexArea[] = [];
    for (let i = 0; i < 6; i++) {
      const nCube = Hex.hexNeighbor(cube, i);
      const nId = Hex.hexId(nCube);
      const neighbor = this._hexes.get(nId);
      if (neighbor) neighbors.push(neighbor);
    }
    return neighbors;
  }

  getConnection(fromOrId: string | HexArea, toOrId: string | HexArea): Connection | undefined {
    const fromHex = typeof fromOrId === 'string' ? this.getHex(fromOrId) : fromOrId;
    const toHex = typeof toOrId === 'string' ? this.getHex(toOrId) : toOrId;

    if (!fromHex || !toHex) return undefined;

    const fromCube = Hex.hexFromId(fromHex.id);
    const toCube = Hex.hexFromId(toHex.id);

    if (!Hex.isAdjacent(fromCube, toCube)) return undefined;

    const edgeId = Hex.getCanonicalBoundaryId(fromCube, toCube);
    let edge = this._edges.get(edgeId);
    if (!edge) {
      const hexes: [HexArea, HexArea] = fromHex.id < toHex.id ? [fromHex, toHex] : [toHex, fromHex];
      edge = { id: edgeId, hexes };
      this._edges.set(edgeId, edge);
    }

    return { from: fromHex, to: toHex, edge };
  }

  getEdgeLoop(idOrHex: string | HexArea): Edge[] {
    const id = typeof idOrHex === 'string' ? idOrHex : idOrHex.id;
    const fromHex = this._hexes.get(id);
    if (!fromHex) return [];

    const cube = Hex.hexFromId(id);
    const edges: Edge[] = [];
    for (let dir = 0; dir < 6; dir++) {
      const neighborCube = Hex.hexNeighbor(cube, dir);
      const neighborId = Hex.hexId(neighborCube);
      const neighborHex = this._hexes.get(neighborId);

      const edgeId = Hex.getCanonicalBoundaryId(cube, neighborCube, dir);
      let edge = this._edges.get(edgeId);
      if (!edge) {
        if (!neighborHex) {
          edge = { id: edgeId, hexes: [fromHex, null] };
        } else {
          const hexes: [HexArea, HexArea] =
            fromHex.id < neighborId ? [fromHex, neighborHex] : [neighborHex, fromHex];
          edge = { id: edgeId, hexes };
        }
        this._edges.set(edgeId, edge);
      }
      edges.push(edge);
    }
    return edges;
  }
}
