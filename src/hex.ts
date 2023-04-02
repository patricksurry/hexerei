// cubical coordinates for hexes dropping the implied s = - q - r
interface HexCoord {
    q: number;
    r: number;
}

// an edge is defined by hex point and a direction index 0..5, implying two sides for each edge
interface HexEdge extends HexCoord {
    e: number;
}

// a vertex is likewise is defined by hex point and a vertex index 0..5, implying three sectors for each vertex
interface HexVertex extends HexCoord {
    v: number;
}

const
    // six directions to neighboring hexes. within a face, edge e connects vertex v=e-1 and vertex e
    _range6 = [0,1,2,3,4,5],
    _directions: HexCoord[] = [
        {q: 1, r: 0},
        {q: 1, r: -1},
        {q: 0, r: -1},
        {q: -1, r: 0},
        {q: -1, r: 1},
        {q: 0, r: 1},
    ],
    // six vertices surrounding each face, formed by averaging pairs of adjacent directions with the origin
    // values from this array should be divided by 3 before use; as is they point to the centers of
    // the ring of 'vertex hexes' at distance 2 from the origin
    // within a face, vertex v is where edges e=v and v+1 meet
    _vertices3x: HexCoord[] = [
        {q: 2, r: -1},
        {q: 1, r: -2},
        {q: -1, r: -1},
        {q: -2, r: 1},
        {q: -1, r: 2},
        {q: 1, r: 1},
    ];

function hex() { /* TODO */ }

hex.eq = (a: HexCoord, b: HexCoord, eps=1e-6): boolean =>
    Math.abs(a.q - b.q) <= eps && Math.abs(a.r - b.r) <= eps;

hex.distance = (a: HexCoord, b: HexCoord): number =>
    Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(a.r+a.q - (b.r+b.q)));

hex.dot = (a: HexCoord, b: HexCoord): number => a.q * b.q + a.r * b.r + (a.q + a.r)*(b.q + b.r);

// (1,1,1) is perendicular to the plane q+r+s=0 so given a direction (q, r, s) in the plane,
// their cross-product (r-s, s-q, q-r) is both perpendicular and in the hex cube plane.
hex.perpendicular = ({q, r}: HexCoord): HexCoord => ({q: q + 2*r, r: -2*q - r});

hex.add = (a: HexCoord, b: HexCoord): HexCoord => ({q: a.q + b.q, r: a.r + b.r});

hex.sub = (a: HexCoord, b: HexCoord): HexCoord => ({q: a.q - b.q, r: a.r - b.r});

hex.scale = (c: number, {q, r}: HexCoord): HexCoord => ({q: c*q, r: c*r});

// round to the nearest integral hex coordinate
// for more intuition see https://patricksurry.github.io/posts/hexcubes/
hex.round = ({q, r}: HexCoord): HexCoord => {
    const s = -q-r;

    var iq = Math.round(q),
        ir = Math.round(r);
    const is = Math.round(s),
        dq = Math.abs(q - iq),
        dr = Math.abs(r - ir),
        ds = Math.abs(s - is);

    if (dq > dr && dq > ds) {
        iq = -ir-is
    } else if (dr > ds) {
        ir = -iq-is
    } // else modify the discarded `is` to agree with iq, ir
    return {q: iq, r: ir}
}

hex.vertices = ({q, r}: HexCoord): HexVertex[] => _range6.map(v => ({q, r, v}));

hex.edges = ({q, r}: HexCoord): HexEdge[] => _range6.map(e => ({q, r, e}));

// get a clockwise list of (non-integer) hex coordinates bounding a hex
hex.coords = (h: HexCoord): HexCoord[] => hex.vertices(h).map(vertex.coord);

// get neighboring hex in given direction
hex.neighbor = ({q, r}: HexCoord, i: number): HexCoord => {
    const {q: dq, r: dr} = _directions[i % 6];
    return {q: q + dq, r: r + dr};
}

hex.neighbors = (h: HexCoord): HexCoord[] => _range6.map(i => hex.neighbor(h, i));

function edge() { /* TODO */ }

// return the complementary edge
edge.complement = ({q: qe, r: re, e}: HexEdge): HexEdge => {
    const {q, r} = hex.neighbor({q: qe, r: re}, e);
    return {q, r, e: (e+3)%6};
}

// get vertices defining an edge, both sharing the face of the edge
edge.vertices = ({q, r, e}: HexEdge): [HexVertex, HexVertex] => [{q, r, v: (e+5)%6}, {q, r, v: e}];

edge.hexes = ({q, r, e}: HexEdge): [HexCoord, HexCoord] => [{q, r}, hex.neighbor({q, r}, e)];

// get (non-integer) hex coordinates for the ends of an edge
edge.coords = (e: HexEdge) => edge.vertices(e).map(vertex.coord) as [HexCoord, HexCoord];

edge.midpoint = ({q, r, e}: HexEdge): HexCoord => hex.add({q, r}, hex.scale(1/2, _directions[e]));

// find the nearest edge from a (non-integral) hex point
edge.round = (h: HexCoord): HexEdge => {
    const p = hex.round(h),
        dp = hex.sub(h, p);
    let e = 0, projmax = 0;
    _directions.forEach((d, i) => {
        const proj = hex.dot(dp, d);
        if (proj > projmax) {
            projmax = proj;
            e = i;
        }
    })
    return {q: p.q, r: p.r, e}
}


function vertex() { /* TODO */ }

// get (non-integer) hex coordinates for a vertex
vertex.coord = ({q, r, v}: HexVertex): HexCoord => hex.add({q, r}, hex.scale(1/3, _vertices3x[v % 6]));

vertex.edges = ({q, r, v}: HexVertex, complement=false): [HexEdge, HexEdge, HexEdge] => {
    // return the three outward (or inward) edges from a vertex
    const ixs = [1, 3, 5].map(i => (v+i)%6),
        fs = vertex.hexes({q, r, v}),
        es = fs.map(({q, r}, i) => ({q, r, e: ixs[i]}));

    return (complement ? es.map(edge.complement) : es) as [HexEdge, HexEdge, HexEdge];
}

vertex.hexes = ({q, r, v}: HexVertex): [HexCoord, HexCoord, HexCoord] =>
    [{q, r}, hex.neighbor({q, r}, v), hex.neighbor({q, r}, (v+1)%6)];

// find the nearest vertex to a (non integral) point
vertex.round = (h: HexCoord): HexVertex => {
    const p = hex.round(h),
        dp = hex.sub(h, p);
    let v = 0, projmax = 0;
    _vertices3x.forEach((d, i) => {
        const proj = hex.dot(dp, d);
        if (proj > projmax) {
            projmax = proj;
            v = i;
        }
    })
    return {q: p.q, r: p.r, v}
}

export {
    type HexCoord,
    type HexEdge,
    type HexVertex,
    hex,
    edge,
    vertex,
    _range6,
    _directions,
    _vertices3x,
};
