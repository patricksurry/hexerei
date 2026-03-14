import { Hex, HexMapDocument, HexMesh, HexMapLoader, HexPath, HexMapMetadata, HexMapLayout } from '@hexmap/core';
import { FeatureItem } from './types.js';

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
  properties?: Record<string, any>;
}

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
  private _terrainDefs: Map<string, TerrainDef>;
  private _features: FeatureItem[];
  private _mesh: HexMesh;
  private _hexToFeatures: Map<string, FeatureItem[]>;
  private _yaml: string = '';

  private constructor(doc: HexMapDocument, mesh: HexMesh) {
    this.document = doc;
    this._metadata = doc.getMetadata();
    const layout = doc.getLayout();
    
    const orientation = layout.orientation || 'flat-down';
    const firstCol = 1; // Assuming default for now
    const firstRow = 1; // Assuming default for now
    const labelFormat = layout.label || (layout as any).coordinates?.label || "XXYY";

    this._grid = {
      orientation,
      columns: (layout as any).columns ?? 0,
      rows: (layout as any).rows ?? 0,
      firstCol,
      firstRow,
      labelFormat
    };

    // Terrain definitions
    this._terrainDefs = new Map();
    const terrainNode = doc.raw.get('terrain') as any;
    const hexTerrain = terrainNode?.get?.('hex')?.toJSON?.() || terrainNode?.hex || {};
    for (const [key, def] of Object.entries(hexTerrain)) {
      const terrainDef = def as any;
      this._terrainDefs.set(key, {
        key,
        name: terrainDef.name ?? key,
        color: terrainDef.style?.color ?? '#888888',
        properties: terrainDef.properties
      });
    }

    // Use provided mesh or load it from doc
    this._mesh = mesh;

    // Resolve features and build reverse index
    const meshHexPath = new HexPath(this._mesh, { 
        labelFormat, 
        orientation, 
        firstCol, 
        firstRow
    });

    this._hexToFeatures = new Map<string, FeatureItem[]>();
    const featuresNode = doc.raw.get('features') as any;
    const featureList = featuresNode?.toJSON?.() || featuresNode || [];
    this._features = featureList.map((f: any, idx: number) => {
        let hexIds: string[] = [];
        if (f.at) {
            try {
                const result = meshHexPath.resolve(f.at);
                if (result.type === 'hex') {
                    hexIds = result.items;
                }
            } catch (e) {
                console.warn(`MapModel: Failed to resolve feature at index ${idx}`, e);
            }
        }

        const featureItem: FeatureItem = {
            index: idx,
            terrain: f.terrain,
            label: f.label,
            id: f.id,
            tags: Array.isArray(f.tags) ? f.tags : (f.tags ? f.tags.split(/\s+/) : []),
            at: typeof f.at === 'string' ? f.at : 'complex',
            isBase: f.at === '@all',
            hexIds,
            elevation: f.elevation,
            properties: f.properties,
            side: f.side
        };

        // Populate reverse index
        for (const hid of hexIds) {
            if (!this._hexToFeatures.has(hid)) {
                this._hexToFeatures.set(hid, []);
            }
            this._hexToFeatures.get(hid)!.push(featureItem);
        }

        return featureItem;
    });
  }

  static load(yamlSource: string): MapModel {
    const mesh = HexMapLoader.load(yamlSource);
    const doc = new HexMapDocument(yamlSource);
    const model = new MapModel(doc, mesh);
    model._yaml = yamlSource;
    return model;
  }

  toYAML(): string { return this._yaml; }

  get metadata(): HexMapMetadata { return this._metadata; }
  get grid(): GridConfig { return this._grid; }
  get terrainDefs(): Map<string, TerrainDef> { return this._terrainDefs; }
  get features(): readonly FeatureItem[] { return this._features; }
  get mesh(): HexMesh { return this._mesh; }

  computedHex(hexId: string): ComputedHexState | undefined {
    const hex = this._mesh.getHex(hexId);
    if (!hex) return undefined;

    const terrain = hex.terrain ?? 'unknown';
    const neighbors = this._mesh.getNeighbors(hexId);
    const neighborLabels = neighbors
      .map(h => h ? Hex.formatHexLabel(Hex.hexFromId(h.id), this._grid.labelFormat, this._grid.orientation, this._grid.firstCol, this._grid.firstRow) : null)
      .filter((l): l is string => l !== null);

    return {
      hexId,
      label: Hex.formatHexLabel(Hex.hexFromId(hexId), this._grid.labelFormat, this._grid.orientation, this._grid.firstCol, this._grid.firstRow),
      terrain,
      terrainColor: this.terrainColor(terrain),
      elevation: hex.elevation,
      contributingFeatures: this.featuresAtHex(hexId),
      neighborLabels
    };
  }

  

  hexIdsForFeature(index: number): string[] {
    return this._features[index]?.hexIds ?? [];
  }

  featuresAtHex(hexId: string): FeatureItem[] {
    return this._hexToFeatures.get(hexId) ?? [];
  }

  terrainColor(terrainString: string): string {
    if (!terrainString) return '#555555'; // neutral fallback — no terrain assigned
    const parts = terrainString.split(/\s+/);
    const terrain = parts[parts.length - 1];

    const def = this._terrainDefs.get(terrain);
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
