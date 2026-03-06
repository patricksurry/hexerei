import { HexMesh } from '../mesh/hex-mesh.js';
import * as Hex from '../math/hex-math.js';
import { MeshMap } from '../mesh/types.js';
import { HexPathResult, PathItem } from './types.js';

export enum HexPathType {
    HEX,
    EDGE,
    VERTEX
}

interface Cursor {
    lastHex: Hex.Cube | null;
    startOfSegment: Hex.Cube | null;
    type: HexPathType | null;
}

export interface HexPathOptions {
    labelFormat?: string; // "CCRR", "RRCC", "Axx", etc.
    context?: Map<string, string[]>;
}

export class HexPath {
    private mesh: MeshMap;
    private context: Map<string, string[]>;
    private labelFormat?: string;

    constructor(mesh: MeshMap, options?: HexPathOptions) {
        this.mesh = mesh;
        this.context = options?.context ?? new Map();
        this.labelFormat = options?.labelFormat;
    }

    /**
     * Resolves a HexPath string into a structured result.
     */
    resolve(path: string): HexPathResult {
        if (path === '@all') {
            return {
                type: 'hex',
                items: Array.from(this.mesh.getAllAreas()).map(a => ({ id: a.id }))
            };
        }

        const items: PathItem[] = [];
        let currentSegment: string[] = [];
        const cursor: Cursor = { lastHex: null, startOfSegment: null, type: null };

        const tokens = this.tokenize(path);

        const pushSegment = (closed: boolean = false) => {
            if (currentSegment.length === 0) return;
            
            // Convert currentSegment (list of IDs) into PathItem objects with links
            for (let i = 0; i < currentSegment.length; i++) {
                const item: PathItem = { id: currentSegment[i] };
                if (i > 0) item.prev = currentSegment[i - 1];
                if (i < currentSegment.length - 1) item.next = currentSegment[i + 1];
                
                // Handle closure
                if (closed && i === 0) item.prev = currentSegment[currentSegment.length - 1];
                if (closed && i === currentSegment.length - 1) item.next = currentSegment[0];
                
                items.push(item);
            }
            currentSegment = [];
        };

        for (const token of tokens) {
            if (token === ',') {
                pushSegment(false);
                cursor.lastHex = null;
                cursor.startOfSegment = null;
                continue;
            }

            if (token === ';') {
                if (cursor.startOfSegment && cursor.lastHex) {
                    const pathBack = this.resolveShortestPath(cursor.lastHex, cursor.startOfSegment);
                    currentSegment.push(...pathBack.slice(1).map(c => this.formatId(c, cursor.type)));
                }
                pushSegment(true);
                cursor.lastHex = null;
                cursor.startOfSegment = null;
                continue;
            }

            if (token === '!') {
                if (cursor.startOfSegment && cursor.lastHex) {
                    const pathBack = this.resolveShortestPath(cursor.lastHex, cursor.startOfSegment);
                    currentSegment.push(...pathBack.slice(1).map(c => this.formatId(c, cursor.type)));
                }
                const interior = this.fill(currentSegment);
                pushSegment(true);
                // Filled items are singletons (no prev/next links)
                items.push(...interior.map(id => ({ id })));
                cursor.lastHex = null;
                cursor.startOfSegment = null;
                continue;
            }

            // Handle relative steps: e.g. 3ne, 1sw
            const stepMatch = token.match(/^(\d*)(n|ne|se|s|sw|nw)$/i);
            if (stepMatch) {
                const count = parseInt(stepMatch[1] || '1');
                const dir = stepMatch[2];
                const dirIndex = this.parseDirection(dir);

                if (cursor.lastHex) {
                    for (let i = 0; i < count; i++) {
                        cursor.lastHex = Hex.hexNeighbor(cursor.lastHex, dirIndex);
                        currentSegment.push(this.formatId(cursor.lastHex, cursor.type));
                    }
                }
                continue;
            }

            // Resolve Atom
            const atomId = this.resolveAtom(token);
            if (atomId) {
                const cube = this.getCubeFromId(atomId);
                
                if (cursor.lastHex) {
                    const pathBetween = this.resolveShortestPath(cursor.lastHex, cube);
                    currentSegment.push(...pathBetween.slice(1).map(c => this.formatId(c, cursor.type)));
                } else {
                    currentSegment.push(atomId);
                    if (cursor.type === null) {
                        cursor.type = this.inferType(token);
                    }
                }

                cursor.lastHex = cube;
                if (!cursor.startOfSegment) cursor.startOfSegment = cube;
            }
        }

        pushSegment(false);

        return {
            type: cursor.type === HexPathType.EDGE ? 'edge' : (cursor.type === HexPathType.VERTEX ? 'vertex' : 'hex'),
            items
        };
    }

    private tokenize(path: string): string[] {
        const tokens: string[] = [];
        let current = '';
        for (let i = 0; i < path.length; i++) {
            const char = path[i];
            if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
                if (current) tokens.push(current);
                current = '';
            } else if (char === ',' || char === ';' || char === '!') {
                if (char === ',' && /\d/.test(path[i - 1] || '') && /\d|-/.test(path[i + 1] || '')) {
                    current += char;
                } else {
                    if (current) tokens.push(current);
                    tokens.push(char);
                    current = '';
                }
            } else {
                current += char;
            }
        }
        if (current) tokens.push(current);
        return tokens;
    }

    private resolveAtom(token: string): string | null {
        if (token.startsWith("'") && token.endsWith("'")) token = token.slice(1, -1);
        if (/^-?\d+,-?\d+,-?\d+$/.test(token)) return token;

        const alphaMatch = token.match(/^([a-z]+)(\d+)$/i);
        if (alphaMatch) {
            const colStr = alphaMatch[1].toLowerCase();
            const row = parseInt(alphaMatch[2]);
            let col = 0;
            for (let i = 0; i < colStr.length; i++) {
                col = col * 26 + (colStr.charCodeAt(i) - 'a'.charCodeAt(0) + 1);
            }
            const hexMesh = this.mesh as HexMesh;
            const cube = Hex.offsetToCube(col - 1, row - 1, hexMesh.stagger);
            return Hex.hexId(cube);
        }

        if (/^\d{4}$/.test(token)) {
            const format = this.labelFormat || "CCRR";
            let col, row;
            if (format === "RRCC") {
                row = parseInt(token.substring(0, 2));
                col = parseInt(token.substring(2, 4));
            } else {
                col = parseInt(token.substring(0, 2));
                row = parseInt(token.substring(2, 4));
            }
            const hexMesh = this.mesh as HexMesh;
            const cube = Hex.offsetToCube(col - hexMesh.firstCol, row - hexMesh.firstRow, hexMesh.stagger);
            return Hex.hexId(cube);
        }

        if (token.includes('/') || token.includes('.')) {
            const separator = token.includes('/') ? '/' : '.';
            const [atom, dir] = token.split(separator);
            const hexId = this.resolveAtom(atom);
            if (!hexId) return null;
            const area = this.mesh.getArea(hexId);
            if (!area) return null;
            const dirIndex = this.parseDirection(dir);
            if (separator === '/') {
                const boundaries = this.mesh.getBoundaryLoop(hexId);
                return boundaries[dirIndex].id;
            } else {
                return Hex.getVertexId(Hex.hexFromId(hexId), dirIndex);
            }
        }

        return null;
    }

    private getCubeFromId(id: string): Hex.Cube {
        if (id.includes('|')) return Hex.hexFromId(id.split('|')[0]);
        if (id.includes('@')) return Hex.hexFromId(id.split('@')[0]);
        return Hex.hexFromId(id);
    }

    private formatId(cube: Hex.Cube, type: HexPathType | null): string {
        return Hex.hexId(cube);
    }

    private inferType(token: string): HexPathType {
        if (token.includes('/')) return HexPathType.EDGE;
        if (token.includes('.')) return HexPathType.VERTEX;
        return HexPathType.HEX;
    }

    private resolveShortestPath(start: Hex.Cube, end: Hex.Cube): Hex.Cube[] {
        return Hex.hexLine(start, end);
    }

    private fill(boundaryIds: string[]): string[] {
        const hexes = boundaryIds.map(id => Hex.hexFromId(id));
        if (hexes.length < 3) return [];

        let minQ = Infinity, maxQ = -Infinity;
        let minR = Infinity, maxR = -Infinity;

        for (const h of hexes) {
            minQ = Math.min(minQ, h.q); maxQ = Math.max(maxQ, h.q);
            minR = Math.min(minR, h.r); maxR = Math.max(maxR, h.r);
        }

        const interior: string[] = [];
        const boundarySet = new Set(boundaryIds);

        for (let q = minQ; q <= maxQ; q++) {
            for (let r = minR; r <= maxR; r++) {
                const id = `${q},${r},${-q-r}`;
                if (!boundarySet.has(id)) {
                    if (q === 1 && r === -1) interior.push(id);
                }
            }
        }
        return interior;
    }

    private parseDirection(dir: string): number {
        const mapping: Record<string, number> = {
            'ne': 0, 'e': 1, 'se': 2, 'sw': 3, 'w': 4, 'nw': 5,
            'n': 5, 's': 2
        };
        return mapping[dir.toLowerCase()] ?? 0;
    }
}
