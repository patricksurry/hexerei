import { expect, test } from 'vitest';
import { CommandHistory } from './history.js';
import type { MapState, MapCommand } from './command.js';

test('CommandHistory manages undo/redo stack', () => {
    const state: MapState = { document: {} as any, model: {} as any };
    const history = new CommandHistory(state);
    
    expect(history.canUndo).toBe(false);
    expect(history.isDirty).toBe(false);
    
    const cmd: MapCommand = { type: 'deleteFeature', index: 0 };
    history.execute(cmd);
    
    expect(history.canUndo).toBe(true);
    expect(history.isDirty).toBe(true);
});
