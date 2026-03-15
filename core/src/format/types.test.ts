import { expect, test } from 'vitest';
import type {
  HexMapLayout,
  HexMapMetadata,
  GeoReference,
  TerrainTypeDef,
  TerrainStyle,
  TerrainVocabulary,
  Feature,
} from './types.js';

test('Envelope types are correctly exported', () => {
  const layout: HexMapLayout = { orientation: 'flat-down', all: 'base' };
  const meta: HexMapMetadata = { title: 'Test Map' };
  const geo: GeoReference = { scale: 1000 };

  expect(layout.all).toBe('base');
  expect(meta.title).toBe('Test Map');
  expect(geo.scale).toBe(1000);
});

test('Terrain and Feature types are correctly exported', () => {
  const style: TerrainStyle = { color: '#ff0000' };
  const terrain: TerrainTypeDef = { name: 'Mountain', style };
  const vocab: TerrainVocabulary = { hex: { M: terrain } };
  const feature: Feature = { at: '0101', terrain: 'M' };

  expect(vocab.hex?.M.name).toBe('Mountain');
  expect(feature.at).toBe('0101');
});
