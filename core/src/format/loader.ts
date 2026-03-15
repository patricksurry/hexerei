import { HexMapDocument } from './document.js';
import { HexMesh } from '../mesh/hex-mesh.js';
import * as Hex from '../math/hex-math.js';
import { HexPath } from '../hexpath/hex-path.js';
import type { Orientation } from '../math/hex-math.js';

// Type guards for parsed YAML data
interface ParsedCoordinates {
  first?: [number, number];
  label?: string;
}

interface ParsedLayout {
  orientation?: string;
  all?: string;
  label?: string;
  coordinates?: ParsedCoordinates;
  firstCol?: number;
  firstRow?: number;
  first?: [number, number];
}

interface ParsedFeature {
  at?: string | string[];
  hex?: string | string[];
  hexes?: string | string[];
  terrain?: string;
  elevation?: number;
  tags?: string | string[];
}

interface ParsedDocument {
  layout?: ParsedLayout;
  features?: ParsedFeature[];
}

function isValidOrientation(value: unknown): value is Orientation {
  return (
    typeof value === 'string' &&
    ['flat-down', 'flat-up', 'pointy-right', 'pointy-left'].includes(value)
  );
}

function asNumber(value: unknown, defaultValue: number): number {
  return typeof value === 'number' ? value : defaultValue;
}

function asString(value: unknown, defaultValue: string): string {
  return typeof value === 'string' ? value : defaultValue;
}

export class HexMapLoader {
  static load(source: string): HexMesh {
    const doc = new HexMapDocument(source);
    const json = doc.toJS();

    // Type guard the parsed document
    if (typeof json !== 'object' || json === null) {
      throw new Error('Invalid HexMap document: expected object');
    }
    const parsed = json as ParsedDocument;

    const { layout } = parsed;
    if (!layout) throw new Error("Missing mandatory 'layout' section in HexMap document");

    // 1. Determine Orientation/Coordinates from layout
    const orientationValue = layout.orientation || 'flat-down';
    const orientation: Orientation = isValidOrientation(orientationValue)
      ? orientationValue
      : 'flat-down';

    const firstCol =
      asNumber(layout.coordinates?.first?.[0], 0) ||
      asNumber(layout.firstCol, 0) ||
      asNumber(layout.first?.[0], 0) ||
      1;

    const firstRow =
      asNumber(layout.coordinates?.first?.[1], 0) ||
      asNumber(layout.firstRow, 0) ||
      asNumber(layout.first?.[1], 0) ||
      1;

    const labelFormat = asString(layout.label || layout.coordinates?.label, 'XXYY');

    // 2. Determine Map Extent (validHexes)
    let validHexes: Hex.Cube[] = [];
    const allPath = layout.all;
    if (typeof allPath === 'string') {
      const tempMesh = new HexMesh([], { orientation, firstCol, firstRow, layout });
      const hexPath = new HexPath(tempMesh, {
        labelFormat,
        orientation,
        firstCol,
        firstRow,
      });
      const allResult = hexPath.resolve(allPath);
      validHexes = allResult.items.map(Hex.hexFromId);
    } else {
      throw new Error("Missing mandatory 'layout.all'");
    }

    const validHexIdSet = new Set(validHexes.map(Hex.hexId));

    // 3. Process Features
    const terrainMap = new Map<string, string>();
    const elevationMap = new Map<string, number>();
    const tagsMap = new Map<string, Set<string>>();
    const features = Array.isArray(parsed.features) ? parsed.features : [];

    const mesh = new HexMesh(validHexes, {
      orientation,
      firstCol,
      firstRow,
      layout,
    });
    const meshHexPath = new HexPath(mesh, {
      labelFormat,
      orientation,
      firstCol,
      firstRow,
    });

    for (const feature of features) {
      const at = feature.at ?? feature.hex ?? feature.hexes;
      if (!at) continue;

      try {
        const pathStr = Array.isArray(at) ? at.join(' ') : at;
        if (typeof pathStr !== 'string') continue;

        const result = meshHexPath.resolve(pathStr);

        if (result.type === 'hex') {
          for (const id of result.items) {
            if (!validHexIdSet.has(id)) continue;

            const { terrain } = feature;
            if (typeof terrain === 'string') {
              const current = terrainMap.get(id) || '';
              terrainMap.set(id, current ? `${current} ${terrain}` : terrain);
            }

            const { elevation } = feature;
            if (typeof elevation === 'number') {
              elevationMap.set(id, elevation);
            }

            const { tags } = feature;
            if (tags) {
              if (!tagsMap.has(id)) tagsMap.set(id, new Set());
              const tagArray = Array.isArray(tags)
                ? tags.filter((t): t is string => typeof t === 'string')
                : typeof tags === 'string'
                  ? tags.split(/\s+/)
                  : [];
              tagArray.forEach((t: string) => tagsMap.get(id)!.add(t));
            }
          }
        }
      } catch (e) {
        const atStr = Array.isArray(at) ? at.join(' ') : at;
        console.warn(`Failed to resolve HexPath in feature: ${atStr}`, e);
      }
    }

    // Finalize mesh hexes
    for (const hex of mesh.getAllHexes()) {
      const { id } = hex;
      if (terrainMap.has(id)) hex.terrain = terrainMap.get(id)!;
      if (elevationMap.has(id)) hex.elevation = elevationMap.get(id);
      if (tagsMap.has(id)) {
        hex.props.tags = Array.from(tagsMap.get(id)!);
      }
    }

    return mesh;
  }
}
