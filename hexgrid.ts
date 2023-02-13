import * as fs from 'fs';

interface HexPoint {
    q: number;
    r: number;
}
interface Point {
    x: number,
    y: number,
}

const sqrt3 = Math.sqrt(3),
    // seven axial direction vectors including the nil direction 0,0 which form a megahex of 7 hexes
    unitDirs: HexPoint[] = [
        {q: 0, r: 0},
        {q: 1, r: 0}, {q: 0, r: 1}, {q: -1, r: 1},
        {q: -1, r: 0}, {q: 0, r: -1}, {q: 1, r: -1},
    ],
    unitVertices: HexPoint[] = [
        {q: 1/3, r: 1/3}, {q: -1/3, r: 2/3}, {q: -2/3, r: 1/3},
        {q: -1/3, r: -1/3}, {q: 1/3, r: -2/3}, {q: 2/3, r: -1/3},
    ],
    ctrs = unitDirs.map(hextoxy),
    // lookup table to recover direction index when projecting axial point (q, r) on (1, -2) mod 7
    proj2dir = [0, 1, 5, 6, 3, 2, 4],
    // the seven digits used to represent path offset within a 7hex unit, with '-' for -1, and '=' for -2 (double minus)
    g7digits = '=-01234',
    g7vals = [-2, -1, 0, 1, 2, 3, 4],
    // the repeating 7-hex path of Gospar curve visits dirs in this order in forward order
    pos2dir = [2, 3, 0, 1, 6, 5, 4],
    // the inverse mapping
    dir2pos = [2, 3, 0, 1, 6, 5, 4],
    // when we recurse, each unit of the Gospar curve gets rotated clockwise by rot steps
    pos2rot = [0, 4, 0, 2, 0, 0, 2],
    // we traverse some units in reverse order (-1)
    pos2sgn = [-1, 1, 1, -1, -1, -1, 1];

/*
     | 11   8   2 |
     |  2  11   8 |  / 3
     |  8   2  11 |
*/
function twist({q, r}: HexPoint): HexPoint {
    // rotates CCW by a little pover 30deg and scale by sqrt(7)
    const s = -(q + r);
    return {q: (11*q + 8*r + 2*s)/3, r: (2*q + 11*r + 8*s)/3}
}

/*
     |  5  -4   2 |
     |  2   5  -4 |  / 21
     | -4   2   5 |
*/
function untwist({q, r}: HexPoint): HexPoint {
    // invert twist, ie. reverses rotatation and scale by 1/sqrt(y)
    const s = -(q + r);
    return {q: (5*q - 4*r + 2*s)/21, r: (2*q + 5*r - 4*s)/21}
}

function hextoshm(p: HexPoint): number {
    // calculate a base-7 index for a hex using sprial honeycomb mosaic (shm) labeling
    // see https://gamedev.stackexchange.com/questions/71785/converting-between-spiral-honeycomb-mosaic-and-axial-hex-coordinates

    let n = 0;

    while(p.q || p.r) {
        // project onto (1,-2) to get the direction
        const proj = (p.q - 2*p.r) % 7,
            d = proj2dir[proj < 0 ? proj+7: proj];
        n = n * 7 + d;
        // remove any offset...
        if (d) {
            const dir = unitDirs[d];
            p = {q: p.q - dir.q, r: p.r - dir.r}
        }
        // and scale down recursively
        p = untwist(p);
    }
    return n;
}

function shmtohex(n: number): HexPoint {
    // return the hex corresponding to a shm-encoded integer
    let p = {q: 0, r: 0};

    n.toString(7).split('').forEach(c => {
        p = twist(p);
        const {q, r} = unitDirs[+c];
        p = {q: p.q + q, r: p.r + r};
    })
    return p;
}

function inttog7(v: number): string {
    // convert an integer to a base -7 string of g7 digits
    let s = '';
    v = -v;
    while (v != 0) {
        const tmp = v % 7,
            i = (tmp - g7vals[0] + 7)%7;
        s = g7digits[i] + s;
        v = (v - g7vals[i]) / -7;
    }
    return s || '0';
}

function g7toint(s: string) {
    // convert a g7 string back to an integer
    let v = 0;
    s.split('').forEach(c => {
        const i = g7digits.indexOf(c);
        if (i == null) throw new Error(`Invalid character in g7 string ${s}`)
        v = -7*v + g7vals[i];
    })
    return -v;
}

function shmtog7(n: number): string {
    // given a SHM index, find the correspoding g7 index
    const ds = n.toString(7).split('').map(c => +c);
    let s = '',
        sgn = pos2sgn[dir2pos[0]],
        rot = (ds.length - 1) % 6;
    ds.forEach(d => {
        const pos = dir2pos[d ? ((d-1-rot+6) % 6) + 1: 0];
        s += g7digits[sgn < 0 ? 6-pos : pos];
        rot = (rot - 1 + pos2rot[pos] + 6) % 6;
        sgn *= pos2sgn[pos];
    })
    return s || '0';
}

function g7toshm(s: string): number {
    // given a g7 index, get the corresponding shm index
    const ixs = s.split('').map(c => g7digits.indexOf(c));
    let n = 0,
        sgn = pos2sgn[dir2pos[0]],    // implicit 0 was prior digit so get sense of central unit
        rot = (ixs.length - 1) % 6;
    ixs.forEach(i => {
        const pos = sgn < 0 ? 6-i: i,
            d0 = pos2dir[pos],
            d = d0 ? ((d0-1+rot) % 6 + 1): 0;
        n = n * 7 + d;
//        if (s == '0') console.log(s, n.toString(7), `i ${i} sgn ${sgn} pos ${pos} rot ${rot} d0 ${d0} d ${d}`)
        rot = (rot - 1 + pos2rot[pos] + 6) % 6;
        sgn *= pos2sgn[pos];
    })
    return n;
}

function hextoxy({q, r}: HexPoint, scale=1): Point {
    // convert axial hex coordinate to hex center
    return {
        x: scale * sqrt3 * (q  +  r/2),
        y: scale * 3 * r/2,
    }
}

function hexboundary({q, r}: HexPoint, scale=1): Point[] {
    // return a CW boundary for given hex
    return unitVertices.map(({q: vq, r: vr}) => hextoxy({q: q+vq, r: r+vr}, scale));
}

function svgpath(ps: Point[], closed=false, classname=''): string {
    const d = ps.map(({x, y}) => `${x.toFixed(3)},${y.toFixed(3)}`).join(' L'),
        cls = classname ? `class="${classname}"`: '';
    return `<path ${cls} d="M${d}${closed?'Z':''}"/>`;
}

function svglabel(s: string, {x, y}: Point): string {
    return `<text x=${x} y=${y} dy=0.6>${s}</text>`;
}

function twistpath(scale=1) {
    let ps = unitDirs.slice(0, 2);
    for (let i=0; i<3; i++) {
        ps.push(twist(ps.slice(-1)[0]));
    }
    const vs = ps.map(p => hextoxy(p, scale));
    return (
        vs.slice(1).map(v => svgpath([vs[0], v], false, 'twist seq')).join('\n')
        + svgpath(vs, false, 'twist dashed')
    )
}

function shmpath(): string {
    let s = ''
    const seq: Point[] = [];
    for (let i=0; i<7*7*7; i++) {
        const p = shmtohex(i),
            xy = hextoxy(p),
            vs = hexboundary(p);
        seq.push(xy);
        s += '  ' + svgpath(vs, true, `hex color${Math.floor(i/7)%7}`) + '\n';
        s += '  ' + svglabel(i.toString(7), xy) + '\n';
    }
    s += '  ' + svgpath(seq, false, 'seq') + '\n';
    console.log('shm avg step', avgstep(seq));
    return s;
}

function g7path(): string {
    let s = '';
    const seq: Point[] = [];
    for (let i=-4*7*7-4-14; i<3*7*7-4-14; i++) {
        const g7 = inttog7(i),
            shm = g7toshm(g7),
            p = shmtohex(shm),
            xy = hextoxy(p),
            vs = hexboundary(p)
//        console.log(i, g7, g7toint(g7), shm.toString(7), shmtog7(shm));
        seq.push(xy);
        s += '  ' + svgpath(vs, true, `hex color${Math.floor(shm/7)%7}`) + '\n';
        s += '  ' + svglabel(g7, xy) + '\n';
    }
    s += '  ' + svgpath(seq, false, 'seq') + '\n';
    console.log('g7 avg step', avgstep(seq));
    return s;
}

function avgstep(seq: Point[]): number {
    return seq.slice(1).map((p, i) => {
        const q = seq[i];
        return Math.sqrt((p.x - q.x)**2 + (p.y - q.y)**2);
    }).reduce((s, v) => s + v) / (seq.length - 1) / sqrt3
}

function hexrange(n: number): HexPoint[] {
    const results: HexPoint[] = [];
    for(let q = -n; q <= n; q++) {
        for(let r = Math.max(-n, -q-n); r <= Math.min(n, -q+n); r++) {
            results.push({q, r})
        }
    }
    return results;
}

function wrapsvg(svg: string): string {
    return `
<html>
    <style>
        text {
            stroke: none;
            fill: #333;
            font: 0.5px sans-serif;
            text-anchor: middle;
        }
        path {
            stroke: grey;
            fill: none;
            stroke-width: 0.5px;
            vector-effect: non-scaling-stroke;
        }
        path.seq {
            stroke-width: 2px;
            stroke: blue;
            opacity: 50%;
        }
        path.twist {
            stroke: red;
        }
        path.dashed {
            stroke-dasharray: 5 3;
        }
        .hex {opacity: 50%}
        .color0 {fill:rgb(251,180,174)}
        .color1 {fill:rgb(179,205,227)}
        .color2 {fill:rgb(204,235,197)}
        .color3 {fill:rgb(222,203,228)}
        .color4 {fill:rgb(254,217,166)}
        .color5 {fill:rgb(255,255,204)}
        .color6 {fill:rgb(229,216,189)}
    </style>
    <body>
        <svg width="800" height="800" viewBox="-20 -20 40 40">
${svg}
        </svg>
    </body
</html>
`
}

fs.writeFileSync('shm.html', wrapsvg(shmpath() + twistpath()));
fs.writeFileSync('g7.html', wrapsvg(g7path() + twistpath()));

const domain = hexrange(20),
    samples = 1000;
console.log('domain size', domain.length);
let s0 = 0, s1 = 0, s2 = 0;
for(let _=0; _<samples; _++) {
    const p = domain[Math.floor(Math.random()*domain.length)],
        q = domain[Math.floor(Math.random()*domain.length)],
        shmp = hextoshm(p),
        shmq = hextoshm(q),
        {x: px, y: py} = hextoxy(p),
        {x: qx, y: qy} = hextoxy(q);
    s0 += Math.sqrt((px - qx)**2 + (py - qy)**2)/sqrt3;
    s1 += Math.abs(shmp - shmq);
    s2 += Math.abs(g7toint(shmtog7(shmp)) - g7toint(shmtog7(shmq)));
}
s0 /= samples;
s1 /= samples;
s2 /= samples;
console.log(`avg dist ${s0} shm ratio ${s1/s0/s0}, g7 ratio ${s2/s0/s0}`)
