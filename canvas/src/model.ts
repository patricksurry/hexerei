import {
  Hex,
  HexMapDocument,
  HexMapLoader,
  type HexMapMetadata,
  type HexMesh,
  HexPath,
} from '@hexmap/core';
import type { FeatureItem } from './types.js';

export interface GridConfig {
  orientation: Hex.Orientation;
  columns: number;
  rows: number;
  firstCol: number;
  firstRow: number;
  labelFormat: string;
}

export interface TerrainDef {
  key: string;
  name: string;
  color: string;
  type?: 'base' | 'modifier';
  onesided?: boolean;
  properties?: Record<string, unknown>;
}

export type GeometryType = 'hex' | 'edge' | 'vertex';

export interface ComputedHexState {
  hexId: string;
  label: string;
  terrain: string;
  terrainColor: string;
  elevation?: number;
  contributingFeatures: FeatureItem[];
  neighborLabels: string[];
}

export class MapModel {
  private _metadata: HexMapMetadata;

  public document: HexMapDocument;

  private _grid: GridConfig;

  private _terrainDefs: Map<GeometryType, Map<string, TerrainDef>>;

  private _features: FeatureItem[];

  private _mesh: HexMesh;

  private _hexToFeatures: Map<string, FeatureItem[]>;

  private _edgeToFeatures: Map<string, FeatureItem[]> = new Map();

  private _vertexToFeatures: Map<string, FeatureItem[]> = new Map();

  private _yaml: string = '';

  private constructor(doc: HexMapDocument, mesh: HexMesh) {
    this.document = doc;
    this._metadata = doc.getMetadata();
    const layout = doc.getLayout();
    // Layout may have additional properties not in the type definition
    // Cast to unknown first, then to a record to safely access potential extra properties
    const layoutData = layout as unknown as Record<string, unknown>;

    const orientation = layout.orientation || 'flat-down';
    const firstCol = 0; // Default to 0 for backward compatibility; YAML can override via layout.coordinates.first
    const firstRow = 0; // Default to 0 for backward compatibility; YAML can override via layout.coordinates.first
    const labelFormat = layout.label || 'XXYY';

    this._grid = {
      orientation,
      columns: typeof layoutData.columns === 'number' ? layoutData.columns : 0,
      rows: typeof layoutData.rows === 'number' ? layoutData.rows : 0,
      firstCol,
      firstRow,
      labelFormat,
    };

    // Terrain definitions — geometry-scoped
    this._terrainDefs = new Map<GeometryType, Map<string, TerrainDef>>();
    const terrainVocab = doc.getTerrain();
    for (const geom of ['hex', 'edge', 'vertex'] as const) {
      const defs = new Map<string, TerrainDef>();
      const section = terrainVocab[geom] ?? {};
      for (const [key, def] of Object.entries(section)) {
        defs.set(key, {
          key,
          name: def.name ?? key,
          color: def.style?.color ?? '#888888',
          type: def.type,
          onesided: def.onesided,
          properties: def.properties,
        });
      }
      this._terrainDefs.set(geom, defs);
    }

    // Use provided mesh or load it from doc
    this._mesh = mesh;

    // Resolve features and build reverse index
    const meshHexPath = new HexPath(this._mesh, {
      labelFormat,
      orientation,
      firstCol,
      firstRow,
    });

    this._hexToFeatures = new Map<string, FeatureItem[]>();
    this._edgeToFeatures = new Map<string, FeatureItem[]>();
    this._vertexToFeatures = new Map<string, FeatureItem[]>();

    this._features = doc.getFeatures().map((f, idx) => {
      const featureItem = this.resolveFeatureItem(f, idx, meshHexPath);
      this.populateReverseIndexes(featureItem);
      return featureItem;
    });
  }

  private resolveFeatureItem(f: any, idx: number, meshHexPath: HexPath): FeatureItem {
    let hexIds: string[] = [];
    let edgeIds: string[] = [];
    let vertexIds: string[] = [];
    let segments: string[][] | undefined;
    let geometryType: 'hex' | 'edge' | 'vertex' = 'hex';

    if (f.at) {
      try {
        const result = meshHexPath.resolve(f.at);
        geometryType = result.type;
        segments = result.segments;
        if (result.type === 'hex') {
          hexIds = result.items;
        } else if (result.type === 'edge') {
          edgeIds = result.items;
        } else if (result.type === 'vertex') {
          vertexIds = result.items;
        }
      } catch (e) {
        console.warn(`MapModel: Failed to resolve feature at index ${idx}`, e);
      }
    }

    return {
      index: idx,
      terrain: f.terrain ?? '',
      label: f.label,
      id: f.id,
      tags: typeof f.tags === 'string' ? f.tags.split(/\s+/).filter(Boolean) : [],
      at: typeof f.at === 'string' ? f.at : 'complex',
      isBase: f.at === '@all',
      geometryType,
      hexIds,
      edgeIds,
      vertexIds,
      segments,
      elevation: f.elevation,
      properties: f.properties,
      side: f.side,
    };
  }

  private populateReverseIndexes(featureItem: FeatureItem) {
    for (const hid of featureItem.hexIds) {
      if (!this._hexToFeatures.has(hid)) {
        this._hexToFeatures.set(hid, []);
      }
      this._hexToFeatures.get(hid)?.push(featureItem);
    }
    for (const eid of featureItem.edgeIds) {
      if (!this._edgeToFeatures.has(eid)) {
        this._edgeToFeatures.set(eid, []);
      }
      this._edgeToFeatures.get(eid)?.push(featureItem);
    }
    for (const vid of featureItem.vertexIds) {
      if (!this._vertexToFeatures.has(vid)) {
        this._vertexToFeatures.set(vid, []);
      }
      this._vertexToFeatures.get(vid)?.push(featureItem);
    }
  }

  static load(yamlSource: string): MapModel {
    const mesh = HexMapLoader.load(yamlSource);
    const doc = new HexMapDocument(yamlSource);
    const model = new MapModel(doc, mesh);
    model._yaml = yamlSource;
    return model;
  }

  /**
   * Rebuild a MapModel from an existing HexMapDocument.
   * Used by the command executor after mutations.
   */
  static fromDocument(doc: HexMapDocument): MapModel {
    const yaml = doc.toString();
    const mesh = HexMapLoader.load(yaml);
    const model = new MapModel(doc, mesh);
    model._yaml = yaml;
    return model;
  }

  toYAML(): string {
    return this._yaml;
  }

  get metadata(): HexMapMetadata {
    return this._metadata;
  }

  get grid(): GridConfig {
    return this._grid;
  }

  terrainDefs(geometry: GeometryType): Map<string, TerrainDef> {
    return this._terrainDefs.get(geometry) ?? new Map();
  }

  get features(): readonly FeatureItem[] {
    return this._features;
  }

  get mesh(): HexMesh {
    return this._mesh;
  }

  computedHex(hexId: string): ComputedHexState | undefined {
    const hex = this._mesh.getHex(hexId);
    if (!hex) return undefined;

    const terrain = hex.terrain ?? 'unknown';
    const neighbors = this._mesh.getNeighbors(hexId);
    const neighborLabels = neighbors
      .map((h) =>
        h
          ? Hex.formatHexLabel(
              Hex.hexFromId(h.id),
              this._grid.labelFormat,
              this._grid.orientation,
              this._grid.firstCol,
              this._grid.firstRow
            )
          : null
      )
      .filter((l): l is string => l !== null);

    return {
      hexId,
      label: Hex.formatHexLabel(
        Hex.hexFromId(hexId),
        this._grid.labelFormat,
        this._grid.orientation,
        this._grid.firstCol,
        this._grid.firstRow
      ),
      terrain,
      terrainColor: this.terrainColor('hex', terrain),
      elevation: hex.elevation,
      contributingFeatures: this.featuresAtHex(hexId),
      neighborLabels,
    };
  }

  featuresAtHex(hexId: string): FeatureItem[] {
    return this._hexToFeatures.get(hexId) ?? [];
  }

  featuresAtEdge(edgeId: string): FeatureItem[] {
    return this._edgeToFeatures.get(edgeId) ?? [];
  }

  featuresAtVertex(vertexId: string): FeatureItem[] {
    return this._vertexToFeatures.get(vertexId) ?? [];
  }

  terrainColor(geometry: GeometryType, terrainString: string): string {
    if (!terrainString) return '#555555'; // neutral fallback — no terrain assigned
    const parts = terrainString.split(/\s+/);
    const terrain = parts[parts.length - 1];

    const def = this._terrainDefs.get(geometry)?.get(terrain);
    if (def) return def.color;

    if (terrain === 'unknown') return '#888888';

    // Hash fallback
    let hash = 0;
    for (let i = 0; i < terrain.length; i++) {
      hash = terrain.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return `hsl(${h}, 40%, 60%)`;
  }
}
