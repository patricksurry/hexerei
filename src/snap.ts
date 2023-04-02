import { Feature, FeatureCollection, Geometry, GeometryCollection, Position, GeoJSON} from 'geojson';
import * as fs from 'fs';

import {geoPath, geoStream, geoMercator} from 'd3-geo';

let obj = JSON.parse(fs.readFileSync('example.geojson', {encoding: 'utf8'}));

function isGeoJSON(obj: unknown): obj is GeoJSON {
    return isFeatureCollection(obj) || isFeature(obj) || isGeometry(obj);
}
function isFeatureCollection(obj: unknown): obj is FeatureCollection {
    const fc = obj as FeatureCollection;
    return fc !== null && typeof fc === 'object' && fc.type == 'FeatureCollection' && Array.isArray(fc.features) && fc.features.every(isFeature)
}
function isFeature(obj: unknown): obj is Feature {
    const f = obj as Feature;
    return f !== null && typeof f === 'object' && f.type == 'Feature' && typeof(f.properties) == 'object' && isGeometry(f.geometry);
}
function isGeometry(obj: unknown): obj is Geometry {
    if (obj === null) return true;
    if (typeof obj !== 'object') return false;
    const g = obj as Geometry,
        {coordinates} = obj as {coordinates: unknown};
    switch (g.type) {
        case 'Point':
            return isPosition(coordinates);

        case 'MultiPoint':
        case 'LineString':
            return isPositionArray(coordinates);

        case 'MultiLineString':
        case 'Polygon':
            return isPositionArray2(coordinates);

        case 'MultiPolygon':
            return isPositionArray3(coordinates);

        case 'GeometryCollection': {
            const gc = g as GeometryCollection;
            return Array.isArray(gc.geometries) && gc.geometries.every(isGeometry);
        }
        default:
            return false;
    }
}
function isPosition(obj: unknown): obj is Position {
    return Array.isArray(obj) && obj.every(v => typeof v === 'number') && (obj.length == 2 || obj.length == 3);
}
function isPositionArray(obj: unknown): obj is Position[] {
    return Array.isArray(obj) && obj.every(isPosition);
}
function isPositionArray2(obj: unknown): obj is Position[][] {
    return Array.isArray(obj) && obj.every(isPositionArray);
}
function isPositionArray3(obj: unknown): obj is Position[][][] {
    return Array.isArray(obj) && obj.every(isPositionArray2);
}

const stream = {
    point: (x: number, y: number) => console.log(`point: ${x}, ${y}`),
    lineStart: () => console.log('lineStart'),
    lineEnd: () => console.log('lineEnd'),
    polygonStart: () => console.log('polygonStart'),
    polygonEnd: () => console.log('polygonEnd'),
    sphere: () => console.log('sphere'),
}

if (isGeoJSON(obj)) {
    const gj: GeoJSON = obj;
    const proj = geoMercator(),
        path = geoPath(proj);
    (gj as FeatureCollection).features.forEach(f => {
        console.log('feature', f);
        console.log('path', path(f));
        console.log('stream:')
        geoStream(f, proj.stream(stream));
    })

} else {
    console.log('Failed validation')
}
