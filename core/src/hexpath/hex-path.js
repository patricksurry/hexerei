import * as Hex from '../math/hex-math.js';
var ParseMode;
(function (ParseMode) {
    ParseMode["ADD"] = "include";
    ParseMode["SUB"] = "exclude";
})(ParseMode || (ParseMode = {}));
export class HexPath {
    mesh;
    options;
    constructor(mesh, options) {
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
    resolve(path) {
        if (path === '@all') {
            return {
                type: 'hex',
                items: Array.from(this.mesh.getAllHexes()).map(a => a.id),
                segments: []
            };
        }
        const items = new Set();
        const pathOrder = [];
        const segments = [];
        const cursor = {
            lastHex: null,
            segmentStart: null,
            type: null,
            mode: ParseMode.ADD,
            floatingSteps: [],
            currentSegment: [],
            pendingConnector: 'none'
        };
        const tokens = this.tokenize(path);
        /** Remove all occurrences of an id from pathOrder */
        const removeFromPathOrder = (id) => {
            let idx;
            while ((idx = pathOrder.indexOf(id)) !== -1) {
                pathOrder.splice(idx, 1);
            }
        };
        /** Remove excluded IDs from existing segments, splitting as needed */
        const splitSegmentsOnExclude = (excludedIds) => {
            const newSegments = [];
            for (const seg of segments) {
                let current = [];
                for (const id of seg) {
                    if (excludedIds.has(id)) {
                        if (current.length > 0) {
                            newSegments.push(current);
                            current = [];
                        }
                    }
                    else {
                        current.push(id);
                    }
                }
                if (current.length > 0) {
                    newSegments.push(current);
                }
            }
            segments.length = 0;
            segments.push(...newSegments);
        };
        const applyIds = (ids) => {
            if (cursor.mode === ParseMode.ADD) {
                ids.forEach(id => { items.add(id); pathOrder.push(id); });
                cursor.currentSegment.push(...ids);
            }
            else {
                const excludedSet = new Set();
                ids.forEach(id => {
                    items.delete(id);
                    removeFromPathOrder(id);
                    excludedSet.add(id);
                });
                splitSegmentsOnExclude(excludedSet);
            }
        };
        /** Flush the current segment to the segments array */
        const flushSegment = () => {
            if (cursor.currentSegment.length > 0) {
                segments.push([...cursor.currentSegment]);
            }
        };
        const handleCloseOrFill = (flip, doFill) => {
            if (cursor.segmentStart && cursor.lastHex) {
                const pathBack = this.resolveShortestPath(cursor.lastHex, cursor.segmentStart, flip);
                const ids = pathBack.slice(1).map(c => this.formatId(c, cursor.type));
                applyIds(ids);
                if (doFill) {
                    const interior = this.fill(cursor.currentSegment);
                    if (cursor.mode === ParseMode.ADD) {
                        interior.forEach(id => items.add(id));
                    }
                    else {
                        interior.forEach(id => {
                            items.delete(id);
                            removeFromPathOrder(id);
                        });
                    }
                }
            }
            flushSegment();
            cursor.lastHex = null;
            cursor.segmentStart = null;
            cursor.currentSegment = [];
            cursor.pendingConnector = 'none';
        };
        for (const token of tokens) {
            if (token === 'include') {
                flushSegment();
                cursor.mode = ParseMode.ADD;
                cursor.lastHex = null;
                cursor.segmentStart = null;
                cursor.currentSegment = [];
                continue;
            }
            if (token === 'exclude') {
                flushSegment();
                cursor.mode = ParseMode.SUB;
                cursor.lastHex = null;
                cursor.segmentStart = null;
                cursor.currentSegment = [];
                continue;
            }
            if (token === '-' || token === '~') {
                // Validate: no consecutive connectors
                if (cursor.pendingConnector !== 'none') {
                    throw new Error(`Consecutive connectors: '${token}' follows a pending connector`);
                }
                // Allow connector when floating steps are pending (e.g. '1n - 0101')
                // Validate: connector requires a left-hand operand (or pending floating steps)
                if (cursor.lastHex === null && cursor.floatingSteps.length === 0) {
                    throw new Error(`Connector '${token}' has no left-hand operand`);
                }
                cursor.pendingConnector = token === '-' ? 'standard' : 'flipped';
                continue;
            }
            if (token === ',') {
                flushSegment();
                cursor.lastHex = null;
                cursor.segmentStart = null;
                cursor.currentSegment = [];
                cursor.pendingConnector = 'none';
                continue;
            }
            if (token === 'close') {
                handleCloseOrFill(false, false);
                continue;
            }
            if (token === '~close') {
                handleCloseOrFill(true, false);
                continue;
            }
            if (token === 'fill') {
                handleCloseOrFill(false, true);
                continue;
            }
            if (token === '~fill') {
                handleCloseOrFill(true, true);
                continue;
            }
            const stepMatch = token.match(/^(\d*)\*?(n|ne|se|s|sw|nw|e|w)$/i);
            if (stepMatch) {
                const count = parseInt(stepMatch[1] || '1');
                const dir = this.parseDirection(stepMatch[2]);
                if (cursor.lastHex) {
                    if (cursor.pendingConnector === 'none') {
                        flushSegment();
                        cursor.segmentStart = null;
                        cursor.currentSegment = [];
                    }
                    // Capture the first stepped hex for correct segment anchor
                    let firstStepped = null;
                    for (let i = 0; i < count; i++) {
                        cursor.lastHex = Hex.hexNeighbor(cursor.lastHex, dir);
                        if (i === 0)
                            firstStepped = cursor.lastHex;
                        applyIds([this.formatId(cursor.lastHex, cursor.type)]);
                    }
                    if (!cursor.segmentStart && firstStepped)
                        cursor.segmentStart = firstStepped;
                }
                else {
                    cursor.floatingSteps.push({ dir, count });
                }
                cursor.pendingConnector = 'none';
                continue;
            }
            const resolved = this.resolveAtom(token);
            if (resolved) {
                const { id, type } = resolved;
                if (cursor.type === null)
                    cursor.type = type;
                else if (cursor.type !== type)
                    throw new Error(`Inconsistent geometry type: expected ${cursor.type}, got ${type}`);
                const cube = this.getCubeFromId(id);
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
                    if (!cursor.segmentStart)
                        cursor.segmentStart = startPoint;
                    applyIds([this.formatId(startPoint, cursor.type)]);
                    for (const { dir, count } of cursor.floatingSteps) {
                        for (let j = 0; j < count; j++) {
                            cursor.lastHex = Hex.hexNeighbor(cursor.lastHex, dir);
                            applyIds([this.formatId(cursor.lastHex, cursor.type)]);
                        }
                    }
                    cursor.floatingSteps = [];
                }
                if (cursor.lastHex && cursor.pendingConnector !== 'none') {
                    const flip = cursor.pendingConnector === 'flipped';
                    const pathBetween = this.resolveShortestPath(cursor.lastHex, cube, flip);
                    applyIds(pathBetween.slice(1).map(c => this.formatId(c, cursor.type)));
                }
                else {
                    flushSegment();
                    cursor.segmentStart = cube;
                    cursor.currentSegment = [];
                    applyIds([id]);
                }
                cursor.lastHex = cube;
                cursor.pendingConnector = 'none';
            }
            else {
                throw new Error(`Unrecognized token: '${token}'`);
            }
        }
        // Flush final segment
        flushSegment();
        return {
            type: cursor.type || 'hex',
            items: Array.from(items),
            path: pathOrder,
            segments
        };
    }
    /** Purely syntactic check — does NOT call resolveAtom */
    isAtomLike(token) {
        // Relative steps: 3n, 2ne, sw, 3*s, etc.
        if (/^(\d*)\*?(n|ne|se|s|sw|nw|e|w)$/i.test(token))
            return true;
        // Cube coordinates: -1,2,-1
        if (/^-?\d+,-?\d+,-?\d+$/.test(token))
            return true;
        // CCRR coordinates: 0101, 0101/N, 0101.N, 0101@2
        if (/^\d{4}(?:[/.@].*)?$/.test(token))
            return true;
        // Alpha coordinates: a1, B10, a1/N, a1.N, a1@2
        if (/^[a-z]+\d+(?:[/.@].*)?$/i.test(token))
            return true;
        // Quoted labels: 'some label'
        if (/^'[^']*'$/.test(token))
            return true;
        return false;
    }
    tokenize(path) {
        const rawTokens = path.split(/\s+/).filter(t => t.length > 0);
        const tokens = [];
        for (const t of rawTokens) {
            const tl = t.toLowerCase();
            if (/^(include|exclude|close|~close|fill|~fill|-|~|,)$/i.test(tl)) {
                tokens.push(tl);
                continue;
            }
            if (this.isAtomLike(t)) {
                tokens.push(t);
                continue;
            }
            const pieces = t.split(/([,\-~])/).filter(p => p.length > 0);
            tokens.push(...pieces);
        }
        return tokens;
    }
    resolveAtom(token) {
        if (token.startsWith("'") && token.endsWith("'"))
            token = token.slice(1, -1);
        // Canonical Hex ID
        if (/^-?\d+,-?\d+,-?\d+$/.test(token)) {
            return { id: token, type: 'hex' };
        }
        // Alpha1 notation (e.g. A1, B10)
        const alphaMatch = token.match(/^([a-z]+)(\d+)(?:(?:\/|\.|@)(.*))?$/i);
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
                if (!suffix)
                    return null;
                return { id: this.resolveEdge(hexId, suffix), type: 'edge' };
            }
            if (separator === '.') {
                if (!suffix)
                    return null;
                return { id: this.resolveVertex(hexId, suffix), type: 'vertex' };
            }
            if (separator === '@') {
                const hour = parseInt(suffix);
                const type = this.inferType(token);
                if (type === 'edge')
                    return { id: this.resolveEdge(hexId, hour.toString()), type: 'edge' };
                if (type === 'vertex')
                    return { id: this.resolveVertex(hexId, hour.toString()), type: 'vertex' };
            }
            return { id: hexId, type: 'hex' };
        }
        // CCRR notation (e.g. 0101)
        const numericMatch = token.match(/^(\d{4})(?:(?:\/|\.|@)(.*))?$/);
        if (numericMatch) {
            const coords = numericMatch[1];
            const format = this.options.labelFormat;
            let col, row;
            if (format === "RRCC") {
                row = parseInt(coords.substring(0, 2));
                col = parseInt(coords.substring(2, 4));
            }
            else {
                col = parseInt(coords.substring(0, 2));
                row = parseInt(coords.substring(2, 4));
            }
            // Use raw col/row directly - offsetToCube handles stagger parity
            const cube = Hex.offsetToCube(col, row, this.options.orientation);
            const hexId = Hex.hexId(cube);
            const suffix = numericMatch[2];
            const separator = token.includes('/') ? '/' : (token.includes('.') ? '.' : (token.includes('@') ? '@' : ''));
            if (separator === '/') {
                if (!suffix)
                    return null;
                return { id: this.resolveEdge(hexId, suffix), type: 'edge' };
            }
            if (separator === '.') {
                if (!suffix)
                    return null;
                return { id: this.resolveVertex(hexId, suffix), type: 'vertex' };
            }
            if (separator === '@') {
                const hour = parseInt(suffix);
                const type = this.inferType(token);
                if (type === 'edge')
                    return { id: this.resolveEdge(hexId, hour.toString()), type: 'edge' };
                if (type === 'vertex')
                    return { id: this.resolveVertex(hexId, hour.toString()), type: 'vertex' };
            }
            return { id: hexId, type: 'hex' };
        }
        return null;
    }
    resolveEdge(hexId, dirOrHour) {
        const cube = Hex.hexFromId(hexId);
        const dirIndex = this.parseDirection(dirOrHour);
        const neighbor = Hex.hexNeighbor(cube, dirIndex);
        return Hex.getCanonicalBoundaryId(cube, neighbor, dirIndex);
    }
    resolveVertex(hexId, dirOrHour) {
        const cube = Hex.hexFromId(hexId);
        const dirIndex = this.parseDirection(dirOrHour);
        return Hex.getCanonicalVertexId(cube, dirIndex);
    }
    getCubeFromId(id) {
        if (id.includes('|'))
            return Hex.hexFromId(id.split('|')[0]);
        if (id.includes('^'))
            return Hex.hexFromId(id.split('^')[0]);
        if (id.includes('@'))
            return Hex.hexFromId(id.split('@')[0]);
        return Hex.hexFromId(id);
    }
    formatId(cube, _type) {
        return Hex.hexId(cube);
    }
    inferType(token) {
        if (token.includes('/'))
            return 'edge';
        if (token.includes('.'))
            return 'vertex';
        if (token.includes('@'))
            return 'edge';
        return 'hex';
    }
    resolveShortestPath(start, end, flip = false) {
        const base = Hex.defaultNudge(this.options.orientation);
        // Parity correction: ensures constant-row (flat) or constant-col (pointy)
        // paths always resolve to the axis-preserving hex. Uses min(a, b) for
        // reversal symmetry. See spec §7 for the full formula.
        const minCoord = Hex.orientationTop(this.options.orientation) === 'flat'
            ? Math.min(start.q, end.q)
            : Math.min(start.r, end.r);
        const parity = (((minCoord % 2) + 2) % 2 === 1) ? 1 : -1;
        let nudge = (base * parity);
        if (flip)
            nudge = (nudge === 1 ? -1 : 1);
        return Hex.hexLine(start, end, nudge);
    }
    fill(boundaryIds) {
        const hexes = boundaryIds.map(id => Hex.hexFromId(id));
        if (hexes.length < 3)
            return [];
        let minQ = Infinity, maxQ = -Infinity;
        let minR = Infinity, maxR = -Infinity;
        for (const h of hexes) {
            minQ = Math.min(minQ, h.q);
            maxQ = Math.max(maxQ, h.q);
            minR = Math.min(minR, h.r);
            maxR = Math.max(maxR, h.r);
        }
        const interior = [];
        const boundarySet = new Set(boundaryIds);
        for (let q = minQ; q <= maxQ; q++) {
            for (let r = minR; r <= maxR; r++) {
                const cube = { q, r, s: -q - r };
                const id = Hex.hexId(cube);
                if (boundarySet.has(id))
                    continue;
                if (this.isPointInPolygon(cube, hexes)) {
                    interior.push(id);
                }
            }
        }
        return interior;
    }
    isPointInPolygon(p, polygon) {
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
    parseDirection(dir) {
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
        const flatMapping = {
            'ne': 0, 'se': 1, 's': 2, 'sw': 3, 'nw': 4, 'n': 5,
        };
        const pointyMapping = {
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
        if (val !== undefined)
            return val;
        // Clock hours → DIRECTIONS index
        // Flat-top: edges at even hours (CW from 12=N)
        // Pointy-top: edges at odd hours (CW from 1=NE)
        const clockMappingFlat = {
            '12': 5, '2': 0, '4': 1, '6': 2, '8': 3, '10': 4
        };
        const clockMappingPointy = {
            '1': 1, '3': 0, '5': 5, '7': 4, '9': 3, '11': 2
        };
        if (top === 'flat' && clockMappingFlat[d] !== undefined)
            return clockMappingFlat[d];
        if (top === 'pointy' && clockMappingPointy[d] !== undefined)
            return clockMappingPointy[d];
        const numeric = parseInt(dir);
        if (!isNaN(numeric))
            return (numeric % 6 + 6) % 6;
        return 0;
    }
}
