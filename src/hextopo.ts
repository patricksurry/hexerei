import {
    type HexCoord, type HexEdge, type HexVertex,
    hex, edge, vertex,
    _directions, _vertices3x, _range6,
} from './hex';

const _u: HexCoord = {q: Math.sqrt(2), r: Math.sqrt(3)},
    unitRay = hex.scale(1 / Math.sqrt(hex.dot(_u, _u)), _u);

function lineStringHexes(hs: HexCoord[]): HexCoord[] {
    let hexes: HexCoord[] = [];
    hs = hs.slice();
    while(hs.length > 1) {
        hexes.push(...lineHexes(hs[0], hs[1]).slice(0, -1));
        hs.shift()
    }
    if (hs.length > 0) {
        hexes.push(hex.round(hs[0]));
    }
    return hexes;
}

function lineHexes(a: HexCoord, b: HexCoord): HexCoord[] {
    /*
        returns a connected line of face center coordinates from a to b
        Like Bresenham, we can filter to directions that make progress d . ab > 0
        and then keep picking the direction that reduces the error = ap . e
    */
    const ab = hex.sub(b, a),
        e = hex.perpendicular(ab),
        end = hex.round(b),
        line: HexCoord[] = [],
        dirs = _directions.filter(d => hex.dot(ab, d) > 0);

    if (!(ab.q == 0 && ab.r == 0) && dirs.length == 0) throw new Error('lineHexes: failed no valid directions');

    let p = hex.round(a),
        ap = hex.sub(p, a);
    while (true) {
        line.push(p);
        if (hex.eq(p, end)) break;
        let dd: HexCoord|undefined,
            errmin = 1e6;
        dirs.forEach(d => {
            const ad = hex.add(ap, d),
                err = Math.abs(hex.dot(ad, e));
            if (err < errmin) {
                errmin = err;
                dd = d;
            }
        })
        if (dd === undefined) throw new Error('lineHexes: failed no direction');
        p = hex.add(p, dd);
        ap = hex.add(ap, dd)
    }
    return line;
}

function lineStringEdges(hs: HexCoord[]): HexEdge[] {
    const edges: HexEdge[] = [];
    if (!hs.length) return [];
    hs = hs.slice();
    let start = hs.pop()!,
        reverse: boolean|undefined;
    while (hs.length) {
        const [es, r] = _lineEvs('edges', start, hs[0]);
        edges.push(...es);
        reverse = r;
        start = hs.shift()!;
    }
    if (reverse) edges.reverse()
    return edges;
}

function lineEdges(a: HexCoord, b: HexCoord): HexEdge[] {
    return lineStringEdges([a, b])
}

function lineStringVertices(hs: HexCoord[]): HexVertex[] {
    const vertices: HexVertex[] = [];
    hs = hs.slice();
    while (hs.length > 1) {
        vertices.push(..._lineEvs('vertices', hs[0], hs[1]).slice(0, -1));
        hs.shift();
    }
    if (hs.length) vertices.push(vertex.round(hs[0]));
    return vertices;
}

function lineVertices(a: HexCoord, b: HexCoord): HexVertex[] {
    return lineStringVertices([a, b]);
}

// find a line along edges or vertices, potentially with fixed orientation (e.g. for continuing a multiline)
function _lineEvs(out: 'vertices', a: HexCoord, b: HexCoord): HexVertex[];
function _lineEvs(out: 'edges', a: HexCoord, b: HexCoord, reverse?: boolean): [HexEdge[], boolean?];
function _lineEvs(out: 'vertices'|'edges', a: HexCoord, b: HexCoord, reverse?: boolean): HexVertex[]|[HexEdge[], boolean?] {
    const ab = hex.sub(b, a),
        e = hex.perpendicular(ab),
        end = vertex.coord(vertex.round(b)),
        vs: HexVertex[] = [],
        es: HexEdge[] = [],
        // find the vertex directions that make progress, since edge i is directed as vertex i+1
        vdirs = _range6.filter(i => hex.dot(ab, _vertices3x[i]) > 0);

    if (!(ab.q == 0 && ab.r == 0) && vdirs.length == 0) throw new Error('hexEdge: failed no valid directions');

    let v = vertex.round(a),
        p = vertex.coord(v), // track current location at a vertex
        ap = hex.sub(p, a);  // track the current displacement from origin a
    while (true) {
        vs.push(v);
        if (hex.eq(p, end)) break;

        // get the outward edges, map to vertex directions, and restrict to ones that make progress
        const ves = vertex.edges(v).filter(({e}) => vdirs.includes((e+1)%6));

        let vebest: HexEdge|undefined,
            dbest: HexCoord|undefined,
            errmin = 1e6;

        ves.forEach(ve => {
            const
                d = hex.scale(1/3, _vertices3x[(ve.e+1)%6]),
                av = hex.add(ap, d),
                err = Math.abs(hex.dot(av, e));
            if (err < errmin) {
                errmin = err;
                vebest = ve;
                dbest = d;
            }
        })
        if (vebest == null || dbest == null) throw new Error('hexEdge: failed no direction');
        if (reverse == null) {
            // use complementary edges if the first outward edge's face center is closer to the starting point
            reverse = hex.distance(a, edge.complement(vebest)) < hex.distance(a, vebest);
        }
        es.push(reverse ? edge.complement(vebest) : vebest);
        p = hex.add(p, dbest);
        v = vertex.round(p);
        ap = hex.add(ap, dbest);
    }
    return out == 'edges' ? [es, reverse] : vs;
}

function rayIntersects(o: HexCoord, e: HexEdge, unitDir?: HexCoord): boolean {
    // returns true if vector from o in unit direction d interesects edge e
    // arbitrary unit vector unlikely to make intersections at grid points

    // project vector oa on d and ob on d
    const
        d = unitDir == null ? unitRay: unitDir,
        [a, b] = edge.coords(e),
        oa = hex.sub(a, o),
        ob = hex.sub(b, o),
        aproj = hex.dot(oa, d),
        bproj = hex.dot(ob, d);

    // for intersection, both a and b need to be in the direction of d
    if (aproj < 0 || bproj < 0) return false;
    // and their perpendicular components need to be on opposite sides of the ray
    const aperp = hex.sub(oa, hex.scale(aproj, d)),
        bperp = hex.sub(ob, hex.scale(bproj, d)),
        hit = (!hex.eq(aperp, {q: 0, r: 0})) && (hex.dot(aperp, bperp) <= 0);

    return hit;
}

function polygonHexes(rings: HexCoord[][]): HexCoord[] {
    // return a list of hexes whose centers are within the polygon defined by
    // the outer ring and optional inner rings of hex coord polys

    let edges = polygonEdges(rings).flat();

    let hexes: HexCoord[] = [];

    if (edges.length == 0) return [];
    let {q: qmin, r: rmin} = edge.coords(edges[0])[0],
        [qmax, rmax] = [qmin, rmin];
    rings.flat().forEach(({q, r}) => {
        if (q < qmin) qmin = q;
        else if (q > qmax) qmax = q;
        if (r < rmin) rmin = r;
        else if (r > rmax) rmax = r;
    })
    for (let q=qmin; q<=qmax; q++) {
        for (let r=rmin; r<=rmax; r++) {
            const h: HexCoord = {q, r};
            if (edges.filter(e => rayIntersects(h, e)).length % 2) hexes.push(h);
        }
    }
    return [];
}

function polygonEdges(rings: HexCoord[][]): HexEdge[][] {
    //TODO
    return [[]];
}

export {
    lineHexes,
    lineStringHexes,
    lineEdges,
    lineStringEdges,
    lineVertices,
    lineStringVertices,
    polygonHexes,
    polygonEdges,
    rayIntersects,
};
