import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HexMapDocument } from '@hexmap/core';
import { describe, expect, it } from 'vitest';
import { MapModel } from './model.js';
import { buildScene } from './scene.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MOCK_YAML = `
hexmap: "1.0"
metadata:
  title: "Test Map"
layout:
  orientation: flat-down
  label: XXYY
  all: "0101 0201"
terrain:
  hex:
    clear:
      style: { color: "#ffffff" }
    forest:
      style: { color: "#00ff00" }
features:
  - at: "@all"
    terrain: clear
  - at: "0201"
    terrain: forest
    label: "Target"
`;

const MULTI_GEOM_YAML = `
hexmap: "1.0"
layout:
  orientation: flat-down
  all: "0101 - 0301 - 0303 - 0103 fill"
terrain:
  hex:
    clear:
      style: { color: "#ffffff" }
    forest:
      style: { color: "#00ff00" }
    road:
      style: { color: "#996633" }
      properties: { path: true }
  edge:
    river:
      style: { color: "#0044cc" }
    cliff:
      onesided: true
      style: { color: "#663300" }
  vertex:
    bridge:
      style: { color: "#888888" }
features:
  - at: "@all"
    terrain: clear
`;

const EDGE_FEATURE_YAML = `
hexmap: "1.0"
layout:
  orientation: flat-down
  all: "0101 - 0301 - 0303 - 0103 fill"
terrain:
  hex:
    clear:
      style: { color: "#ffffff" }
  edge:
    river:
      style: { color: "#0044cc" }
  vertex:
    bridge:
      style: { color: "#888888" }
features:
  - at: "@all"
    terrain: clear
  - at: "0201/N 0201/NE"
    terrain: river
  - at: "0202.N"
    terrain: bridge
`;

const RENDER_YAML = `
hexmap: "1.0"
layout:
  orientation: flat-down
  all: "0101 - 0301 - 0303 - 0103 fill"
terrain:
  hex:
    clear:
      style: { color: "#ffffff" }
    road:
      style: { color: "#996633" }
      properties: { path: true }
  edge:
    river:
      style: { color: "#0044cc" }
  vertex:
    bridge:
      style: { color: "#888888" }
features:
  - at: "@all"
    terrain: clear
  - at: "0201/N 0201/NE"
    terrain: river
  - at: "0202.N"
    terrain: bridge
  - at: "0101 - 0201"
    terrain: road
`;

describe('MapModel', () => {
  it('should load metadata', () => {
    const model = MapModel.load(MOCK_YAML);
    expect(model.metadata.title).toBe('Test Map');
  });

  it('should build mesh with correct terrain', () => {
    const model = MapModel.load(MOCK_YAML);
    const { mesh } = model;

    // 0201 is forest
    const id0201 = '2,0,-2';
    expect(mesh.getHex(id0201)?.terrain).toBe('clear forest');

    // 0101 is clear
    const id0101 = '1,1,-2';
    expect(mesh.getHex(id0101)?.terrain).toBe('clear');
  });

  it('should return terrain colors', () => {
    const model = MapModel.load(MOCK_YAML);
    expect(model.terrainColor('hex', 'clear')).toBe('#ffffff');
    expect(model.terrainColor('hex', 'clear forest')).toBe('#00ff00');
  });

  // S2: empty terrain string must return a visible fallback, not transparent
  it('terrainColor for empty string returns a visible fallback color', () => {
    const model = MapModel.load(MOCK_YAML);
    const color = model.terrainColor('hex', '');
    expect(color).not.toBe('transparent');
    expect(color).not.toBe('rgba(0,0,0,0)');
  });

  it('should process features list', () => {
    const model = MapModel.load(MOCK_YAML);
    expect(model.features).toHaveLength(2);
    expect(model.features[1].label).toBe('Target');
  });

  it('should return computed hex state with features', () => {
    const model = MapModel.load(MOCK_YAML);
    const id0201 = '2,0,-2';
    const state = model.computedHex(id0201);
    expect(state).toBeDefined();
    expect(state?.label).toBe('0201');
    expect(state?.terrain).toBe('clear forest');
    expect(state?.contributingFeatures).toHaveLength(2);
  });

  it('should support reverse feature mapping', () => {
    const model = MapModel.load(MOCK_YAML);
    const { hexIds } = model.features[1];
    expect(hexIds).toContain('2,0,-2');

    const features = model.featuresAtHex('2,0,-2');
    expect(features).toHaveLength(2);
    expect(features[1].label).toBe('Target');
  });

  describe('bfm.yaml RFC compliance', () => {
    const yaml = readFileSync(resolve(__dirname, '../../maps/definitions/bfm.yaml'), 'utf-8');

    it('loads without error', () => {
      expect(() => MapModel.load(yaml)).not.toThrow();
    });

    it('has no features with at="complex"', () => {
      const model = MapModel.load(yaml);
      const complex = model.features.filter((f) => f.at === 'complex');
      expect(complex).toHaveLength(0);
    });

    it('resolves railroad features to hex IDs', () => {
      const model = MapModel.load(yaml);
      const rail = model.features.find((f) => f.label === 'Northern Rail');
      expect(rail).toBeDefined();
      expect(rail?.hexIds.length).toBeGreaterThan(0);
    });

    it('uses flat-up orientation', () => {
      const model = MapModel.load(yaml);
      expect(model.grid.orientation).toBe('flat-up');
    });
  });

  it('MapModel.fromDocument rebuilds model from a HexMapDocument', () => {
    const doc = new HexMapDocument(MOCK_YAML);
    const model = MapModel.fromDocument(doc);
    expect(model.metadata.title).toBe('Test Map');
    expect(model.features).toHaveLength(2);
    expect(model.features[1].label).toBe('Target');
  });

  it('MapModel.fromDocument reflects document mutations', () => {
    const doc = new HexMapDocument(MOCK_YAML);
    doc.addFeature({ at: '0101', terrain: 'forest', label: 'New' });
    const model = MapModel.fromDocument(doc);
    expect(model.features).toHaveLength(3);
    expect(model.features[2].label).toBe('New');
  });

  describe('geometry-scoped terrain', () => {
    it('loads hex terrain definitions', () => {
      const model = MapModel.load(MULTI_GEOM_YAML);
      expect(model.terrainDefs('hex').get('clear')).toBeDefined();
      expect(model.terrainDefs('hex').get('forest')).toBeDefined();
      expect(model.terrainDefs('hex').get('road')).toBeDefined();
    });

    it('loads edge terrain definitions', () => {
      const model = MapModel.load(MULTI_GEOM_YAML);
      expect(model.terrainDefs('edge').get('river')).toBeDefined();
      expect(model.terrainDefs('edge').get('cliff')).toBeDefined();
    });

    it('loads vertex terrain definitions', () => {
      const model = MapModel.load(MULTI_GEOM_YAML);
      expect(model.terrainDefs('vertex').get('bridge')).toBeDefined();
    });

    it('terrainColor resolves with geometry scope', () => {
      const model = MapModel.load(MULTI_GEOM_YAML);
      expect(model.terrainColor('hex', 'clear')).toBe('#ffffff');
      expect(model.terrainColor('edge', 'river')).toBe('#0044cc');
      expect(model.terrainColor('vertex', 'bridge')).toBe('#888888');
    });

    it('terrainColor falls back for unknown terrain', () => {
      const model = MapModel.load(MULTI_GEOM_YAML);
      const color = model.terrainColor('hex', 'unknown_terrain');
      expect(color).toMatch(/^(#|hsl)/);
    });

    it('preserves onesided property on terrain def', () => {
      const model = MapModel.load(MULTI_GEOM_YAML);
      expect(model.terrainDefs('edge').get('cliff')?.onesided).toBe(true);
    });

    it('preserves path property in properties', () => {
      const model = MapModel.load(MULTI_GEOM_YAML);
      expect(model.terrainDefs('hex').get('road')?.properties?.path).toBe(true);
    });
  });

  describe('edge/vertex feature resolution', () => {
    it('resolves edge features with edgeIds', () => {
      const model = MapModel.load(EDGE_FEATURE_YAML);
      const riverFeature = model.features.find((f) => f.terrain === 'river');
      expect(riverFeature).toBeDefined();
      expect(riverFeature?.geometryType).toBe('edge');
      expect(riverFeature?.edgeIds.length).toBe(2);
    });

    it('resolves vertex features with vertexIds', () => {
      const model = MapModel.load(EDGE_FEATURE_YAML);
      const bridgeFeature = model.features.find((f) => f.terrain === 'bridge');
      expect(bridgeFeature).toBeDefined();
      expect(bridgeFeature?.geometryType).toBe('vertex');
      expect(bridgeFeature?.vertexIds.length).toBe(1);
    });

    it('hex features have geometryType hex', () => {
      const model = MapModel.load(EDGE_FEATURE_YAML);
      const clearFeature = model.features[0];
      expect(clearFeature.geometryType).toBe('hex');
      expect(clearFeature.hexIds.length).toBeGreaterThan(0);
    });

    it('populates edge reverse index', () => {
      const model = MapModel.load(EDGE_FEATURE_YAML);
      const riverFeature = model.features.find((f) => f.terrain === 'river');
      const firstEdgeId = riverFeature?.edgeIds[0];
      const features = model.featuresAtEdge(firstEdgeId);
      expect(features.length).toBe(1);
      expect(features[0].terrain).toBe('river');
    });

    it('populates vertex reverse index', () => {
      const model = MapModel.load(EDGE_FEATURE_YAML);
      const bridgeFeature = model.features.find((f) => f.terrain === 'bridge');
      const firstVertexId = bridgeFeature?.vertexIds[0];
      const features = model.featuresAtVertex(firstVertexId);
      expect(features.length).toBe(1);
      expect(features[0].terrain).toBe('bridge');
    });
  });

  describe('buildScene with multi-geometry terrain', () => {
    const viewport = { center: { x: 0, y: 0 }, zoom: 40, width: 800, height: 600 };

    it('produces edgeTerrain items for edge features', () => {
      const model = MapModel.load(RENDER_YAML);
      const scene = buildScene(model, viewport);
      expect(scene.edgeTerrain.length).toBe(2); // 2 edge segments
    });

    it('produces vertexTerrain items for vertex features', () => {
      const model = MapModel.load(RENDER_YAML);
      const scene = buildScene(model, viewport);
      expect(scene.vertexTerrain.length).toBe(1);
    });

    it('produces pathTerrain items for hex terrain with path: true', () => {
      const model = MapModel.load(RENDER_YAML);
      const scene = buildScene(model, viewport);
      expect(scene.pathTerrain.length).toBeGreaterThan(0);
    });

    it('edge terrain items have p1, p2, color', () => {
      const model = MapModel.load(RENDER_YAML);
      const scene = buildScene(model, viewport);
      const edge = scene.edgeTerrain[0];
      expect(edge.p1).toBeDefined();
      expect(edge.p2).toBeDefined();
      expect(edge.color).toBe('#0044cc');
    });

    it('vertex terrain items have point, color', () => {
      const model = MapModel.load(RENDER_YAML);
      const scene = buildScene(model, viewport);
      const vtx = scene.vertexTerrain[0];
      expect(vtx.point).toBeDefined();
      expect(vtx.color).toBe('#888888');
    });
  });

  describe('Multi-geometry integration', () => {
    it('verifies full round-trip: YAML -> model -> scene', () => {
      const yaml = `
hexmap: "1.0"
layout:
  orientation: flat-down
  all: "0101 - 0303 fill"
terrain:
  hex:
    clear: { style: { color: "#fff" } }
    road: { style: { color: "#963" }, properties: { path: true } }
  edge:
    river: { style: { color: "#04c" } }
  vertex:
    bridge: { style: { color: "#888" } }
features:
  - at: "@all"
    terrain: clear
  - at: "0101 - 0201"
    terrain: road
  - at: "0101/NE 0201/NE"
    terrain: river
  - at: "0101.1"
    terrain: bridge
`;
      const model = MapModel.load(yaml);
      const viewport = { center: { x: 0, y: 0 }, zoom: 40, width: 800, height: 600 };
      const scene = buildScene(model, viewport);

      // Verify Model loaded everything
      expect(model.terrainDefs('hex').has('road')).toBe(true);
      expect(model.terrainDefs('edge').has('river')).toBe(true);
      expect(model.terrainDefs('vertex').has('bridge')).toBe(true);

      expect(model.features).toHaveLength(4);
      expect(model.features[1].geometryType).toBe('hex');
      expect(model.features[2].geometryType).toBe('edge');
      expect(model.features[3].geometryType).toBe('vertex');

      // Verify Scene has items for all three
      expect(scene.hexagons.length).toBeGreaterThan(0);
      expect(scene.pathTerrain).toHaveLength(1);
      expect(scene.edgeTerrain.length).toBe(2);
      expect(scene.vertexTerrain).toHaveLength(1);

      // Verify colors
      expect(scene.pathTerrain[0].color).toBe('#963');
      expect(scene.edgeTerrain[0].color).toBe('#04c');
      expect(scene.vertexTerrain[0].color).toBe('#888');
    });
  });
});
