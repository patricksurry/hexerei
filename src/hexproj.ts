import * as xform  from 'transformation-matrix';
import {type Matrix} from 'transformation-matrix';
import {type Point2D} from './point';
import {
    type HexCoord, type HexEdge, type HexVertex,
    hex, edge, vertex,
    _range6,
} from './hex';
import {
    lineHexes,
    lineEdges,
} from './hextopo';


const
    sqrt3 = Math.sqrt(3),
    // the basic projection from cube coordinates onto x, y coordinates via basis vectors for q and r
    // see https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/transform
    _projection: Matrix = {
        a: sqrt3, c: sqrt3/2, e: 0,
        b: 0,     d: 3/2,     f: 0
    };

//TODO by convention have negative scale flip x and y (by swapping cols in _projection?)
function hexProjection(scale=1, rotate=0, tx=0, ty=0) {
    // apply scale, rotation and translation by left-multiplying the base projection
    const _unit = xform.transform(xform.rotateDEG(rotate), xform.scale(scale), _projection),
        _h2p = xform.transform(xform.translate(tx, ty), _unit),
        // also stash the inverse projection to get back to hex coordinates
        _p2h = xform.inverse(_h2p),
         _u = ({q, r}: HexCoord): Point2D => xform.applyToPoint(_unit, [q, r]);

    function hp() {
        //TODO
    }

    hp.unitHex = hex.coords({q: 0, r: 0}).map(_u);
    hp.unitVertex = _range6.map(v => vertex.coord({q: 0, r: 0, v})).map(_u);
    hp.unitEdge = _range6.map(e => edge.coords({q: 0, r: 0, e})).map(([s, e]) => [_u(s), _u(e)]);

    // project a single hex onto xy
    hp.point = ({q, r}: HexCoord): Point2D => xform.applyToPoint(_h2p, [q, r]);
    hp.transformTo = (h: HexCoord): string => {
        const [x, y] = hp.point(h);
        return `translate(${x},${y})`;
    }
    // project a sequence of hexes onto xy points
    hp.points = (hs: HexCoord[]): Point2D[] => hs.map(h => hp.point(h));

    // project xy to raw (unrounded) cube coordinates
    hp.hexCoord = ([x, y]: Point2D): HexCoord => {
        const [q, r] = xform.applyToPoint(_p2h, [x, y]);
        return {q, r};
    }
    // project point to nearest hex
    hp.nearestHex = (p: Point2D): HexCoord => {
        return hex.round(hp.hexCoord(p));
    }
    // project point to nearest edge
    hp.nearestEdge = (p: Point2D): HexEdge => {
        return edge.round(hp.hexCoord(p));
    }
    // project point to nearest vetex
    hp.nearestVertex = (p: Point2D): HexVertex => {
        return vertex.round(hp.hexCoord(p));
    }
    // project a line segment to a list of hexes
    hp.asHexLine = (p: Point2D, q: Point2D): HexCoord[] => {
        return lineHexes(hp.hexCoord(p), hp.hexCoord(q));
    }
    // project a line segment to a list of (directed) edges
    hp.asEdgeLine = (p: Point2D, q: Point2D): HexEdge[] => {
        return lineEdges(hp.hexCoord(p), hp.hexCoord(q));
    }
    return hp;
}

export {type Point2D as Point, hexProjection};