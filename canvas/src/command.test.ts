import { describe, it, expect } from 'vitest';
import { HexMapDocument } from '@hexmap/core';
import { executeCommand, MapCommand, MapState } from './command.js';
import { MapModel } from './model.js';

const MOCK_YAML = `
hexmap: "1.0"
layout:
  orientation: flat-down
  all: "0101 0201"
terrain:
  hex:
    clear: { style: { color: "#ffffff" } }
    forest: { style: { color: "#00ff00" } }
features:
  - at: "@all"
    terrain: clear
  - at: "0201"
    terrain: forest
    label: "Target"
`;

function makeState(): MapState {
  const doc = new HexMapDocument(MOCK_YAML);
  const model = MapModel.fromDocument(doc);
  return { document: doc, model };
}

describe('executeCommand', () => {
  it('addFeature appends feature and inverse is deleteFeature', () => {
    const state = makeState();
    const cmd: MapCommand = {
      type: 'addFeature',
      feature: { at: '0101', terrain: 'forest', label: 'New' },
    };
    const result = executeCommand(cmd, state);
    expect(result.state.model.features).toHaveLength(3);
    expect(result.state.model.features[2].label).toBe('New');
    expect(result.inverse.type).toBe('deleteFeature');
  });

  it('deleteFeature removes feature and inverse is addFeature', () => {
    const state = makeState();
    const cmd: MapCommand = { type: 'deleteFeature', index: 1 };
    const result = executeCommand(cmd, state);
    expect(result.state.model.features).toHaveLength(1);
    expect(result.inverse.type).toBe('addFeature');
    if (result.inverse.type === 'addFeature') {
      expect(result.inverse.feature.label).toBe('Target');
    }
  });

  it('updateFeature modifies fields and inverse restores them', () => {
    const state = makeState();
    const cmd: MapCommand = { type: 'updateFeature', index: 1, changes: { label: 'Dark Forest' } };
    const result = executeCommand(cmd, state);
    expect(result.state.model.features[1].label).toBe('Dark Forest');
    expect(result.inverse.type).toBe('updateFeature');
    if (result.inverse.type === 'updateFeature') {
      expect(result.inverse.changes.label).toBe('Target');
    }
  });

  it('reorderFeature moves feature backward and inverse restores order', () => {
    const state = makeState();
    const cmd: MapCommand = { type: 'reorderFeature', fromIndex: 1, toIndex: 0 };
    const result = executeCommand(cmd, state);
    expect(result.state.model.features[0].terrain).toBe('forest');
    expect(result.inverse.type).toBe('reorderFeature');
    if (result.inverse.type === 'reorderFeature') {
      expect(result.inverse.fromIndex).toBe(0);
      expect(result.inverse.toIndex).toBe(1);
    }
  });

  it('reorderFeature forward + inverse roundtrips correctly', () => {
    // Add a third feature first
    const state = makeState();
    const addResult = executeCommand(
      { type: 'addFeature', feature: { at: '0101', terrain: 'clear', label: 'Third' } },
      state
    );
    // Move feature 0 (@all) to position 2
    const reorderResult = executeCommand(
      { type: 'reorderFeature', fromIndex: 0, toIndex: 2 },
      addResult.state
    );
    expect(reorderResult.state.model.features[0].terrain).toBe('forest');
    expect(reorderResult.state.model.features[2].at).toBe('@all');
    // Apply inverse to restore
    const restored = executeCommand(reorderResult.inverse, reorderResult.state);
    expect(restored.state.model.features[0].at).toBe('@all');
    expect(restored.state.model.features[1].terrain).toBe('forest');
    expect(restored.state.model.features[2].label).toBe('Third');
  });

  it('setMetadata updates field and inverse restores it', () => {
    const state = makeState();
    const cmd: MapCommand = { type: 'setMetadata', key: 'title', value: 'New Title' };
    const result = executeCommand(cmd, state);
    expect(result.state.model.metadata.title).toBe('New Title');
    expect(result.inverse.type).toBe('setMetadata');
  });

  it('setLayout updates layout field', () => {
    const state = makeState();
    const result = executeCommand({ type: 'setLayout', key: 'label', value: 'CCRR' }, state);
    expect(result.state.document.getLayout().label).toBe('CCRR');
    expect(result.inverse.type).toBe('setLayout');
  });

  it('setTerrainType adds terrain definition', () => {
    const state = makeState();
    const result = executeCommand(
      {
        type: 'setTerrainType',
        geometry: 'hex',
        key: 'swamp',
        def: { style: { color: '#336633' } },
      },
      state
    );
    expect(result.state.document.getTerrain().hex!.swamp).toBeDefined();
    expect(result.inverse.type).toBe('deleteTerrainType');
  });

  it('deleteTerrainType removes terrain definition', () => {
    const state = makeState();
    const result = executeCommand(
      {
        type: 'deleteTerrainType',
        geometry: 'hex',
        key: 'forest',
      },
      state
    );
    expect(result.state.document.getTerrain().hex!.forest).toBeUndefined();
    expect(result.inverse.type).toBe('setTerrainType');
  });

  it('state is not mutated — original state unchanged', () => {
    const state = makeState();
    const originalFeatureCount = state.model.features.length;
    executeCommand({ type: 'addFeature', feature: { at: '0101' } }, state);
    expect(state.model.features.length).toBe(originalFeatureCount);
  });
});
