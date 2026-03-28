import { HexPath } from '../hexpath/hex-path.js';
import type { Orientation } from '../math/hex-math.js';
import * as Hex from '../math/hex-math.js';
import { HexMesh } from '../mesh/hex-mesh.js';
import { HexMapDocument } from './document.js';

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

    if (typeof json !== 'object' || json === null) {
      throw new Error('Invalid HexMap document: expected object');
    }
    const parsed = json as ParsedDocument;
    const { layout } = parsed;
    if (!layout) throw new Error("Missing mandatory 'layout' section in HexMap document");

    const options = HexMapLoader.resolveLayoutOptions(layout);
    const validHexes = HexMapLoader.resolveValidHexes(layout, options);
    const validHexIdSet = new Set(validHexes.map(Hex.hexId));

    const mesh = new HexMesh(validHexes, { ...options, layout });
    const meshHexPath = new HexPath(mesh, options);

    const { terrainMap, elevationMap, tagsMap } = HexMapLoader.processFeatures(
      parsed.features,
      meshHexPath,
      validHexIdSet
    );

    HexMapLoader.applyFeatureMaps(mesh, terrainMap, elevationMap, tagsMap);

    return mesh;
  }

  private static resolveLayoutOptions(layout: any) {
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

    return { orientation, firstCol, firstRow, labelFormat };
  }

  private static resolveValidHexes(layout: any, options: any): Hex.Cube[] {
    const allPath = layout.all;
    if (typeof allPath !== 'string') {
      throw new Error("Missing mandatory 'layout.all'");
    }

    const tempMesh = new HexMesh([], { ...options, layout });
    const hexPath = new HexPath(tempMesh, options);
    const allResult = hexPath.resolve(allPath);
    return allResult.items.map(Hex.hexFromId);
  }

  private static processFeatures(features: any, meshHexPath: HexPath, validHexIdSet: Set<string>) {
    const terrainMap = new Map<string, string>();
    const elevationMap = new Map<string, number>();
    const tagsMap = new Map<string, Set<string>>();

    if (!Array.isArray(features)) return { terrainMap, elevationMap, tagsMap };

    for (const feature of features) {
      const at = feature.at ?? feature.hex ?? feature.hexes;
      if (!at) continue;

      try {
        const pathStr = Array.isArray(at) ? at.join(' ') : at;
        if (typeof pathStr !== 'string') continue;

        const result = meshHexPath.resolve(pathStr);
        if (result.type !== 'hex') continue;

        for (const id of result.items) {
          if (!validHexIdSet.has(id)) continue;

          if (typeof feature.terrain === 'string') {
            const current = terrainMap.get(id) || '';
            terrainMap.set(id, current ? `${current} ${feature.terrain}` : feature.terrain);
          }

          if (typeof feature.elevation === 'number') {
            elevationMap.set(id, feature.elevation);
          }

          if (feature.tags) {
            if (!tagsMap.has(id)) tagsMap.set(id, new Set());
            const tags = feature.tags;
            const tagArray = Array.isArray(tags)
              ? tags.filter((t): t is string => typeof t === 'string')
              : typeof tags === 'string'
                ? tags.split(/\s+/)
                : [];
            for (const t of tagArray) {
              tagsMap.get(id)?.add(t);
            }
          }
        }
      } catch (e) {
        const atStr = Array.isArray(at) ? at.join(' ') : at;
        console.warn(`Failed to resolve HexPath in feature: ${atStr}`, e);
      }
    }
    return { terrainMap, elevationMap, tagsMap };
  }

  private static applyFeatureMaps(
    mesh: HexMesh,
    terrainMap: Map<string, string>,
    elevationMap: Map<string, number>,
    tagsMap: Map<string, Set<string>>
  ) {
    for (const hex of mesh.getAllHexes()) {
      const { id } = hex;
      if (terrainMap.has(id)) hex.terrain = terrainMap.get(id)!;
      if (elevationMap.has(id)) hex.elevation = elevationMap.get(id);
      if (tagsMap.has(id)) {
        hex.props.tags = Array.from(tagsMap.get(id)!);
      }
    }
  }
}
