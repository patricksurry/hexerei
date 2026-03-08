import { HexMesh } from '../mesh/hex-mesh.js';
import * as Hex from '../math/hex-math.js';
import { MeshMap } from '../mesh/types.js';
import { HexPathResult, PathItem, GeometryType } from './types.js';

enum ParseMode {
    ADD = '+',
    SUB = '-'
}

interface Cursor {
    lastHex: Hex.Cube | null;
    segmentStart: Hex.Cube | null;
    type: GeometryType | null;
    mode: ParseMode;
    floatingSteps: { dir: number, count: number }[];
    currentSegment: string[];
    isContinuation: boolean;
}

export interface HexPathOptions {
    labelFormat?: string; // "CCRR", "RRCC", "Axx", etc.
    stagger?: Hex.Stagger;
    firstCol?: number;
    firstRow?: number;
    context?: Map<string, string[]>;
}

export class HexPath {
    private mesh: MeshMap;
    private options: HexPathOptions;

    constructor(mesh: MeshMap, options?: HexPathOptions) {
        this.mesh = mesh;
        this.options = {
            labelFormat: options?.labelFormat || "XXYY",
            stagger: options?.stagger ?? Hex.Stagger.Odd,
            firstCol: options?.firstCol ?? 1,
            firstRow: options?.firstRow ?? 1,
            ...options
        };
    }

    /**
     * Resolves a HexPath string into a structured result.
     */
    resolve(path: string): HexPathResult {
        if (path === '@all') {
            return {
                type: 'hex',
                items: Array.from(this.mesh.getAllHexes()).map(a => a.id)
            };
        }

        const items = new Set<string>();
        const cursor: Cursor = { 
            lastHex: null, 
            segmentStart: null, 
            type: null, 
            mode: ParseMode.ADD,
            floatingSteps: [],
            currentSegment: [],
            isContinuation: false
        };

        const tokens = this.tokenize(path);

        const applyIds = (ids: string[]) => {
            if (cursor.mode === ParseMode.ADD) {
                ids.forEach(id => items.add(id));
            } else {
                ids.forEach(id => items.delete(id));
            }
            cursor.currentSegment.push(...ids);
        };

        for (const token of tokens) {
            // Handle Modal Switches
            if (token === '+') {
                cursor.mode = ParseMode.ADD;
                cursor.isContinuation = false; 
                continue;
            }
            if (token === '-') {
                cursor.mode = ParseMode.SUB;
                cursor.isContinuation = false; 
                continue;
            }

            // Handle Jump
            if (token === ',') {
                cursor.lastHex = null;
                cursor.segmentStart = null;
                cursor.currentSegment = [];
                cursor.isContinuation = false;
                continue;
            }

            // Handle Close (;) and Close & Fill (!)
            if (token === ';' || token === '!') {
                if (cursor.segmentStart && cursor.lastHex) {
                    const pathBack = this.resolveShortestPath(cursor.lastHex, cursor.segmentStart);
                    const ids = pathBack.slice(1).map(c => this.formatId(c, cursor.type));
                    applyIds(ids);
                    
                    if (token === '!') {
                        const interior = this.fill(cursor.currentSegment);
                        if (cursor.mode === ParseMode.ADD) {
                            interior.forEach(id => items.add(id));
                        } else {
                            interior.forEach(id => items.delete(id));
                        }
                    }
                }
                cursor.lastHex = null;
                cursor.segmentStart = null;
                cursor.currentSegment = [];
                cursor.isContinuation = false;
                continue;
            }

            // Handle Relative Steps: e.g. 3ne, 1sw
            const stepMatch = token.match(/^(\d*)(n|ne|se|s|sw|nw)$/i);
            if (stepMatch) {
                const count = parseInt(stepMatch[1] || '1');
                const dir = this.parseDirection(stepMatch[2]);

                if (cursor.lastHex) {
                    for (let i = 0; i < count; i++) {
                        cursor.lastHex = Hex.hexNeighbor(cursor.lastHex, dir);
                        applyIds([this.formatId(cursor.lastHex, cursor.type)]);
                    }
                    cursor.isContinuation = true;
                } else {
                    cursor.floatingSteps.push({ dir, count });
                }
                continue;
            }

            // Resolve Atom (Absolute Coordinate or Reference)
            const resolved = this.resolveAtom(token);
            if (resolved) {
                const { id, type } = resolved;
                
                if (cursor.type === null) {
                    cursor.type = type;
                } else if (cursor.type !== type) {
                    throw new Error(`Inconsistent geometry type: expected ${cursor.type}, got ${type}`);
                }

                const cube = this.getCubeFromId(id);
                
                // Resolve Floating Steps
                if (cursor.lastHex === null && cursor.floatingSteps.length > 0) {
                    let startPoint = cube;
                    for (let i = cursor.floatingSteps.length - 1; i >= 0; i--) {
                        const { dir, count } = cursor.floatingSteps[i];
                        const oppositeDir = (dir + 3) % 6;
                        for (let j = 0; j < count; j++) {
                            startPoint = Hex.hexNeighbor(startPoint, oppositeDir);
                        }
                    }
                    cursor.lastHex = startPoint;
                    if (!cursor.segmentStart) cursor.segmentStart = startPoint;
                    applyIds([this.formatId(startPoint, cursor.type)]);

                    for (const { dir, count } of cursor.floatingSteps) {
                        for (let j = 0; j < count; j++) {
                            cursor.lastHex = Hex.hexNeighbor(cursor.lastHex!, dir);
                            applyIds([this.formatId(cursor.lastHex, cursor.type)]);
                        }
                    }
                    cursor.floatingSteps = [];
                    cursor.isContinuation = true;
                }

                if (cursor.lastHex && cursor.isContinuation) {
                    const pathBetween = this.resolveShortestPath(cursor.lastHex, cube);
                    applyIds(pathBetween.slice(1).map(c => this.formatId(c, cursor.type)));
                } else {
                    applyIds([id]);
                    if (!cursor.segmentStart) cursor.segmentStart = cube;
                }

                cursor.lastHex = cube;
                cursor.isContinuation = true;
            }
        }

        return {
            type: cursor.type || 'hex',
            items: Array.from(items)
        };
    }

    private tokenize(path: string): string[] {
        const tokens: string[] = [];
        let current = '';
        for (let i = 0; i < path.length; i++) {
            const char = path[i];
            if (/\s/.test(char)) {
                if (current) tokens.push(current);
                current = '';
            } else if (char === ',' || char === ';' || char === '!' || char === '+' || char === '-') {
                if (current) tokens.push(current);
                tokens.push(char);
                current = '';
            } else if (char === '>') {
                if (current) tokens.push(current);
                current = char;
            } else {
                current += char;
            }
        }
        if (current) tokens.push(current);
        return tokens;
    }

    private resolveAtom(token: string): { id: string, type: GeometryType } | null {
        if (token.startsWith("'") && token.endsWith("'")) token = token.slice(1, -1);
        
        // Canonical Hex ID
        if (/^-?\d+,-?\d+,-?\d+$/.test(token)) {
            return { id: token, type: 'hex' };
        }

        // Alpha1 notation (e.g. A1, B10)
        const alphaMatch = token.match(/^([a-z]+)(\d+)(?:\/|\.|@)?(.*)$/i);
        if (alphaMatch) {
            const colStr = alphaMatch[1].toLowerCase();
            const row = parseInt(alphaMatch[2]);
            let col = 0;
            for (let i = 0; i < colStr.length; i++) {
                col = col * 26 + (colStr.charCodeAt(i) - 'a'.charCodeAt(0) + 1);
            }
            const cube = Hex.offsetToCube(col - 1, row - 1, this.options.stagger);
            const hexId = Hex.hexId(cube);
            
            const suffix = alphaMatch[3];
            const separator = token.includes('/') ? '/' : (token.includes('.') ? '.' : (token.includes('@') ? '@' : ''));
            
            if (separator === '/') return { id: this.resolveEdge(hexId, suffix), type: 'edge' };
            if (separator === '.') return { id: this.resolveVertex(hexId, suffix), type: 'vertex' };
            if (separator === '@') {
                const hour = parseInt(suffix);
                const type = this.inferType(token);
                if (type === 'edge') return { id: this.resolveEdge(hexId, hour.toString()), type: 'edge' };
                if (type === 'vertex') return { id: this.resolveVertex(hexId, hour.toString()), type: 'vertex' };
            }
            return { id: hexId, type: 'hex' };
        }

        // CCRR notation (e.g. 0101)
        const numericMatch = token.match(/^(\d{4})(?:\/|\.|@)?(.*)$/);
        if (numericMatch) {
            const coords = numericMatch[1];
            const format = this.options.labelFormat;
            let col, row;
            if (format === "RRCC") {
                row = parseInt(coords.substring(0, 2));
                col = parseInt(coords.substring(2, 4));
            } else {
                col = parseInt(coords.substring(0, 2));
                row = parseInt(coords.substring(2, 4));
            }
            const cube = Hex.offsetToCube(col - (this.options.firstCol || 1), row - (this.options.firstRow || 1), this.options.stagger);
            const hexId = Hex.hexId(cube);

            const suffix = numericMatch[2];
            const separator = token.includes('/') ? '/' : (token.includes('.') ? '.' : (token.includes('@') ? '@' : ''));
            
            if (separator === '/') return { id: this.resolveEdge(hexId, suffix), type: 'edge' };
            if (separator === '.') return { id: this.resolveVertex(hexId, suffix), type: 'vertex' };
            if (separator === '@') {
                const hour = parseInt(suffix);
                const type = this.inferType(token);
                if (type === 'edge') return { id: this.resolveEdge(hexId, hour.toString()), type: 'edge' };
                if (type === 'vertex') return { id: this.resolveVertex(hexId, hour.toString()), type: 'vertex' };
            }
            return { id: hexId, type: 'hex' };
        }

        return null;
    }

    private resolveEdge(hexId: string, dirOrHour: string): string {
        const cube = Hex.hexFromId(hexId);
        const dirIndex = this.parseDirection(dirOrHour);
        const neighbor = Hex.hexNeighbor(cube, dirIndex);
        return Hex.getCanonicalBoundaryId(cube, neighbor, dirIndex);
    }

    private resolveVertex(hexId: string, dirOrHour: string): string {
        const cube = Hex.hexFromId(hexId);
        const dirIndex = this.parseDirection(dirOrHour);
        return Hex.getCanonicalVertexId(cube, dirIndex);
    }

    private getCubeFromId(id: string): Hex.Cube {
        if (id.includes('|')) return Hex.hexFromId(id.split('|')[0]);
        if (id.includes('^')) return Hex.hexFromId(id.split('^')[0]);
        if (id.includes('@')) return Hex.hexFromId(id.split('@')[0]);
        return Hex.hexFromId(id);
    }

    private formatId(cube: Hex.Cube, type: GeometryType | null): string {
        return Hex.hexId(cube);
    }

    private inferType(token: string): GeometryType {
        if (token.includes('/')) return 'edge';
        if (token.includes('.')) return 'vertex';
        if (token.includes('@')) return 'edge'; 
        return 'hex';
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
                const cube = { q, r, s: -q-r };
                const id = Hex.hexId(cube);
                if (boundarySet.has(id)) continue;

                if (this.isPointInPolygon(cube, hexes)) {
                    interior.push(id);
                }
            }
        }
        return interior;
    }

    private isPointInPolygon(p: Hex.Cube, polygon: Hex.Cube[]): boolean {
        let inside = false;
        const stagger = this.options.stagger ?? Hex.Stagger.Odd;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const vi = polygon[i];
            const vj = polygon[j];

            const pixI = Hex.hexToPixel(vi, 10, stagger);
            const pixJ = Hex.hexToPixel(vj, 10, stagger);
            const pixP = Hex.hexToPixel(p, 10, stagger);

            if (((pixI.y > pixP.y) !== (pixJ.y > pixP.y)) &&
                (pixP.x < (pixJ.x - pixI.x) * (pixP.y - pixI.y) / (pixJ.y - pixI.y) + pixI.x)) {
                inside = !inside;
            }
        }
        return inside;
    }

    private parseDirection(dir: string): number {
        const mapping: Record<string, number> = {
            'ne': 0, 'e': 1, 'se': 2, 'sw': 3, 'w': 4, 'nw': 5,
            'n': 5, 's': 2,
            '1': 0, '2': 1, '4': 2, '5': 3, '7': 3, '8': 4, '10': 5, '11': 0,
            '12': 5, '6': 2
        };
        const val = mapping[dir.toLowerCase()];
        if (val !== undefined) return val;
        const numeric = parseInt(dir);
        if (!isNaN(numeric)) return (numeric % 6 + 6) % 6;
        return 0;
    }
}
