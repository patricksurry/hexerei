import * as Hex from '../math/hex-math.js';
export class HexMesh {
    _hexes = new Map();
    _edges = new Map();
    _orientation;
    _firstCol;
    _firstRow;
    layout;
    constructor(validHexes, config = {}) {
        this.layout = config.layout || { orientation: 'flat-down', all: '@all' };
        this._orientation = config.orientation ?? this.layout.orientation ?? 'flat-down';
        this._firstCol = config.firstCol ?? 1;
        this._firstRow = config.firstRow ?? 1;
        for (const cube of validHexes) {
            const id = Hex.hexId(cube);
            this._hexes.set(id, {
                id,
                terrain: config.terrain?.get(id) ?? 'unknown',
                props: {}
            });
        }
    }
    get orientation() { return this._orientation; }
    get stagger() { return Hex.orientationStagger(this._orientation); }
    get firstCol() { return this._firstCol; }
    get firstRow() { return this._firstRow; }
    getHex(id) {
        return this._hexes.get(id);
    }
    getAllHexes() {
        return this._hexes.values();
    }
    /**
     * Partially update attributes for an existing hex.
     */
    updateHex(id, attrs) {
        const hex = this._hexes.get(id);
        if (hex) {
            Object.assign(hex, attrs);
        }
    }
    getNeighbors(idOrHex) {
        const id = typeof idOrHex === 'string' ? idOrHex : idOrHex.id;
        const cube = Hex.hexFromId(id);
        const neighbors = [];
        for (let i = 0; i < 6; i++) {
            const nCube = Hex.hexNeighbor(cube, i);
            const nId = Hex.hexId(nCube);
            const neighbor = this._hexes.get(nId);
            if (neighbor)
                neighbors.push(neighbor);
        }
        return neighbors;
    }
    getConnection(fromOrId, toOrId) {
        const fromHex = typeof fromOrId === 'string' ? this.getHex(fromOrId) : fromOrId;
        const toHex = typeof toOrId === 'string' ? this.getHex(toOrId) : toOrId;
        if (!fromHex || !toHex)
            return undefined;
        const fromCube = Hex.hexFromId(fromHex.id);
        const toCube = Hex.hexFromId(toHex.id);
        if (!Hex.isAdjacent(fromCube, toCube))
            return undefined;
        const edgeId = Hex.getCanonicalBoundaryId(fromCube, toCube);
        let edge = this._edges.get(edgeId);
        if (!edge) {
            const hexes = fromHex.id < toHex.id ? [fromHex, toHex] : [toHex, fromHex];
            edge = { id: edgeId, hexes };
            this._edges.set(edgeId, edge);
        }
        return { from: fromHex, to: toHex, edge };
    }
    getEdgeLoop(idOrHex) {
        const id = typeof idOrHex === 'string' ? idOrHex : idOrHex.id;
        const fromHex = this._hexes.get(id);
        if (!fromHex)
            return [];
        const cube = Hex.hexFromId(id);
        const edges = [];
        for (let dir = 0; dir < 6; dir++) {
            const neighborCube = Hex.hexNeighbor(cube, dir);
            const neighborId = Hex.hexId(neighborCube);
            const neighborHex = this._hexes.get(neighborId);
            const edgeId = Hex.getCanonicalBoundaryId(cube, neighborCube, dir);
            let edge = this._edges.get(edgeId);
            if (!edge) {
                if (!neighborHex) {
                    edge = { id: edgeId, hexes: [fromHex, null] };
                }
                else {
                    const hexes = fromHex.id < neighborId ? [fromHex, neighborHex] : [neighborHex, fromHex];
                    edge = { id: edgeId, hexes };
                }
                this._edges.set(edgeId, edge);
            }
            edges.push(edge);
        }
        return edges;
    }
}
