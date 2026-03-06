import { MeshMap, Point, Area, Connection, Boundary } from './types.js';
import * as Hex from '../math/hex-math.js';

export class HexMesh implements MeshMap {
    private _areas = new Map<string, Area>();
    private _boundaries = new Map<string, Boundary>();

    private _stagger: Hex.Stagger;
    private _firstCol: number;
    private _firstRow: number;

    constructor(validHexes: Hex.Cube[], config: { stagger?: Hex.Stagger, firstCol?: number, firstRow?: number, terrain?: Map<string, string> } = {}) {
        this._stagger = config.stagger ?? Hex.Stagger.Odd;
        this._firstCol = config.firstCol ?? 1;
        this._firstRow = config.firstRow ?? 1;

        for (const cube of validHexes) {
            const id = Hex.hexId(cube);
            this._areas.set(id, {
                id,
                terrain: config.terrain?.get(id) ?? 'unknown',
                props: {}
            });
        }
    }

    public get stagger(): Hex.Stagger { return this._stagger; }
    public get firstCol(): number { return this._firstCol; }
    public get firstRow(): number { return this._firstRow; }

    getArea(id: string): Area | undefined {
        return this._areas.get(id);
    }

    getAllAreas(): Iterable<Area> {
        return this._areas.values();
    }

    /**
     * Partially update attributes for an existing area.
     */
    updateArea(id: string, attrs: Partial<Area>): void {
        const area = this._areas.get(id);
        if (area) {
            Object.assign(area, attrs);
        }
    }

    getNeighbors(idOrArea: string | Area): Area[] {
        const id = typeof idOrArea === 'string' ? idOrArea : idOrArea.id;
        const cube = Hex.hexFromId(id);
        const neighbors: Area[] = [];
        for (let i = 0; i < 6; i++) {
            const nCube = Hex.hexNeighbor(cube, i);
            const nId = Hex.hexId(nCube);
            const neighbor = this._areas.get(nId);
            if (neighbor) neighbors.push(neighbor);
        }
        return neighbors;
    }

    getConnection(fromOrId: string | Area, toOrId: string | Area): Connection | undefined {
        const fromArea = typeof fromOrId === 'string' ? this.getArea(fromOrId) : fromOrId;
        const toArea = typeof toOrId === 'string' ? this.getArea(toOrId) : toOrId;

        if (!fromArea || !toArea) return undefined;

        const fromCube = Hex.hexFromId(fromArea.id);
        const toCube = Hex.hexFromId(toArea.id);

        if (!Hex.isAdjacent(fromCube, toCube)) return undefined;

        const boundaryId = Hex.getCanonicalBoundaryId(fromCube, toCube);
        let boundary = this._boundaries.get(boundaryId);
        if (!boundary) {
            const areas: [Area, Area] = fromArea.id < toArea.id ? [fromArea, toArea] : [toArea, fromArea];
            boundary = { id: boundaryId, areas };
            this._boundaries.set(boundaryId, boundary);
        }

        return { from: fromArea, to: toArea, boundary };
    }

    getBoundaryLoop(idOrArea: string | Area): Boundary[] {
        const id = typeof idOrArea === 'string' ? idOrArea : idOrArea.id;
        const fromArea = this._areas.get(id);
        if (!fromArea) return [];

        const cube = Hex.hexFromId(id);
        const boundaries: Boundary[] = [];
        for (let dir = 0; dir < 6; dir++) {
            const neighborCube = Hex.hexNeighbor(cube, dir);
            const neighborId = Hex.hexId(neighborCube);
            const neighborArea = this._areas.get(neighborId);

            const boundaryId = Hex.getCanonicalBoundaryId(cube, neighborCube, dir);
            let boundary = this._boundaries.get(boundaryId);
            if (!boundary) {
                if (!neighborArea) {
                    boundary = { id: boundaryId, areas: [fromArea, null] };
                } else {
                    const areas: [Area, Area] = fromArea.id < neighborId ? [fromArea, neighborArea] : [neighborArea, fromArea];
                    boundary = { id: boundaryId, areas };
                }
                this._boundaries.set(boundaryId, boundary);
            }
            boundaries.push(boundary);
        }
        return boundaries;
    }
}
