import { Hex, HexMapDocument, HexMesh, HexMapLoader, HexArea } from '@hexmap/core';
import { FeatureItem } from '../types';

export interface GridConfig {
  hexTop: 'flat' | 'pointy';
  columns: number;
  rows: number;
  stagger: Hex.Stagger;
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
  private _metadata: Record<string, any>;
  private _grid: GridConfig;
  private _terrainDefs: Map<string, TerrainDef>;
  private _features: FeatureItem[];
  private _mesh: HexMesh;

  constructor(doc: any) {
    this._metadata = doc.metadata ?? {};
    const layout = doc.layout ?? doc.grid ?? {};
    
    let stagger = Hex.Stagger.Odd;
    if (layout.stagger === 'high') {
      stagger = Hex.Stagger.Even;
    }
    
    this._grid = {
      hexTop: layout.hex_top === 'pointy' ? 'pointy' : 'flat',
      columns: layout.columns ?? 0,
      rows: layout.rows ?? 0,
      stagger: stagger,
      firstCol: layout.coordinates?.first?.[0] ?? 1,
      firstRow: layout.coordinates?.first?.[1] ?? 1,
      labelFormat: layout.coordinates?.label ?? 'CCRR'
    };

    // Terrain definitions
    this._terrainDefs = new Map();
    const hexTerrain = doc.terrain?.hex ?? {};
    for (const [key, def] of Object.entries(hexTerrain)) {
      const terrainDef = def as any;
      this._terrainDefs.set(key, {
        key,
        name: terrainDef.name ?? key,
        color: terrainDef.style?.color ?? '#888888',
        properties: terrainDef.properties
      });
    }

    // Use HexMapLoader to build the mesh
    // Note: We need to pass the raw source or re-serialize doc if we want to use Loader.load
    // For now, let's assume we might need a Loader.fromJS(obj) or just use the logic
    // actually, MapModel.load(source) uses HexMapLoader.load(source) now.
    this._mesh = HexMapLoader.load(JSON.stringify(doc)); // Hacky, but ensures consistency

    // Features for UI/Inspector
    this._features = (doc.features || []).map((f: any, idx: number) => ({
        index: idx,
        terrain: f.terrain,
        label: f.label,
        id: f.id,
        tags: f.tags ? f.tags.split(/\s+/) : [],
        at: typeof f.at === 'string' ? f.at : 'complex',
        isBase: false,
        hexIds: [], // We could populate this using HexPath if needed
        raw: f
    }));
  }

  static load(yamlSource: string): MapModel {
    const mesh = HexMapLoader.load(yamlSource);
    const doc = new HexMapDocument(yamlSource).toJS();
    const model = new MapModel(doc);
    model._mesh = mesh; // Use the properly loaded mesh
    return model;
  }

  get metadata(): Record<string, any> { return this._metadata; }
  get grid(): GridConfig { return this._grid; }
  get terrainDefs(): Map<string, TerrainDef> { return this._terrainDefs; }
  get features(): FeatureItem[] { return this._features; }
  get mesh(): HexMesh { return this._mesh; }

  computedHex(hexId: string): ComputedHexState | undefined {
    const hex = this._mesh.getHex(hexId);
    if (!hex) return undefined;

    const terrain = hex.terrain ?? 'unknown';
    const neighbors = this._mesh.getNeighbors(hexId);
    const neighborLabels = neighbors
      .map(h => h ? this.hexIdToLabel(h.id) : null)
      .filter((l): l is string => l !== null);

    return {
      hexId,
      label: this.hexIdToLabel(hexId),
      terrain,
      terrainColor: this.terrainColor(terrain),
      elevation: hex.elevation,
      contributingFeatures: [], // TODO: Restore feature mapping
      neighborLabels
    };
  }

  hexIdToLabel(id: string): string {
    const cube = Hex.hexFromId(id);
    const offset = Hex.cubeToOffset(cube, this._grid.stagger);
    
    if (this._grid.labelFormat === 'CCRR') {
      const col = offset.x + this._grid.firstCol;
      const row = offset.y + this._grid.firstRow;
      return `${col.toString().padStart(2, '0')}${row.toString().padStart(2, '0')}`;
    }
    return id;
  }

  terrainColor(terrainString: string): string {
    if (!terrainString) return '#555555';
    // Get the last terrain type if it's a layered string
    const parts = terrainString.split(/\s+/);
    const terrain = parts[parts.length - 1];

    const def = this._terrainDefs.get(terrain);
    if (def) return def.color;
    
    if (terrain === 'unknown') return '#555555';
    
    // Hash fallback
    let hash = 0;
    for (let i = 0; i < terrain.length; i++) {
      hash = terrain.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return `hsl(${h}, 40%, 60%)`;
  }
}
