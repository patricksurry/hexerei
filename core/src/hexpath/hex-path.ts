import * as Hex from '../math/hex-math.js';
import { MeshMap } from '../mesh/types.js';
import { HexPathResult, GeometryType } from './types.js';

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
    flipNudge: boolean;
}

export interface HexPathOptions {
    labelFormat?: string; // "CCRR", "RRCC", "Axx", etc.
    orientation: Hex.Orientation;
    firstCol?: number;
    firstRow?: number;
    context?: Map<string, string[]>;
}

export class HexPath {
    private mesh: MeshMap;
    private options: HexPathOptions;

    constructor(mesh: MeshMap, options?: Partial<HexPathOptions>) {
        this.mesh = mesh;
        const layout = mesh.layout || {};
        this.options = {
            labelFormat: options?.labelFormat || layout.label || layout.coordinates?.label || "XXYY",
            orientation: options?.orientation ?? layout.orientation ?? 'flat-down',
            firstCol: options?.firstCol ?? layout.coordinates?.first?.[0] ?? 1,
            firstRow: options?.firstRow ?? layout.coordinates?.first?.[1] ?? 1,
            context: options?.context,
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
        const pathOrder: string[] = [];  // traversal order, preserving repeated visits
        const cursor: Cursor = {
            lastHex: null,
            segmentStart: null,
            type: null,
            mode: ParseMode.ADD,
            floatingSteps: [],
            currentSegment: [],
            isContinuation: false,
            flipNudge: false
        };

        const tokens = this.tokenize(path);

        const applyIds = (ids: string[]) => {
            if (cursor.mode === ParseMode.ADD) {
                ids.forEach(id => { items.add(id); pathOrder.push(id); });
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

            // Handle Flip Nudge
            if (token === '~') {
                cursor.flipNudge = true;
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
                    const pathBack = this.resolveShortestPath(cursor.lastHex, cursor.segmentStart, cursor.flipNudge);
                    const ids = pathBack.slice(1).map(c => this.formatId(c, cursor.type));
                    cursor.flipNudge = false;
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

            // Handle Relative Steps: e.g. 3ne, 1sw, 3*s
            const stepMatch = token.match(/^(\d*)\*?(n|ne|se|s|sw|nw|e|w)$/i);
            if (stepMatch) {
                const count = parseInt(stepMatch[1] || '1');
                const dir = this.parseDirection(stepMatch[2]);
                cursor.flipNudge = false; // Reset if leading ~ followed by step? 
                // Plan doesn't specify ~ on steps, but let's reset just in case.


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
                    const pathBetween = this.resolveShortestPath(cursor.lastHex, cube, cursor.flipNudge);
                    applyIds(pathBetween.slice(1).map(c => this.formatId(c, cursor.type)));
                } else {
                    applyIds([id]);
                    if (!cursor.segmentStart) cursor.segmentStart = cube;
                }

                cursor.lastHex = cube;
                cursor.isContinuation = true;
                cursor.flipNudge = false; // Reset after atom
            }
        }

        return {
            type: cursor.type || 'hex',
            items: Array.from(items),
            path: pathOrder
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
            } else if (char === ',' || char === ';' || char === '!' || char === '+' || char === '-' || char === '~') {
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
            // Use raw col/row directly - offsetToCube handles stagger parity correctly for Alpha1
            const cube = Hex.offsetToCube(col, row, this.options.orientation);
            const hexId = Hex.hexId(cube);
            
            const suffix = alphaMatch[3];
            const separator = token.includes('/') ? '/' : (token.includes('.') ? '.' : (token.includes('@') ? '@' : ''));
            
            if (separator === '/') {
                if (!suffix) return null;
                return { id: this.resolveEdge(hexId, suffix), type: 'edge' };
            }
            if (separator === '.') {
                if (!suffix) return null;
                return { id: this.resolveVertex(hexId, suffix), type: 'vertex' };
            }
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
            // Use raw col/row directly - offsetToCube handles stagger parity
            const cube = Hex.offsetToCube(col, row, this.options.orientation);
            const hexId = Hex.hexId(cube);

            const suffix = numericMatch[2];
            const separator = token.includes('/') ? '/' : (token.includes('.') ? '.' : (token.includes('@') ? '@' : ''));
            
            if (separator === '/') {
                if (!suffix) return null;
                return { id: this.resolveEdge(hexId, suffix), type: 'edge' };
            }
            if (separator === '.') {
                if (!suffix) return null;
                return { id: this.resolveVertex(hexId, suffix), type: 'vertex' };
            }
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

    private formatId(cube: Hex.Cube, _type: GeometryType | null): string {
        return Hex.hexId(cube);
    }

    private inferType(token: string): GeometryType {
        if (token.includes('/')) return 'edge';
        if (token.includes('.')) return 'vertex';
        if (token.includes('@')) return 'edge'; 
        return 'hex';
    }

    private resolveShortestPath(start: Hex.Cube, end: Hex.Cube, flip: boolean = false): Hex.Cube[] {
        const base = Hex.defaultNudge(this.options.orientation);
        // Parity correction: ensures constant-row (flat) or constant-col (pointy)
        // paths always resolve to the axis-preserving hex. Uses min(a, b) for
        // reversal symmetry. See spec §7 for the full formula.
        const minCoord = Hex.orientationTop(this.options.orientation) === 'flat'
            ? Math.min(start.q, end.q)
            : Math.min(start.r, end.r);
        const parity = (((minCoord % 2) + 2) % 2 === 1) ? 1 : -1;
        let nudge = (base * parity) as 1 | -1;
        if (flip) nudge = (nudge === 1 ? -1 : 1);
        return Hex.hexLine(start, end, nudge);
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
        const orientation = Hex.orientationTop(this.options.orientation);
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const vi = polygon[i];
            const vj = polygon[j];

            const pixI = Hex.hexToPixel(vi, 10, orientation);
            const pixJ = Hex.hexToPixel(vj, 10, orientation);
            const pixP = Hex.hexToPixel(p, 10, orientation);

            if (((pixI.y > pixP.y) !== (pixJ.y > pixP.y)) &&
                (pixP.x < (pixJ.x - pixI.x) * (pixP.y - pixI.y) / (pixJ.y - pixI.y) + pixI.x)) {
                inside = !inside;
            }
        }
        return inside;
    }

    private parseDirection(dir: string): number {
        // DIRECTIONS index → vector → flat-top name → pointy-top name
        //   0: (1,-1, 0)  NE   E
        //   1: (1, 0,-1)  SE   NE
        //   2: (0, 1,-1)  S    NW
        //   3: (-1,1, 0)  SW   W
        //   4: (-1,0, 1)  NW   SW
        //   5: (0,-1, 1)  N    SE
        const top = Hex.orientationTop(this.options.orientation);
        const d = dir.toLowerCase();

        // Compass → DIRECTIONS index, orientation-dependent
        const flatMapping: Record<string, number> = {
            'ne': 0, 'se': 1, 's': 2, 'sw': 3, 'nw': 4, 'n': 5,
        };
        const pointyMapping: Record<string, number> = {
            'e': 0, 'ne': 1, 'nw': 2, 'w': 3, 'sw': 4, 'se': 5,
        };

        // Validate orientation-specific cardinals
        if ((d === 'e' || d === 'w') && top === 'flat') {
            throw new Error(`Invalid direction: ${d} is not valid for flat-top grids`);
        }
        if ((d === 'n' || d === 's') && top === 'pointy') {
            throw new Error(`Invalid direction: ${d} is not valid for pointy-top grids`);
        }

        const mapping = top === 'flat' ? flatMapping : pointyMapping;
        const val = mapping[d];
        if (val !== undefined) return val;

        // Clock hours → DIRECTIONS index
        // Flat-top: edges at even hours (CW from 12=N)
        // Pointy-top: edges at odd hours (CW from 1=NE)
        const clockMappingFlat: Record<string, number> = {
            '12': 5, '2': 0, '4': 1, '6': 2, '8': 3, '10': 4
        };
        const clockMappingPointy: Record<string, number> = {
            '1': 1, '3': 0, '5': 5, '7': 4, '9': 3, '11': 2
        };

        if (top === 'flat' && clockMappingFlat[d] !== undefined) return clockMappingFlat[d];
        if (top === 'pointy' && clockMappingPointy[d] !== undefined) return clockMappingPointy[d];

        const numeric = parseInt(dir);
        if (!isNaN(numeric)) return (numeric % 6 + 6) % 6;
        return 0;
    }
}
