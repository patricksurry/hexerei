import { describe, it, expect } from 'vitest';
import { CommandHistory } from './history.js';
import { MapModel } from './model.js';
import { HexMapDocument } from '@hexmap/core';
import type { MapState, MapCommand } from './command.js';

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

describe('CommandHistory', () => {
  it('starts with no undo/redo and not dirty', () => {
    const history = new CommandHistory(makeState());
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
    expect(history.isDirty).toBe(false);
  });

  it('execute makes canUndo true and isDirty true', () => {
    const history = new CommandHistory(makeState());
    history.execute({ type: 'addFeature', feature: { at: '0101', terrain: 'forest' } });
    expect(history.canUndo).toBe(true);
    expect(history.isDirty).toBe(true);
    expect(history.currentState.model.features).toHaveLength(3);
  });

  it('undo restores previous state', () => {
    const history = new CommandHistory(makeState());
    history.execute({ type: 'addFeature', feature: { at: '0101', terrain: 'forest' } });
    const undoneState = history.undo();
    expect(undoneState).not.toBeNull();
    expect(undoneState!.model.features).toHaveLength(2);
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(true);
  });

  it('redo re-applies undone command', () => {
    const history = new CommandHistory(makeState());
    history.execute({ type: 'addFeature', feature: { at: '0101', terrain: 'forest' } });
    history.undo();
    const redoneState = history.redo();
    expect(redoneState).not.toBeNull();
    expect(redoneState!.model.features).toHaveLength(3);
    expect(history.canRedo).toBe(false);
  });

  it('execute after undo clears redo stack', () => {
    const history = new CommandHistory(makeState());
    history.execute({ type: 'addFeature', feature: { at: '0101', terrain: 'forest' } });
    history.undo();
    history.execute({ type: 'addFeature', feature: { at: '0201', terrain: 'clear', label: 'Other' } });
    expect(history.canRedo).toBe(false);
  });

  it('markSaved resets isDirty', () => {
    const history = new CommandHistory(makeState());
    history.execute({ type: 'addFeature', feature: { at: '0101', terrain: 'forest' } });
    expect(history.isDirty).toBe(true);
    history.markSaved();
    expect(history.isDirty).toBe(false);
  });

  it('undo past saved point makes isDirty true again', () => {
    const history = new CommandHistory(makeState());
    history.execute({ type: 'addFeature', feature: { at: '0101', terrain: 'forest' } });
    history.markSaved();
    history.undo();
    expect(history.isDirty).toBe(true);
  });

  it('undo returns null when nothing to undo', () => {
    const history = new CommandHistory(makeState());
    expect(history.undo()).toBeNull();
  });

  it('redo returns null when nothing to redo', () => {
    const history = new CommandHistory(makeState());
    expect(history.redo()).toBeNull();
  });
});
