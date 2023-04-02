import {type HexCoord} from './hex';
import {type Point2D, type Matrix2D, matrix2d} from './point';

const capitalLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

type HexAxis = 'q' | 'r' | 's' | 'Q' | 'R' | 'S';
type NumberStyle = '0' | '00' | '000' | '0000' | '1' | 'A' | 'AA';
type NumberFormatter = (v: number) => string;
type NumberParser = (s: string) => number;

interface NumberLabeler {
    pattern: string,
    parse: NumberParser,
    format: NumberFormatter,
}

function _paddedNumber(picture: string, offset=0): NumberLabeler {
    return {
        pattern: `\\d{${picture.length}}\\d*?`,
        parse: (s: string) => parseInt(s) - offset,
        format: (v: number) => (v + offset).toString().padStart(picture.length, picture[0]),
    }
}

const _axisTransform: Record<HexAxis, Point2D> = {
        'q': [1, 0],
        'r': [0, 1],
        's': [-1, -1],
        'Q': [1/2, 1],      // (r-s)/2 = (q+2r)/2
        'R': [-1, -1/2],    // (s-q)/2 = (-2q-r)/2
        'S': [1/2, -1/2],   // (q-r)/2
    },
    _labelers: Record<NumberStyle, NumberLabeler> = {
        '0': _paddedNumber('0'),
        '1': _paddedNumber('0', 1),
        '00': _paddedNumber('00'),
        '000': _paddedNumber('000'),
        '0000': _paddedNumber('0000'),
        'A': {
            // 'bijective injection' A, B, C, ... Y, Z, AA, AB, AC, ... BA, ...
            pattern: '[A-Z]+',
            format: (v: number): string => {
                let s = '';
                v++;
                while (v > 0) {
                    const d = (v-1) % 26;
                    s = capitalLetters[d] + s;
                    v = (v - (d + 1))/26;
                }
                return s;
            },
            parse: (s: string): number => {
                let v = 0;
                s.split('').forEach(c => {v = v*26 + capitalLetters.indexOf(c) + 1});
                return v-1;
            },
        },
        'AA': {
            // A, B, C, ..., AA, BB, CC, ... AAA, BBB, ...
            pattern: '[A-Z]+',
            format: (v: number): string => {
                const d = v % 26,
                    n = (v-d)/26 + 1;
                return capitalLetters[d].repeat(n);
            },
            parse: (s: string): number => {
                const d = capitalLetters.indexOf(s[0]),
                    n = s.length;
                return 26*(n-1) + d;
            }
        }
    };

function _xform(m: Matrix2D, x: Point2D, b: Point2D = [0,0]): Point2D {
    const [u, v] = matrix2d.muladd(m, x, b);
    //console.log('_xform', [[a, b], [c, d]], [x, y], '=>', [u, v]);
    return [Math.round(u)+0, Math.round(v)+0];  // +0 prevents round to -0
}

function _escre(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function hexLabeler(style: string, minusSign='*', delim=':') {
    const vs = style.split(/([qrs](?:0+|1|A|AA))/i);
    if (!vs || vs.length != 5) throw new Error(`Invalid label style '${style}'`);
    const [prefix, v1, sep, v2, suffix] = vs,
        [ax1, ax2] = [v1[0], v2[0]] as [HexAxis, HexAxis],
        mFwd: Matrix2D = [_axisTransform[ax1], _axisTransform[ax2]],
        mInv = matrix2d.invert(mFwd),
        [f1, f2] = [v1.slice(1), v2.slice(1)] as [NumberStyle, NumberStyle],
        [p1, p2] = [_labelers[f1].pattern, _labelers[f2].pattern],
        regexp = new RegExp(
            `${_escre(prefix)}(${_escre(minusSign)})?(${p1})${_escre(sep)}(?:${_escre(delim)})?(${_escre(minusSign)})?(${p2})${_escre(suffix)}`
        );

    if (ax1 == ax2) throw new Error(`Invalid repeated axis ${ax1} in '${style}'`);

    let ambiguous: boolean|null = null;

    if (sep != '' || (f1[0] == 'A') != (f2[0] == 'A')) {
        // no seperator, or mix alpha numeric is always fine
        ambiguous = false;
    } else if (f1[0] == 'A' || (f1.length == 1 && f1.length == 1)) {
        // both alpha or both non-padded is always ambiguous
        ambiguous = true;
    }

    function _fmt(v: number, fmt: NumberStyle): string {
        return (v < 0 ? minusSign: '') + _labelers[fmt].format(v < 0 ? -v: v);
    }

    const eps = -0.1;
    function labeler({q, r}: HexCoord): string {
        const [x, y] = _xform(mFwd, [q, r], [eps, eps]),
            [a, b] = [_fmt(x, f1), _fmt(y, f2)],
            needDelim = ambiguous || (ambiguous == null && (a.length > f1.length || b.length > f2.length));

        return `${prefix}${a}${sep}${needDelim ? delim: ''}${b}${suffix}`;
    }

    labeler.parse = function(label: string): HexCoord {
        const vs = label.match(regexp);
//        console.log(label, vs, regexp);
        if (!vs || vs.length != 4+1) throw new Error(`Couldn't parse label '${label}' with style '${style}'`);
        const [m1, s1, m2, s2] = vs.slice(1),
            [x, y] = [
                _labelers[f1].parse(s1) * (m1 ? -1 : 1),
                _labelers[f2].parse(s2) * (m2 ? -1 : 1)
            ],
            [q, r] = _xform(mInv, [x-eps, y-eps]);

        return {q, r};
    }

    return labeler;
}

export {hexLabeler, _labelers};