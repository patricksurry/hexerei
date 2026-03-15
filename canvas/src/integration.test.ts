import { describe, it, expect } from 'vitest';
import { CommandHistory } from './history.js';
import { MapModel } from './model.js';
import { HexMapDocument } from '@hexmap/core';
import type { MapCommand } from './command.js';

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
`;

describe('Authoring loop integration', () => {
  it('create → edit → undo → redo → delete roundtrip', () => {
    const doc = new HexMapDocument(MOCK_YAML);
    const model = MapModel.fromDocument(doc);
    const history = new CommandHistory({ document: doc, model });

    // 1. Create a feature
    history.execute({ type: 'addFeature', feature: { at: '0201', terrain: 'forest' } });
    expect(history.currentState.model.features).toHaveLength(2);
    expect(history.isDirty).toBe(true);

    // 2. Edit the feature
    history.execute({ type: 'updateFeature', index: 1, changes: { label: 'Enchanted Forest' } });
    expect(history.currentState.model.features[1].label).toBe('Enchanted Forest');

    // 3. Undo the edit
    history.undo();
    expect(history.currentState.model.features[1].label).toBeUndefined();

    // 4. Undo the create
    history.undo();
    expect(history.currentState.model.features).toHaveLength(1);

    // 5. Redo the create
    history.redo();
    expect(history.currentState.model.features).toHaveLength(2);

    // 6. Redo the edit
    history.redo();
    expect(history.currentState.model.features[1].label).toBe('Enchanted Forest');

    // 7. Delete the feature
    history.execute({ type: 'deleteFeature', index: 1 });
    expect(history.currentState.model.features).toHaveLength(1);

    // 8. Undo delete restores it
    history.undo();
    expect(history.currentState.model.features).toHaveLength(2);
    expect(history.currentState.model.features[1].label).toBe('Enchanted Forest');

    // 9. YAML round-trip preserves state
    const yaml = history.currentState.document.toString();
    const reparsed = MapModel.load(yaml);
    expect(reparsed.features).toHaveLength(2);
    expect(reparsed.features[1].label).toBe('Enchanted Forest');
  });

  it('setMetadata + undo roundtrip', () => {
    const doc = new HexMapDocument(MOCK_YAML);
    const model = MapModel.fromDocument(doc);
    const history = new CommandHistory({ document: doc, model });

    history.execute({ type: 'setMetadata', key: 'title', value: 'My Map' });
    expect(history.currentState.model.metadata.title).toBe('My Map');

    history.undo();
    expect(history.currentState.model.metadata.title).toBeUndefined();
  });
});
